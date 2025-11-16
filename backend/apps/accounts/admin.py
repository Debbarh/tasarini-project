from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User, UserProfile, UserRoleAssignment


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Tasarini', {'fields': ('public_id', 'display_name', 'role', 'preferred_language', 'onboarding_completed')}),
    )
    readonly_fields = ('public_id',)
    list_display = ('username', 'email', 'role', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'first_name', 'last_name', 'email')
    search_fields = ('user__username', 'first_name', 'last_name', 'email')


@admin.register(UserRoleAssignment)
class UserRoleAssignmentAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'created_at')
    list_filter = ('role',)
    search_fields = ('user__username',)
