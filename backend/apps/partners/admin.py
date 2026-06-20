from django.contrib import admin

from .models import (
    PartnerApplication,
    PartnerCommission,
    PartnerInvoice,
    PartnerNotification,
    PartnerProfile,
)


@admin.register(PartnerProfile)
class PartnerProfileAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'owner', 'status', 'commission_rate', 'created_at')
    list_filter = ('status',)
    search_fields = ('company_name', 'owner__username')
    filter_horizontal = ('managed_pois',)


@admin.register(PartnerInvoice)
class PartnerInvoiceAdmin(admin.ModelAdmin):
    list_display = ('number', 'partner', 'amount_due', 'currency', 'status', 'issued_at', 'due_date', 'paid_at')
    list_filter = ('status', 'currency')
    search_fields = ('number', 'partner__username', 'payment_reference')
    date_hierarchy = 'issued_at'


@admin.register(PartnerCommission)
class PartnerCommissionAdmin(admin.ModelAdmin):
    list_display = ('id', 'partner', 'tourist_point', 'amount', 'commission_rate', 'payment_status', 'invoice', 'booking_date')
    list_filter = ('payment_status',)
    search_fields = ('partner__username', 'booking_reference')
    date_hierarchy = 'booking_date'


@admin.register(PartnerApplication)
class PartnerApplicationAdmin(admin.ModelAdmin):
    list_display = ('partner', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('partner__username',)


@admin.register(PartnerNotification)
class PartnerNotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'partner', 'category', 'is_read', 'created_at')
    list_filter = ('category', 'is_read')
    search_fields = ('title', 'partner__username')
