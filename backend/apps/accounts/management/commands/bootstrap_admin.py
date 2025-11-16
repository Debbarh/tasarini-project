from __future__ import annotations

from typing import Any

from pathlib import Path

import environ
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils.crypto import get_random_string

from apps.accounts.models import UserRole, UserRoleAssignment

User = get_user_model()

env = environ.Env(
    INITIAL_ADMIN_EMAIL=(str, ''),
    INITIAL_ADMIN_PASSWORD=(str, ''),
)
env_file = Path(getattr(settings, 'BASE_DIR', '.')) / '.env'
if env_file.exists():
    environ.Env.read_env(env_file)


class Command(BaseCommand):
    help = "Creates an initial admin account if none exists."

    def add_arguments(self, parser):  # type: ignore[override]
        parser.add_argument('--email', help='Admin email (overrides env)')
        parser.add_argument('--password', help='Admin password (overrides env)')
        parser.add_argument('--force', action='store_true', help='Force creation even if an admin already exists')

    def handle(self, *args: Any, **options: Any):  # type: ignore[override]
        email = options.get('email') or env('INITIAL_ADMIN_EMAIL')
        password = options.get('password') or env('INITIAL_ADMIN_PASSWORD')
        force = options.get('force', False)

        if not email:
            raise CommandError('No admin email provided. Use --email or set INITIAL_ADMIN_EMAIL.')

        if User.objects.filter(role=UserRole.ADMIN).exists() and not force:
            self.stdout.write(self.style.WARNING('Admin already exists. Use --force to create another one.'))
            return

        username = email

        if not password:
            password = get_random_string(length=32)
            generated = True
        else:
            generated = False

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': username,
                'role': UserRole.ADMIN,
                'display_name': 'Administrator',
                'is_staff': True,
                'is_superuser': True,
            },
        )

        if not created and not force:
            raise CommandError(f"User with email {email} already exists. Use --force to reset password.")

        user.role = UserRole.ADMIN
        user.is_staff = True
        user.is_superuser = True
        user.display_name = user.display_name or 'Administrator'
        user.set_password(password)
        user.save()

        UserRoleAssignment.objects.get_or_create(user=user, role=UserRole.ADMIN)

        if generated:
            self.stdout.write(self.style.WARNING('No password supplied — generated a secure one.'))
        self.stdout.write(self.style.SUCCESS('Admin account ready.'))
        self.stdout.write(f"Email: {email}")
        if generated:
            self.stdout.write(f"Password: {password}")
            self.stdout.write('Store this password securely and rotate it after first login.')
        elif force or created:
            self.stdout.write('Password: ***** (user-specified)')
        else:
            self.stdout.write('Password: ***** (unchanged)')
