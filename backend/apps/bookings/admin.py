from django.contrib import admin

from .models import Booking, RatePlan, Room


class RatePlanInline(admin.TabularInline):
    model = RatePlan
    extra = 0


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('name', 'tourist_point', 'capacity', 'base_price')
    inlines = [RatePlanInline]


@admin.register(RatePlan)
class RatePlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'room', 'code', 'is_refundable')


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('room', 'user', 'status', 'check_in', 'check_out', 'total_amount')
    list_filter = ('status',)
    search_fields = ('room__name', 'user__username')
