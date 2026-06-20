"""Génère les factures mensuelles des partenaires (commissions du mois précédent par défaut)
et passe en 'overdue' les factures échues. À lancer le 1er du mois.

  python manage.py generate_partner_invoices               # mois précédent
  python manage.py generate_partner_invoices --year 2026 --month 5
"""
from __future__ import annotations

from datetime import date

from django.core.management.base import BaseCommand

from apps.partners.billing import generate_invoices_for_period, mark_overdue, previous_month_bounds


class Command(BaseCommand):
    help = "Génère les factures mensuelles des partenaires + marque les factures en retard."

    def add_arguments(self, parser):
        parser.add_argument('--year', type=int)
        parser.add_argument('--month', type=int)

    def handle(self, *args, **opts):
        if opts.get('year') and opts.get('month'):
            start = date(opts['year'], opts['month'], 1)
            nxt = date(start.year + (start.month // 12), (start.month % 12) + 1, 1)
            end = date.fromordinal(nxt.toordinal() - 1)
        else:
            start, end = previous_month_bounds()
        self.stdout.write(f"Facturation période {start} → {end}…")
        invoices = generate_invoices_for_period(start, end)
        overdue = mark_overdue()
        for inv in invoices:
            self.stdout.write(f"  {inv.number} : {inv.amount_due} {inv.currency} (partenaire {inv.partner_id})")
        self.stdout.write(self.style.SUCCESS(
            f"Terminé : {len(invoices)} facture(s) émise(s), {overdue} passée(s) en retard."))
