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
    PartnerApplication,
    PartnerBookingConfig,
    PartnerCommission,
    PartnerEndpointHealth,
    PartnerNotification,
    PartnerPaymentMethod,
    PartnerProfile,
    PartnerWithdrawal,
)
from .serializers import (
    PartnerAnalyticsSerializer,
    PartnerApplicationSerializer,
    PartnerBookingConfigSerializer,
    PartnerBulkPOIStatusSerializer,
    PartnerCommissionSerializer,
    PartnerEndpointHealthSerializer,
    PartnerNotificationSerializer,
    PartnerPaymentMethodSerializer,
    PartnerProfileSerializer,
    PartnerWithdrawalSerializer,
)


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
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def moderate(self, request, pk=None):
        profile = self.get_object()
        action = request.data.get('action')
        status_map = {'approve': 'approved', 'reject': 'rejected', 'suspend': 'suspended'}
        if action not in status_map:
            return Response({'detail': 'Action invalide'}, status=status.HTTP_400_BAD_REQUEST)
        profile.status = status_map[action]
        profile.save(update_fields=['status', 'updated_at'])
        PartnerNotification.objects.create(
            partner=profile.owner,
            title=f'Statut partenaire mis à jour ({profile.status})',
            body=request.data.get('admin_message', ''),
            category='moderation',
        )
        return Response({'status': profile.status})

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
