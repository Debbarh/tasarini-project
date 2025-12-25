from __future__ import annotations

from django.db import models


class SystemSetting(models.Model):
    SETTING_TYPES = [
        ('string', 'String'),
        ('boolean', 'Boolean'),
        ('number', 'Number'),
    ]

    setting_key = models.CharField(max_length=120, unique=True)
    setting_value = models.TextField(blank=True)
    setting_type = models.CharField(max_length=16, choices=SETTING_TYPES, default='string')
    description = models.TextField(blank=True)
    category = models.CharField(max_length=64, default='general')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['setting_key']

    def __str__(self):  # pragma: no cover
        return f"{self.setting_key}={self.setting_value}"


class APIProvider(models.Model):
    """Modèle pour gérer les fournisseurs d'API de réservation"""

    SERVICE_TYPES = [
        ('hotels', 'Hôtels'),
        ('flights', 'Vols'),
        ('activities', 'Activités'),
        ('transfers', 'Transferts'),
        ('restaurants', 'Restaurants'),
        ('car_rental', 'Location de voiture'),
    ]

    PROVIDER_CODES = [
        ('kayak', 'Kayak'),
        ('amadeus', 'Amadeus'),
        ('hotelbeds', 'HotelBeds'),
        ('hotelbeds_activities', 'HotelBeds Activities'),
        ('hotelbeds_transfers', 'HotelBeds Transfers'),
    ]

    provider_code = models.CharField(
        max_length=50,
        choices=PROVIDER_CODES,
        verbose_name="Code du fournisseur"
    )
    provider_name = models.CharField(
        max_length=100,
        verbose_name="Nom du fournisseur"
    )
    service_type = models.CharField(
        max_length=50,
        choices=SERVICE_TYPES,
        verbose_name="Type de service"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Actif",
        help_text="Cochez pour activer ce fournisseur pour ce service"
    )
    priority = models.IntegerField(
        default=1,
        verbose_name="Priorité",
        help_text="Ordre de priorité (1 = haute priorité, les plus petits chiffres sont essayés en premier)"
    )
    description = models.TextField(
        blank=True,
        verbose_name="Description"
    )
    api_endpoint = models.URLField(
        blank=True,
        verbose_name="URL de l'API"
    )
    has_credentials = models.BooleanField(
        default=False,
        verbose_name="Credentials configurés",
        help_text="Les credentials sont dans les variables d'environnement"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['service_type', 'priority', 'provider_name']
        unique_together = ['provider_code', 'service_type']
        verbose_name = "Fournisseur d'API"
        verbose_name_plural = "Fournisseurs d'API"

    def __str__(self):
        status = "✓" if self.is_active else "✗"
        return f"{status} {self.provider_name} - {self.get_service_type_display()} (priorité: {self.priority})"


class Widget(models.Model):
    """Modèle pour gérer les widgets affichés sur le site"""

    WIDGET_TYPES = [
        ('booking', 'Widget de réservation'),
        ('search', 'Widget de recherche'),
        ('promotion', 'Widget promotionnel'),
        ('information', 'Widget informatif'),
        ('partner', 'Widget partenaire'),
        ('social', 'Widget social'),
        ('custom', 'Widget personnalisé'),
    ]

    PLACEMENT_TYPES = [
        ('home', 'Page d\'accueil'),
        ('search_results', 'Résultats de recherche'),
        ('detail_page', 'Page de détail'),
        ('sidebar', 'Barre latérale'),
        ('footer', 'Pied de page'),
        ('header', 'En-tête'),
        ('floating', 'Flottant'),
        ('modal', 'Modal/Popup'),
    ]

    SERVICE_TYPES = [
        ('all', 'Tous les services'),
        ('hotels', 'Hôtels'),
        ('flights', 'Vols'),
        ('activities', 'Activités'),
        ('transfers', 'Transferts'),
        ('restaurants', 'Restaurants'),
        ('car_rental', 'Location de voiture'),
    ]

    widget_code = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Code du widget",
        help_text="Identifiant unique du widget (ex: kayak_hotel_search)"
    )
    widget_name = models.CharField(
        max_length=200,
        verbose_name="Nom du widget"
    )
    widget_type = models.CharField(
        max_length=50,
        choices=WIDGET_TYPES,
        verbose_name="Type de widget"
    )
    placement = models.CharField(
        max_length=50,
        choices=PLACEMENT_TYPES,
        verbose_name="Emplacement",
        help_text="Où afficher le widget sur le site"
    )
    service_type = models.CharField(
        max_length=50,
        choices=SERVICE_TYPES,
        default='all',
        verbose_name="Type de service",
        help_text="Service de voyage concerné"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Actif",
        help_text="Cochez pour activer ce widget"
    )
    priority = models.IntegerField(
        default=1,
        verbose_name="Priorité",
        help_text="Ordre d'affichage (1 = haute priorité)"
    )
    description = models.TextField(
        blank=True,
        verbose_name="Description"
    )
    configuration = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Configuration",
        help_text="Configuration JSON du widget (dimensions, couleurs, options, etc.)"
    )
    content = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Contenu",
        help_text="Contenu JSON du widget (textes, URLs, images, etc.)"
    )
    script_url = models.URLField(
        blank=True,
        verbose_name="URL du script",
        help_text="URL du script JavaScript du widget (si applicable)"
    )
    css_url = models.URLField(
        blank=True,
        verbose_name="URL du CSS",
        help_text="URL du fichier CSS du widget (si applicable)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['placement', 'priority', 'widget_name']
        verbose_name = "Widget"
        verbose_name_plural = "Widgets"

    def __str__(self):
        status = "✓" if self.is_active else "✗"
        return f"{status} {self.widget_name} - {self.get_placement_display()} (priorité: {self.priority})"
