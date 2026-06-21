from __future__ import annotations

from random import randint, random

from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from django.db.models import Q, Sum, Avg
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.poi.models import TouristPoint
from apps.analytics.models import TouristPointAnalytics

from .models import (
    PartnerInvoice,
    PartnerApplication,
    PartnerBookingConfig,
    PartnerCommission,
    PartnerEndpointHealth,
    PartnerKYC,
    PartnerKYCDocument,
    PartnerNotification,
    PartnerPaymentMethod,
    PartnerProfile,
    PartnerWithdrawal,
)
from .serializers import (
    PartnerInvoiceSerializer,
    PartnerAnalyticsSerializer,
    PartnerApplicationSerializer,
    PartnerBookingConfigSerializer,
    PartnerBulkPOIStatusSerializer,
    PartnerCommissionSerializer,
    PartnerEndpointHealthSerializer,
    PartnerKYCSerializer,
    PartnerKYCDocumentSerializer,
    PartnerNotificationSerializer,
    PartnerPaymentMethodSerializer,
    PartnerProfileSerializer,
    PartnerWithdrawalSerializer,
)


def seed_tourist_point_from_profile(profile):
    """Crée (une fois) une fiche TouristPoint brouillon depuis le profil partenaire et la lie
    à `managed_pois`. Idempotent : ne fait rien si le partenaire possède déjà une fiche liée."""
    if profile.managed_pois.exists():
        return None
    flags = dict.fromkeys(('is_accommodation', 'is_restaurant', 'is_activity'), False)
    for flag in PartnerProfile.POI_FLAGS_BY_CATEGORY.get(profile.business_category, ()):
        flags[flag] = True
    city = profile.city
    tp = TouristPoint.objects.create(
        owner=profile.owner,
        name=profile.company_name or (profile.owner.get_full_name() or 'Mon établissement'),
        description=profile.description or '',
        address=profile.address or '',
        contact_phone=profile.contact_phone or '',
        contact_email=getattr(profile.owner, 'email', '') or '',
        website_url=profile.website or '',
        latitude=getattr(city, 'latitude', None),
        longitude=getattr(city, 'longitude', None),
        status=TouristPoint.Status.DRAFT,
        **flags,
    )
    profile.managed_pois.add(tp)
    return tp


class IsAdminOrOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):  # pragma: no cover - simple bool
        user = request.user
        if user.is_staff:
            return True
        if isinstance(obj, PartnerProfile):
            return obj.owner == user
        if isinstance(obj, PartnerNotification):
            return obj.partner == user
        if isinstance(obj, PartnerApplication):
            return obj.partner == user
        return False


