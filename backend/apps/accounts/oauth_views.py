"""OAuth 2.0 (Authorization Code) — connexion sociale Google & Facebook.

Flux piloté par le backend :
  1. GET /api/v1/auth/<provider>/login/   → 302 vers l'écran d'autorisation du fournisseur.
  2. Le fournisseur renvoie sur /api/v1/auth/<provider>/callback/?code=...&state=...
  3. Le backend échange le code, récupère le profil, crée/connecte l'utilisateur, émet un
     JWT (simplejwt) et redirige vers le frontend : {FRONTEND_URL}/auth/social-callback#access=...&refresh=...

L'état (state) est signé (django.core.signing) → pas besoin de session (API stateless),
protège contre le CSRF, et transporte la destination de retour.
"""
from __future__ import annotations

import logging
import secrets
import urllib.parse

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.shortcuts import redirect
from django.utils import timezone
from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)
User = get_user_model()

PROVIDERS = {
    'google': {
        'auth_url': 'https://accounts.google.com/o/oauth2/v2/auth',
        'token_url': 'https://oauth2.googleapis.com/token',
        'token_method': 'post',
        'userinfo_url': 'https://www.googleapis.com/oauth2/v3/userinfo',
        'scope': 'openid email profile',
        'id_setting': 'GOOGLE_OAUTH_CLIENT_ID',
        'secret_setting': 'GOOGLE_OAUTH_CLIENT_SECRET',
    },
    'facebook': {
        'auth_url': 'https://www.facebook.com/v19.0/dialog/oauth',
        'token_url': 'https://graph.facebook.com/v19.0/oauth/access_token',
        'token_method': 'get',
        'userinfo_url': 'https://graph.facebook.com/me?fields=id,name,email,first_name,last_name',
        'scope': 'email public_profile',
        'id_setting': 'FACEBOOK_OAUTH_CLIENT_ID',
        'secret_setting': 'FACEBOOK_OAUTH_CLIENT_SECRET',
    },
}


def _callback_uri(provider: str) -> str:
    base = getattr(settings, 'OAUTH_CALLBACK_BASE_URL', '').rstrip('/')
    return f"{base}/auth/{provider}/callback/"


def _front(path: str) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}{path}"


def _unique_username(email: str) -> str:
    base = (email.split('@')[0] or 'user')[:24]
    candidate = base
    while User.objects.filter(username=candidate).exists():
        candidate = f"{base}-{secrets.token_hex(3)}"
    return candidate


def _get_or_create_user(email, first, last, name):
    email = (email or '').strip().lower()
    user = User.objects.filter(email__iexact=email).first()
    if user:
        # L'email est vérifié par le fournisseur → on le marque comme tel.
        if hasattr(user, 'email_verified') and not user.email_verified:
            user.email_verified = True
            user.save(update_fields=['email_verified'])
        return user, False
    user = User(username=_unique_username(email), email=email)
    user.first_name = (first or '')[:150]
    user.last_name = (last or '')[:150]
    if hasattr(user, 'display_name'):
        user.display_name = (name or f"{first} {last}".strip() or email.split('@')[0])[:120]
    if hasattr(user, 'email_verified'):
        user.email_verified = True
    # Inscription sociale = acceptation implicite (RGPD : consigné).
    if hasattr(user, 'terms_accepted'):
        user.terms_accepted = True
        user.terms_accepted_at = timezone.now()
    if hasattr(user, 'privacy_policy_accepted'):
        user.privacy_policy_accepted = True
        user.privacy_policy_accepted_at = timezone.now()
    user.set_unusable_password()
    user.save()
    return user, True


class OAuthLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, provider):
        cfg = PROVIDERS.get(provider)
        if not cfg:
            return redirect(_front('/auth?error=invalid_provider'))
        client_id = getattr(settings, cfg['id_setting'], '')
        if not client_id:
            return redirect(_front('/auth?error=oauth_not_configured'))
        redirect_to = request.GET.get('redirect_to', '/')
        state = signing.dumps({'p': provider, 'r': redirect_to, 'n': secrets.token_urlsafe(8)}, salt='oauth-state')
        params = {
            'client_id': client_id,
            'redirect_uri': _callback_uri(provider),
            'response_type': 'code',
            'scope': cfg['scope'],
            'state': state,
        }
        if provider == 'google':
            params['access_type'] = 'online'
            params['prompt'] = 'select_account'
        return redirect(f"{cfg['auth_url']}?{urllib.parse.urlencode(params)}")


class OAuthCallbackView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, provider):
        cfg = PROVIDERS.get(provider)
        if not cfg:
            return redirect(_front('/auth?error=invalid_provider'))
        if request.GET.get('error'):
            return redirect(_front(f"/auth?error={urllib.parse.quote(request.GET.get('error'))}"))

        code = request.GET.get('code')
        state = request.GET.get('state')
        try:
            data = signing.loads(state or '', salt='oauth-state', max_age=600)
            if data.get('p') != provider:
                raise ValueError('provider mismatch')
            redirect_to = data.get('r', '/')
        except Exception:
            return redirect(_front('/auth?error=invalid_state'))
        if not code:
            return redirect(_front('/auth?error=no_code'))

        client_id = getattr(settings, cfg['id_setting'], '')
        client_secret = getattr(settings, cfg['secret_setting'], '')

        # 1) Échange code → access_token
        token_params = {
            'code': code, 'client_id': client_id, 'client_secret': client_secret,
            'redirect_uri': _callback_uri(provider), 'grant_type': 'authorization_code',
        }
        try:
            if cfg['token_method'] == 'post':
                tr = requests.post(cfg['token_url'], data=token_params, headers={'Accept': 'application/json'}, timeout=15)
            else:
                tr = requests.get(cfg['token_url'], params=token_params, headers={'Accept': 'application/json'}, timeout=15)
            tr.raise_for_status()
            access_token = tr.json().get('access_token')
        except Exception as exc:  # noqa: BLE001
            logger.warning('OAuth %s token exchange failed: %s', provider, exc)
            return redirect(_front('/auth?error=token_exchange_failed'))
        if not access_token:
            return redirect(_front('/auth?error=no_access_token'))

        # 2) Récupération du profil
        try:
            if provider == 'google':
                ui = requests.get(cfg['userinfo_url'], headers={'Authorization': f'Bearer {access_token}'}, timeout=15).json()
                email, first, last, name = ui.get('email'), ui.get('given_name', ''), ui.get('family_name', ''), ui.get('name', '')
            else:
                ui = requests.get(cfg['userinfo_url'], params={'access_token': access_token}, timeout=15).json()
                email, first, last, name = ui.get('email'), ui.get('first_name', ''), ui.get('last_name', ''), ui.get('name', '')
        except Exception as exc:  # noqa: BLE001
            logger.warning('OAuth %s userinfo failed: %s', provider, exc)
            return redirect(_front('/auth?error=userinfo_failed'))
        if not email:
            return redirect(_front('/auth?error=no_email'))

        # 3) Utilisateur + JWT
        try:
            user, _created = _get_or_create_user(email, first, last, name)
        except Exception as exc:  # noqa: BLE001
            logger.exception('OAuth %s user creation failed: %s', provider, exc)
            return redirect(_front('/auth?error=account_error'))
        if not user.is_active:
            return redirect(_front('/auth?error=account_disabled'))

        refresh = RefreshToken.for_user(user)
        frag = urllib.parse.urlencode({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'redirect_to': redirect_to,
        })
        return redirect(f"{_front('/auth/social-callback')}#{frag}")
