from django.contrib import admin

from .models import PartnerApplication, PartnerNotification, PartnerProfile


@admin.register(PartnerProfile)
class PartnerProfileAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'owner', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('company_name', 'owner__username')
    filter_horizontal = ('managed_pois',)


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