class PartnerProfileViewSet(viewsets.ModelViewSet):
    queryset = PartnerProfile.objects.select_related('owner', 'owner__profile').prefetch_related('managed_pois')
    serializer_class = PartnerProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrOwner]

    def get_queryset(self):  # type: ignore[override]
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_staff:
            return qs.filter(owner=user)

        params = self.request.query_params
        status_filter = params.get('status')
        subscription_filter = params.get('subscription_type')
        search = params.get('search')

        if status_filter:
            qs = qs.filter(status=status_filter)

        if subscription_filter:
            qs = qs.filter(metadata__subscription_type=subscription_filter)

        if search:
            qs = qs.filter(
                Q(company_name__icontains=search)
                | Q(owner__email__icontains=search)
                | Q(owner__profile__first_name__icontains=search)
                | Q(owner__profile__last_name__icontains=search)
            )

        return qs

    def perform_create(self, serializer):  # type: ignore[override]
        # Idempotent : un partenaire a au plus UN profil (owner OneToOne). Évite le 500 IntegrityError
        # si l'assistant resoumet. Le profil est normalement déjà créé en 'draft' à l'inscription.
        existing = PartnerProfile.objects.filter(owner=self.request.user).first()
        if existing:
            serializer.instance = existing
            serializer.update(existing, serializer.validated_data)
            return
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Profil du partenaire connecté (créé à la volée en 'draft' s'il n'existe pas)."""
        profile, _ = PartnerProfile.objects.get_or_create(owner=request.user)
        return Response(self.get_serializer(profile).data)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Le partenaire soumet son profil pour revue : draft → pending.
        Exige les infos essentielles + un KYC soumis (documents fournis)."""
        profile = self.get_object()
        if profile.owner != request.user and not request.user.is_staff:
            raise PermissionDenied("Profil non autorisé.")
        missing = [f for f in ('company_name', 'business_category', 'city', 'contact_phone') if not getattr(profile, f)]
        if missing:
            return Response(
                {'detail': 'Profil incomplet.', 'missing': missing},
                status=status.HTTP_400_BAD_REQUEST,
            )
        kyc = getattr(profile, 'kyc', None)
        if not kyc or kyc.status == 'not_submitted' or not kyc.documents.exists():
            return Response(
                {'detail': "Le dossier KYC (informations légales + documents) doit être complété avant la soumission."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        profile.status = 'pending'
        profile.save(update_fields=['status', 'updated_at'])
        return Response({'status': profile.status})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def moderate(self, request, pk=None):
        profile = self.get_object()
        action = request.data.get('action')
        status_map = {'approve': 'approved', 'reject': 'rejected', 'suspend': 'suspended'}
        if action not in status_map:
            return Response({'detail': 'Action invalide'}, status=status.HTTP_400_BAD_REQUEST)
        # Gate KYC : impossible d'approuver tant que l'identité légale n'est pas vérifiée.
        if action == 'approve':
            kyc = getattr(profile, 'kyc', None)
            if not kyc or kyc.status != 'verified':
                return Response(
                    {'detail': "KYC non vérifié : vérifiez le dossier d'identité avant d'approuver."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        profile.status = status_map[action]
        fields = ['status', 'updated_at']
        # À l'approbation (ou à tout moment) l'admin peut fixer le taux de commission.
        rate = request.data.get('commission_rate')
        if rate not in (None, ''):
            from decimal import Decimal
            try:
                profile.commission_rate = Decimal(str(rate))
                fields.append('commission_rate')
            except Exception:  # noqa: BLE001
                pass
        profile.save(update_fields=fields)
        # À l'approbation : créer la fiche établissement réservable (brouillon) si absente.
        seeded = None
        if action == 'approve':
            seeded = seed_tourist_point_from_profile(profile)
        PartnerNotification.objects.create(
            partner=profile.owner,
            title=f'Statut partenaire mis à jour ({profile.status})',
            body=request.data.get('admin_message', ''),
            category='moderation',
        )
        return Response({
            'status': profile.status,
            'commission_rate': str(profile.commission_rate),
            'tourist_point_created': str(seeded.id) if seeded else None,
        })

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser], url_path='set-commission')
    def set_commission(self, request, pk=None):
        """Admin : fixe le taux de commission (%) du partenaire."""
        from decimal import Decimal
        profile = self.get_object()
        try:
            rate = Decimal(str(request.data.get('commission_rate')))
            if rate < 0 or rate > 100:
                raise ValueError
        except Exception:  # noqa: BLE001
            return Response({'detail': 'commission_rate invalide (0–100).'}, status=status.HTTP_400_BAD_REQUEST)
        profile.commission_rate = rate
        profile.save(update_fields=['commission_rate', 'updated_at'])
        return Response({'commission_rate': str(profile.commission_rate)})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def send_message(self, request, pk=None):
        profile = self.get_object()
        message = request.data.get('message')
        if not message:
            return Response({'detail': 'Message requis'}, status=status.HTTP_400_BAD_REQUEST)
        PartnerNotification.objects.create(
            partner=profile.owner,
            title='Message administrateur',
            body=message,
            category=request.data.get('type', 'general'),
        )
        return Response({'detail': 'Notification envoyée'})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def update_subscription(self, request, pk=None):
        profile = self.get_object()
        subscription_type = request.data.get('subscription_type')
        if not subscription_type:
            return Response({'detail': 'subscription_type requis'}, status=status.HTTP_400_BAD_REQUEST)
        profile.metadata = {**profile.metadata, 'subscription_type': subscription_type}
        profile.save(update_fields=['metadata', 'updated_at'])
        return Response({'subscription_type': subscription_type})


class PartnerApplicationViewSet(viewsets.ModelViewSet):
    queryset = PartnerApplication.objects.all()
    serializer_class = PartnerApplicationSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrOwner]

    def get_queryset(self):  # type: ignore[override]
        qs = PartnerApplication.objects.select_related('partner')
        user = self.request.user
        if user.is_staff:
            return qs
        return qs.filter(partner=user)

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(partner=self.request.user)


class PartnerNotificationViewSet(viewsets.ModelViewSet):
    queryset = PartnerNotification.objects.all()
    serializer_class = PartnerNotificationSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrOwner]

    def get_queryset(self):  # type: ignore[override]
        qs = PartnerNotification.objects.select_related('partner')
        user = self.request.user
        if user.is_staff:
            return qs
        return qs.filter(partner=user)


