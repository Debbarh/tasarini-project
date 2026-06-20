"""Génération automatique des commissions partenaire à partir des réservations.

Modèle de monétisation : commission après-vente. Quand une réservation passe à `completed`
(prestation réalisée), on crée UNE commission (idempotente) pour le partenaire propriétaire
du POI : montant = total_amount × taux_du_partenaire. Si la réservation est annulée et que la
commission n'est pas encore facturée, on l'annule.
"""
from __future__ import annotations

import logging
from decimal import Decimal, ROUND_HALF_UP

from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(post_save, sender='bookings.Booking')
def sync_partner_commission(sender, instance, **kwargs):
    booking = instance
    try:
        from apps.partners.models import PartnerCommission, PartnerProfile  # noqa: F401
        status = booking.status

        if status == 'completed':
            poi = booking.room.tourist_point
            owner = poi.owner
            profile = PartnerProfile.objects.filter(owner=owner).first()
            if not profile:
                return  # le propriétaire n'est pas un partenaire → pas de commission
            rate = profile.commission_rate or Decimal('10.00')
            amount = (Decimal(booking.total_amount or 0) * rate / Decimal('100')).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP)
            PartnerCommission.objects.get_or_create(
                booking=booking,
                defaults={
                    'partner': owner,
                    'tourist_point': poi,
                    'amount': amount,
                    'commission_rate': rate,
                    'booking_reference': str(booking.id),
                    'customer_name': getattr(booking.user, 'display_name', '') or getattr(booking.user, 'username', ''),
                    'booking_date': booking.check_out or booking.created_at.date(),
                    'payment_status': 'pending',
                    'metadata': {'source': 'booking_completed'},
                },
            )
        elif status == 'cancelled':
            # On n'annule que les commissions PAS ENCORE facturées (une facturée est due).
            PartnerCommission.objects.filter(
                booking=booking, payment_status='pending'
            ).update(payment_status='cancelled')
    except Exception:  # noqa: BLE001 - ne jamais bloquer la sauvegarde d'une réservation
        logger.exception("sync_partner_commission a échoué pour booking %s", getattr(instance, 'id', '?'))
