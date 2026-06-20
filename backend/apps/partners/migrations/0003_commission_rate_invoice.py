"""Monétisation : taux de commission par partenaire + modèle Facture + lien commission→facture."""
from decimal import Decimal

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('partners', '0002_partnercommission_partnerendpointhealth_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='partnerprofile',
            name='commission_rate',
            field=models.DecimalField(decimal_places=2, default=Decimal('10.00'), max_digits=5),
        ),
        migrations.CreateModel(
            name='PartnerInvoice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('number', models.CharField(max_length=40, unique=True)),
                ('period_start', models.DateField()),
                ('period_end', models.DateField()),
                ('amount_due', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
                ('currency', models.CharField(default='EUR', max_length=8)),
                ('status', models.CharField(choices=[('draft', 'Brouillon'), ('issued', 'Émise'), ('paid', 'Payée'), ('overdue', 'En retard'), ('cancelled', 'Annulée')], default='issued', max_length=16)),
                ('issued_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('due_date', models.DateField(blank=True, null=True)),
                ('paid_at', models.DateTimeField(blank=True, null=True)),
                ('payment_reference', models.CharField(blank=True, max_length=120)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('partner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='partner_invoices', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-issued_at']},
        ),
        migrations.AddIndex(
            model_name='partnerinvoice',
            index=models.Index(fields=['partner', 'status'], name='partinv_partner_status_idx'),
        ),
        migrations.AddField(
            model_name='partnercommission',
            name='invoice',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='commissions', to='partners.partnerinvoice'),
        ),
        migrations.AlterField(
            model_name='partnercommission',
            name='payment_status',
            field=models.CharField(choices=[('pending', 'À facturer'), ('invoiced', 'Facturée'), ('paid', 'Payée'), ('cancelled', 'Annulée'), ('processing', 'Processing'), ('failed', 'Failed')], default='pending', max_length=32),
        ),
        migrations.AlterField(
            model_name='partnercommission',
            name='commission_rate',
            field=models.DecimalField(decimal_places=2, default=Decimal('10.0'), max_digits=5),
        ),
    ]