class PartnerBookingConfigViewSet(viewsets.ModelViewSet):
    serializer_class = PartnerBookingConfigSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['tourist_point']

    def get_queryset(self):  # type: ignore[override]
        qs = PartnerBookingConfig.objects.select_related('tourist_point', 'partner')
        if self.request.user.is_staff:
            return qs
        return qs.filter(partner=self.request.user)


class PartnerPaymentMethodViewSet(viewsets.ModelViewSet):
    serializer_class = PartnerPaymentMethodSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):  # type: ignore[override]
        qs = PartnerPaymentMethod.objects.all()
        if self.request.user.is_staff:
            return qs
        return qs.filter(partner=self.request.user)

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        payment_method = self.get_object()
        if not request.user.is_staff and payment_method.partner != request.user:
            raise PermissionDenied('Action non autorisée.')
        payment_method.is_default = True
        payment_method.save(update_fields=['is_default', 'updated_at'])
        return Response(self.get_serializer(payment_method).data)


class PartnerCommissionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PartnerCommissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['payment_status', 'tourist_point']

    def get_queryset(self):  # type: ignore[override]
        qs = PartnerCommission.objects.select_related('tourist_point', 'partner')
        if self.request.user.is_staff:
            return qs
        return qs.filter(partner=self.request.user)


