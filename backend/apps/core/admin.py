"""Admin configuration for core app"""
from django.contrib import admin
from django.utils.html import format_html
from .models import SystemSetting, APIProvider, Widget


@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display = ['setting_key', 'setting_value', 'setting_type', 'category', 'is_active']
    list_filter = ['setting_type', 'category', 'is_active']
    search_fields = ['setting_key', 'setting_value', 'description']
    ordering = ['setting_key']


@admin.register(APIProvider)
class APIProviderAdmin(admin.ModelAdmin):
    list_display = [
        'status_icon',
        'provider_name',
        'service_type_display',
        'priority',
        'credentials_status',
        'api_endpoint_short'
    ]
    list_filter = ['is_active', 'service_type', 'provider_code']
    search_fields = ['provider_name', 'description']
    ordering = ['service_type', 'priority', 'provider_name']
    list_editable = ['priority']

    fieldsets = (
        ('Informations principales', {
            'fields': ('provider_code', 'provider_name', 'service_type', 'description')
        }),
        ('Configuration', {
            'fields': ('is_active', 'priority', 'has_credentials', 'api_endpoint')
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ['created_at', 'updated_at']

    def status_icon(self, obj):
        """Display status icon"""
        if obj.is_active:
            return format_html('<span style="color: green; font-size: 18px;">✓</span>')
        return format_html('<span style="color: red; font-size: 18px;">✗</span>')
    status_icon.short_description = 'Statut'

    def service_type_display(self, obj):
        """Display service type with badge"""
        colors = {
            'hotels': '#007bff',
            'flights': '#28a745',
            'activities': '#ffc107',
            'transfers': '#17a2b8',
            'restaurants': '#dc3545',
            'car_rental': '#6c757d',
        }
        color = colors.get(obj.service_type, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_service_type_display()
        )
    service_type_display.short_description = 'Type de service'

    def credentials_status(self, obj):
        """Display credentials status"""
        if obj.has_credentials:
            return format_html('<span style="color: green;">✓ Configurés</span>')
        return format_html('<span style="color: orange;">⚠ Non configurés</span>')
    credentials_status.short_description = 'Credentials'

    def api_endpoint_short(self, obj):
        """Display shortened API endpoint"""
        if obj.api_endpoint:
            if len(obj.api_endpoint) > 40:
                return obj.api_endpoint[:40] + '...'
            return obj.api_endpoint
        return '-'
    api_endpoint_short.short_description = 'API Endpoint'

    actions = ['activate_providers', 'deactivate_providers']

    def activate_providers(self, request, queryset):
        """Activate selected providers"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} fournisseur(s) activé(s).')
    activate_providers.short_description = "Activer les fournisseurs sélectionnés"

    def deactivate_providers(self, request, queryset):
        """Deactivate selected providers"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} fournisseur(s) désactivé(s).')
    deactivate_providers.short_description = "Désactiver les fournisseurs sélectionnés"


@admin.register(Widget)
class WidgetAdmin(admin.ModelAdmin):
    list_display = [
        'status_icon',
        'widget_name',
        'widget_type_display',
        'placement_display',
        'service_type_display',
        'priority',
    ]
    list_filter = ['is_active', 'widget_type', 'placement', 'service_type']
    search_fields = ['widget_name', 'widget_code', 'description']
    ordering = ['placement', 'priority', 'widget_name']
    list_editable = ['priority']

    fieldsets = (
        ('Informations principales', {
            'fields': ('widget_code', 'widget_name', 'widget_type', 'placement', 'service_type', 'description')
        }),
        ('Configuration', {
            'fields': ('is_active', 'priority', 'configuration', 'content')
        }),
        ('Ressources externes', {
            'fields': ('script_url', 'css_url')
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ['created_at', 'updated_at']

    def status_icon(self, obj):
        """Display status icon"""
        if obj.is_active:
            return format_html('<span style="color: green; font-size: 18px;">✓</span>')
        return format_html('<span style="color: red; font-size: 18px;">✗</span>')
    status_icon.short_description = 'Statut'

    def widget_type_display(self, obj):
        """Display widget type with badge"""
        colors = {
            'booking': '#007bff',
            'search': '#28a745',
            'promotion': '#ffc107',
            'information': '#17a2b8',
            'partner': '#dc3545',
            'social': '#6f42c1',
            'custom': '#6c757d',
        }
        color = colors.get(obj.widget_type, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_widget_type_display()
        )
    widget_type_display.short_description = 'Type de widget'

    def placement_display(self, obj):
        """Display placement with badge"""
        colors = {
            'home': '#007bff',
            'search_results': '#28a745',
            'detail_page': '#ffc107',
            'sidebar': '#17a2b8',
            'footer': '#6c757d',
            'header': '#343a40',
            'floating': '#e83e8c',
            'modal': '#fd7e14',
        }
        color = colors.get(obj.placement, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_placement_display()
        )
    placement_display.short_description = 'Emplacement'

    def service_type_display(self, obj):
        """Display service type with badge"""
        colors = {
            'all': '#6c757d',
            'hotels': '#007bff',
            'flights': '#28a745',
            'activities': '#ffc107',
            'transfers': '#17a2b8',
            'restaurants': '#dc3545',
            'car_rental': '#6c757d',
        }
        color = colors.get(obj.service_type, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_service_type_display()
        )
    service_type_display.short_description = 'Service'

    actions = ['activate_widgets', 'deactivate_widgets']

    def activate_widgets(self, request, queryset):
        """Activate selected widgets"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} widget(s) activé(s).')
    activate_widgets.short_description = "Activer les widgets sélectionnés"

    def deactivate_widgets(self, request, queryset):
        """Deactivate selected widgets"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} widget(s) désactivé(s).')
    deactivate_widgets.short_description = "Désactiver les widgets sélectionnés"
