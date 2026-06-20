"""Facturation des commissions partenaire (commission après-vente).

Génère une facture mensuelle par partenaire regroupant ses commissions `pending` de la période ;
les commissions passent `invoiced` et pointent vers la facture. Idempotent (numéro unique
`INV-<partner>-<YYYYMM>`). Le partenaire règle par virement → l'admin marque la facture payée.
"""
from __future__ import annotations

import logging
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

logger = logging.getLogger(__name__)

DUE_DAYS = 15


def previous_month_bounds(today=None):
    today = today or timezone.localdate()
    first_this = today.replace(day=1)
    last_prev = first_this - timedelta(days=1)
    first_prev = last_prev.replace(day=1)
    return first_prev, last_prev


def generate_invoice_for_partner(partner, period_start: date, period_end: date):
    """Crée (ou renvoie) la facture du partenaire pour la période. None si rien à facturer."""
    from .models import PartnerCommission, PartnerInvoice, PartnerNotification
    number = f"INV-{partner.id}-{period_start:%Y%m}"
    existing = PartnerInvoice.objects.filter(number=number).first()
    if existing:
        return existing
    commissions = PartnerCommission.objects.filter(
        partner=partner, payment_status='pending',
        booking_date__gte=period_start, booking_date__lte=period_end,
    )
    total = commissions.aggregate(s=Sum('amount'))['s'] or Decimal('0.00')
    if not commissions.exists() or total <= 0:
        return None
    with transaction.atomic():
        invoice = PartnerInvoice.objects.create(
            partner=partner, number=number,
            period_start=period_start, period_end=period_end,
            amount_due=total, status='issued',
            due_date=period_end + timedelta(days=DUE_DAYS),
        )
        commissions.update(invoice=invoice, payment_status='invoiced')
        PartnerNotification.objects.create(
            partner=partner,
            title=f"Facture {number} émise",
            body=(f"Montant dû : {total} EUR. À régler par virement avant le "
                  f"{invoice.due_date:%d/%m/%Y}."),
            category='billing',
        )
    return invoice


def generate_invoices_for_period(period_start: date, period_end: date):
    from .models import PartnerCommission
    User = get_user_model()
    partner_ids = (PartnerCommission.objects
                   .filter(payment_status='pending', booking_date__gte=period_start, booking_date__lte=period_end)
                   .values_list('partner_id', flat=True).distinct())
    out = []
    for uid in partner_ids:
        partner = User.objects.filter(pk=uid).first()
        if not partner:
            continue
        inv = generate_invoice_for_partner(partner, period_start, period_end)
        if inv:
            out.append(inv)
    return out


def mark_overdue():
    """Passe en 'overdue' les factures émises dont la date d'échéance est dépassée."""
    from .models import PartnerInvoice
    today = timezone.localdate()
    return PartnerInvoice.objects.filter(status='issued', due_date__lt=today).update(status='overdue')