class PartnerInvoiceViewSet(viewsets.ModelViewSet):
    """Factures de commission. Admin : toutes (+ mark-paid, generate). Partenaire : les siennes."""
    serializer_class = PartnerInvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    filterset_fields = ['status']

    def get_queryset(self):  # type: ignore[override]
        qs = PartnerInvoice.objects.select_related('partner').prefetch_related('commissions')
        u = self.request.user
        if u.is_staff:
            partner_f = self.request.query_params.get('partner')
            return qs.filter(partner_id=partner_f) if partner_f else qs
        return qs.filter(partner=u)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser], url_path='mark-paid')
    def mark_paid(self, request, pk=None):
        invoice = self.get_object()
        invoice.status = 'paid'
        invoice.paid_at = timezone.now()
        invoice.payment_reference = (request.data.get('payment_reference') or '')[:120]
        invoice.save(update_fields=['status', 'paid_at', 'payment_reference', 'updated_at'])
        invoice.commissions.update(payment_status='paid')  # commissions soldées
        return Response(PartnerInvoiceSerializer(invoice).data)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAdminUser], url_path='generate')
    def generate(self, request):
        from datetime import date
        from django.contrib.auth import get_user_model
        from .billing import (generate_invoices_for_period, generate_invoice_for_partner,
                              previous_month_bounds, mark_overdue)
        y, m = request.data.get('year'), request.data.get('month')
        if y and m:
            start = date(int(y), int(m), 1)
            nxt = date(start.year + (start.month // 12), (start.month % 12) + 1, 1)
            end = date.fromordinal(nxt.toordinal() - 1)
        else:
            start, end = previous_month_bounds()
        partner_id = request.data.get('partner')
        if partner_id:
            p = get_user_model().objects.filter(pk=partner_id).first()
            invoices = [i for i in [generate_invoice_for_partner(p, start, end)] if i] if p else []
        else:
            invoices = generate_invoices_for_period(start, end)
        mark_overdue()
        return Response({'created': len(invoices),
                         'invoices': PartnerInvoiceSerializer(invoices, many=True).data})


class PartnerKYCViewSet(viewsets.ModelViewSet):
    """Dossier KYC/KYB. Le partenaire lit/édite SON dossier + upload des documents.
    L'admin vérifie/refuse. Vérification manuelle (gate d'approbation du profil)."""
    serializer_class = PartnerKYCSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):  # type: ignore[override]
        qs = PartnerKYC.objects.select_related('profile', 'profile__owner').prefetch_related('documents')
        u = self.request.user
        if not u.is_staff:
            return qs.filter(profile__owner=u)
        profile_id = self.request.query_params.get('profile')
        return qs.filter(profile_id=profile_id) if profile_id else qs

    def _own_profile(self):
        profile, _ = PartnerProfile.objects.get_or_create(owner=self.request.user)
        return profile

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        """Dossier KYC du partenaire connecté (créé à la volée)."""
        profile = self._own_profile()
        kyc, _ = PartnerKYC.objects.get_or_create(profile=profile)
        if request.method == 'PATCH':
            serializer = self.get_serializer(kyc, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            # Toute modification ramène un dossier refusé/non soumis en 'pending' (re-revue).
            if kyc.status in ('not_submitted', 'rejected'):
                kyc.status = 'pending'
                kyc.save(update_fields=['status', 'updated_at'])
            return Response(self.get_serializer(kyc).data)
        return Response(self.get_serializer(kyc).data)

    @action(detail=False, methods=['post'], url_path='upload-document')
    def upload_document(self, request):
        """Upload d'un document KYC (multipart : doc_type + file). Réservé au propriétaire."""
        profile = self._own_profile()
        kyc, _ = PartnerKYC.objects.get_or_create(profile=profile)
        doc_type = request.data.get('doc_type')
        file = request.FILES.get('file')
        valid_types = {c[0] for c in PartnerKYCDocument.DOC_TYPE_CHOICES}
        if doc_type not in valid_types:
            return Response({'detail': 'doc_type invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        if not file:
            return Response({'detail': 'Fichier manquant.'}, status=status.HTTP_400_BAD_REQUEST)
        if file.size > 10 * 1024 * 1024:
            return Response({'detail': 'Fichier trop volumineux (max 10 Mo).'}, status=status.HTTP_400_BAD_REQUEST)
        allowed_ext = ('.pdf', '.jpg', '.jpeg', '.png', '.webp')
        if not file.name.lower().endswith(allowed_ext):
            return Response({'detail': 'Format non supporté (PDF ou image).'}, status=status.HTTP_400_BAD_REQUEST)
        # Un seul document par type : on remplace l'éventuel précédent.
        kyc.documents.filter(doc_type=doc_type).delete()
        doc = PartnerKYCDocument.objects.create(kyc=kyc, doc_type=doc_type, file=file, original_name=file.name[:255])
        if kyc.status in ('not_submitted', 'rejected'):
            kyc.status = 'pending'
            kyc.save(update_fields=['status', 'updated_at'])
        return Response(PartnerKYCDocumentSerializer(doc, context=self.get_serializer_context()).data,
                        status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def verify(self, request, pk=None):
        kyc = self.get_object()
        kyc.status = 'verified'
        kyc.reviewed_by = request.user
        kyc.reviewed_at = timezone.now()
        kyc.rejection_reason = ''
        kyc.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'rejection_reason', 'updated_at'])
        PartnerNotification.objects.create(
            partner=kyc.profile.owner,
            title='Dossier KYC vérifié',
            body="Votre identité a été vérifiée. Votre profil peut désormais être approuvé.",
            category='kyc',
        )
        return Response({'status': kyc.status})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def reject(self, request, pk=None):
        kyc = self.get_object()
        kyc.status = 'rejected'
        kyc.reviewed_by = request.user
        kyc.reviewed_at = timezone.now()
        kyc.rejection_reason = (request.data.get('reason') or '')[:2000]
        kyc.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'rejection_reason', 'updated_at'])
        PartnerNotification.objects.create(
            partner=kyc.profile.owner,
            title='Dossier KYC à corriger',
            body=kyc.rejection_reason or "Votre dossier KYC nécessite des corrections.",
            category='kyc',
        )
        return Response({'status': kyc.status})


class PartnerKYCDocumentDownloadView(APIView):
    """Téléchargement protégé d'un document KYC : admin OU propriétaire uniquement."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        from django.http import FileResponse, Http404
        doc = PartnerKYCDocument.objects.select_related('kyc__profile__owner').filter(pk=pk).first()
        if not doc:
            raise Http404
        owner = doc.kyc.profile.owner
        if not (request.user.is_staff or request.user == owner):
            raise PermissionDenied("Accès refusé.")
        try:
            return FileResponse(doc.file.open('rb'), as_attachment=True,
                                filename=doc.original_name or doc.file.name.rsplit('/', 1)[-1])
        except FileNotFoundError:
            raise Http404


class PartnerBillingInfoView(APIView):
    """Coordonnées bancaires de la PLATEFORME (pour que le partenaire règle ses factures par virement)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.core.models import SystemSetting

        def g(key):
            obj = SystemSetting.objects.filter(setting_key=key).first()
            return obj.setting_value if obj else ''

        return Response({
            'bank_holder': g('platform_bank_holder'),
            'iban': g('platform_iban'),
            'bic': g('platform_bic'),
        })


class PartnerSubscriptionCheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    PRICE_IDS = {
        'basic': {'monthly': 'price_basic_monthly', 'yearly': 'price_basic_yearly'},
        'premium': {'monthly': 'price_premium_monthly', 'yearly': 'price_premium_yearly'},
        'enterprise': {'monthly': 'price_enterprise_monthly', 'yearly': 'price_enterprise_yearly'},
    }

    def post(self, request):
        plan_id = request.data.get('planId')
        billing_cycle = request.data.get('billingCycle', 'monthly')
        if plan_id not in self.PRICE_IDS:
            return Response({'detail': 'Plan inconnu'}, status=status.HTTP_400_BAD_REQUEST)
        if billing_cycle not in self.PRICE_IDS[plan_id]:
            return Response({'detail': 'Cycle de facturation invalide'}, status=status.HTTP_400_BAD_REQUEST)

        base_url = getattr(settings, 'SUBSCRIPTION_CHECKOUT_BASE_URL', 'https://payments.tasarini.ai/checkout')
        checkout_url = f"{base_url}?plan={plan_id}&billing={billing_cycle}&price_id={self.PRICE_IDS[plan_id][billing_cycle]}"

        PartnerNotification.objects.create(
            partner=request.user,
            title='Démarrage d’un checkout',
            body=f"Vous avez initié une souscription {plan_id} ({billing_cycle}).",
            category='billing',
        )
        return Response({'url': checkout_url})


class PartnerWithdrawalViewSet(viewsets.ModelViewSet):
    serializer_class = PartnerWithdrawalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):  # type: ignore[override]
        qs = PartnerWithdrawal.objects.select_related('payment_method', 'partner')
        if self.request.user.is_staff:
            return qs
        return qs.filter(partner=self.request.user)


