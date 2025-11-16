"""
Utilitaires pour la gestion des sessions utilisateur.
"""
import requests
from datetime import timedelta
from django.utils import timezone
from user_agents import parse


def get_client_ip(request):
    """Récupère l'adresse IP du client."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_device_info(user_agent_string):
    """Parse le User-Agent pour extraire les informations de l'appareil."""
    user_agent = parse(user_agent_string)

    # Déterminer le type d'appareil
    if user_agent.is_mobile:
        device_type = 'mobile'
    elif user_agent.is_tablet:
        device_type = 'tablet'
    else:
        device_type = 'desktop'

    # Navigateur et version
    browser = f"{user_agent.browser.family} {user_agent.browser.version_string}"

    # Système d'exploitation
    os = f"{user_agent.os.family} {user_agent.os.version_string}"

    return {
        'device_type': device_type,
        'browser': browser,
        'os': os,
        'user_agent': user_agent_string
    }


def get_location_from_ip(ip_address):
    """
    Récupère la localisation géographique à partir d'une adresse IP.
    Utilise l'API gratuite ipapi.co (limite: 1000 requêtes/jour).
    """
    # IPs locales
    if ip_address in ['127.0.0.1', '::1', 'localhost'] or ip_address.startswith('192.168.') or ip_address.startswith('10.'):
        return 'Local Network'

    try:
        response = requests.get(
            f'https://ipapi.co/{ip_address}/json/',
            timeout=3  # 3 secondes de timeout
        )

        if response.status_code == 200:
            data = response.json()

            # Construire la localisation
            city = data.get('city', '')
            region = data.get('region', '')
            country = data.get('country_name', '')

            location_parts = [part for part in [city, region, country] if part]

            if location_parts:
                return ', '.join(location_parts)
            else:
                return f'Unknown ({ip_address})'
        else:
            return f'Unknown ({ip_address})'

    except requests.RequestException:
        # En cas d'erreur réseau, retourner IP seulement
        return f'Unknown ({ip_address})'


def create_user_session(user, request, expires_in_days=30):
    """
    Crée une nouvelle session pour l'utilisateur.

    Args:
        user: L'instance User
        request: L'objet HttpRequest
        expires_in_days: Durée de validité de la session en jours (défaut: 30)

    Returns:
        UserSession: L'instance de session créée
    """
    from .models import UserSession

    # Récupérer les informations
    ip_address = get_client_ip(request)
    user_agent_string = request.META.get('HTTP_USER_AGENT', '')
    device_info = get_device_info(user_agent_string)
    location = get_location_from_ip(ip_address)

    # Créer la session
    session = UserSession.objects.create(
        user=user,
        device_type=device_info['device_type'],
        browser=device_info['browser'],
        os=device_info['os'],
        user_agent=device_info['user_agent'],
        ip_address=ip_address,
        location=location,
        is_active=True,
        last_activity=timezone.now(),
        expires_at=timezone.now() + timedelta(days=expires_in_days)
    )

    return session


def update_session_activity(user, request):
    """
    Met à jour la dernière activité d'une session existante ou en crée une nouvelle.
    """
    from .models import UserSession

    ip_address = get_client_ip(request)

    # Chercher une session active existante pour cette IP
    session = UserSession.objects.filter(
        user=user,
        ip_address=ip_address,
        is_active=True,
        expires_at__gt=timezone.now()
    ).first()

    if session:
        # Mettre à jour l'activité
        session.last_activity = timezone.now()
        session.save(update_fields=['last_activity'])
        return session
    else:
        # Créer une nouvelle session
        return create_user_session(user, request)
