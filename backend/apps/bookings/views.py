from __future__ import annotations

from django.db.models import Q
from rest_framework import permissions, viewsets

from .models import Booking, RatePlan, Room
from .serializers import BookingSerializer, RatePlanSerializer, RoomSerializer


class IsAdminOrBookingOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):  # pragma: no cover
        if request.user.is_staff:
            return True
        if getattr(obj, 'user', None) == request.user:
            return True
        room = getattr(obj, 'room', None)
        if room and getattr(room, 'tourist_point', None) and room.tourist_point.owner == request.user:
            return True
        return False


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.select_related('tourist_point').prefetch_related('rate_plans')
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['tourist_point']


class RatePlanViewSet(viewsets.ModelViewSet):
    queryset = RatePlan.objects.select_related('room')
    serializer_class = RatePlanSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['room']


class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrBookingOwner]
    filterset_fields = ['status', 'room', 'room__tourist_point']

    def get_queryset(self):  # type: ignore[override]
        if getattr(self, 'swagger_fake_view', False):
            return Booking.objects.none()
        qs = Booking.objects.select_related('room', 'room__tourist_point', 'user', 'user__profile')
        user = self.request.user
        if user.is_staff:
            return qs

        scope = self.request.query_params.get('scope')
        partner_filter = Q(room__tourist_point__owner=user)
        if scope == 'partner':
            return qs.filter(partner_filter)
        return qs.filter(Q(user=user) | partner_filter)