class PartnerEndpointHealthViewSet(viewsets.ModelViewSet):
    serializer_class = PartnerEndpointHealthSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):  # type: ignore[override]
        qs = PartnerEndpointHealth.objects.select_related('partner')
        if self.request.user.is_staff:
            return qs
        return qs.filter(partner=self.request.user)

    @action(detail=False, methods=['post'])
    def run_checks(self, request):
        endpoints = list(self.get_queryset())
        now = timezone.now()
        for endpoint in endpoints:
            response_time = randint(120, 1800)
            noisy = (random() - 0.5) * 5
            uptime = max(70.0, min(100.0, float(endpoint.uptime_percentage) + noisy))
            success = max(60.0, min(100.0, float(endpoint.success_rate_24h) + noisy))
            if response_time < 800:
                status_value = 'healthy'
                error_message = ''
            elif response_time < 1400:
                status_value = 'degraded'
                error_message = 'Temps de réponse élevé détecté.'
            else:
                status_value = 'unhealthy'
                error_message = 'Timeout simulé lors de la dernière vérification.'

            endpoint.response_time_ms = response_time
            endpoint.uptime_percentage = round(uptime, 2)
            endpoint.success_rate_24h = round(success, 2)
            endpoint.status = status_value
            endpoint.error_message = error_message
            endpoint.last_checked = now
            endpoint.save(update_fields=[
                'response_time_ms',
                'uptime_percentage',
                'success_rate_24h',
                'status',
                'error_message',
                'last_checked',
                'updated_at',
            ])

        return Response({'checked': len(endpoints), 'timestamp': now})

class PartnerAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PartnerAnalyticsSerializer

    def get(self, request, pk: str):
        pois = TouristPoint.objects.filter(owner__public_id=pk)
        total = pois.count()
        pending = pois.filter(is_active=False).count()
        approved = total - pending
        rejected = 0
        bookings = 0
        approval_rate = (approved / total * 100) if total else 0
        performance = min(100, round(approval_rate * 0.7 + bookings * 0.3))

        # Calculate total views from metadata
        total_views = 0
        for poi in pois:
            metadata = poi.metadata or {}
            views = int(metadata.get('view_count', metadata.get('views', 0)) or 0)
            total_views += views

        data = {
            'totalPOIs': total,
            'approvedPOIs': approved,
            'pendingPOIs': pending,
            'rejectedPOIs': rejected,
            'totalViews': total_views,
            'totalBookings': bookings,
            'monthlyRevenue': 0,
            'performanceScore': performance,
        }
        return Response(self.serializer_class(data).data)


class PartnerBulkPOIStatusView(APIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = PartnerBulkPOIStatusSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        poi_ids = serializer.validated_data['poi_ids']
        status_value = serializer.validated_data['status']
        pois = TouristPoint.objects.filter(id__in=poi_ids)
        updated = 0
        for poi in pois:
            metadata = {**(poi.metadata or {}), 'status': status_value}
            poi.metadata = metadata
            poi.save(update_fields=['metadata'])
            updated += 1
        return Response({'updated': updated})


class PartnerDashboardMetricsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if not hasattr(user, 'partner_profile') and not user.is_staff:
            return Response(
                {'detail': 'Profil partenaire introuvable.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pois = TouristPoint.objects.filter(owner=user)
        poi_ids = list(pois.values_list('id', flat=True))
        analytics_qs = TouristPointAnalytics.objects.filter(tourist_point_id__in=poi_ids)
        commissions_qs = PartnerCommission.objects.filter(partner=user)

        total_views = analytics_qs.aggregate(total=Sum('views'))['total'] or 0
        total_clicks = analytics_qs.aggregate(total=Sum('clicks'))['total'] or 0
        total_bookings = analytics_qs.aggregate(total=Sum('bookings'))['total'] or 0
        total_revenue = analytics_qs.aggregate(total=Sum('revenue'))['total'] or 0

        avg_rating = pois.aggregate(avg=Avg('rating'))['avg'] or 0
        pending_pois = pois.filter(is_active=False).count()
        pending_payments = commissions_qs.filter(payment_status__in=['pending', 'processing']).count()

        today = timezone.now().date()
        start_month = today.replace(day=1)
        month_analytics = analytics_qs.filter(date__gte=start_month)
        month_revenue = month_analytics.aggregate(total=Sum('revenue'))['total'] or 0
        month_views = month_analytics.aggregate(total=Sum('views'))['total'] or 0
        month_bookings = month_analytics.aggregate(total=Sum('bookings'))['total'] or 0

        top_poi_data = (
            analytics_qs.values('tourist_point__name')
            .annotate(total_revenue=Sum('revenue'))
            .order_by('-total_revenue')
            .first()
        )

        data = {
            'total_pois': pois.count(),
            'pending_pois': pending_pois,
            'total_views': int(total_views),
            'total_clicks': int(total_clicks),
            'total_bookings': int(total_bookings),
            'total_revenue': float(total_revenue),
            'avg_rating': round(float(avg_rating or 0), 2),
            'pending_payments': pending_payments,
            'this_month': {
                'views': int(month_views or 0),
                'bookings': int(month_bookings or 0),
                'revenue': float(month_revenue or 0),
            },
            'top_poi': {
                'name': top_poi_data['tourist_point__name'] if top_poi_data else '',
                'revenue': float(top_poi_data['total_revenue']) if top_poi_data else 0.0,
            },
        }
        return Response(data)


class PartnerAnalyticsSeriesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        days = request.query_params.get('days')
        try:
            days_int = int(days) if days else 30
        except (TypeError, ValueError):
            days_int = 30

        days_int = max(1, min(days_int, 180))
        start_date = timezone.now().date() - timedelta(days=days_int - 1)

        analytics = (
            TouristPointAnalytics.objects.filter(tourist_point__owner=user, date__gte=start_date)
            .values('date')
            .annotate(
                views=Sum('views'),
                clicks=Sum('clicks'),
                bookings=Sum('bookings'),
                revenue=Sum('revenue'),
            )
            .order_by('date')
        )

        series = [
            {
                'date': row['date'],
                'views': int(row['views'] or 0),
                'clicks': int(row['clicks'] or 0),
                'bookings': int(row['bookings'] or 0),
                'revenue': float(row['revenue'] or 0),
            }
            for row in analytics
        ]
        return Response({'series': series})
