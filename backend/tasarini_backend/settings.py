"""Django settings for tasarini_backend project."""
from __future__ import annotations

from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
env = environ.Env(
    DEBUG=(bool, False),
    SECRET_KEY=(str, 'change-me'),
    ALLOWED_HOSTS=(list, ['localhost']),
    DATABASE_URL=(str, f'sqlite:///{BASE_DIR / "db.sqlite3"}'),
)

env_file = BASE_DIR / '.env'
if env_file.exists():
    environ.Env.read_env(env_file)

SECRET_KEY = env('SECRET_KEY')
DEBUG = env('DEBUG')
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost'])
if '0.0.0.0' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('0.0.0.0')
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=['http://localhost:5173'])

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.postgres',
    # Third-party apps
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    # Local apps
    'apps.accounts',
    'apps.poi',
    'apps.partners',
    'apps.content',
    'apps.bookings',
    'apps.analytics',
    'apps.media',
    'apps.travel',
    'apps.core',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # Tasarini custom middlewares
    # 'apps.accounts.middleware.EmailVerificationMiddleware',  # Désactivé: on utilise is_active à la place
    'apps.accounts.session_middleware.UserSessionMiddleware',  # Gestion automatique des sessions utilisateur
]

ROOT_URLCONF = 'tasarini_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'tasarini_backend.wsgi.application'
ASGI_APPLICATION = 'tasarini_backend.asgi.application'

DATABASES = {
    'default': env.db(),
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 12,  # ANSSI recommandation
        }
    },
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
    {
        'NAME': 'apps.accounts.validators.StrongPasswordValidator',
        'OPTIONS': {
            'min_length': 12,
        }
    },
]

LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'accounts.User'

# Backends d'authentification
AUTHENTICATION_BACKENDS = [
    'apps.accounts.backends.EmailBackend',  # Authentification par email
    'django.contrib.auth.backends.ModelBackend',  # Fallback au backend par défaut
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Tasarini API',
    'DESCRIPTION': 'Backend Django remplaçant Supabase',
    'VERSION': '0.1.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=['http://localhost:5173'])
CORS_ALLOW_CREDENTIALS = True

# Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = env('EMAIL_HOST', default='mail.tasarini.com')
EMAIL_PORT = env.int('EMAIL_PORT', default=465)
EMAIL_USE_SSL = env.bool('EMAIL_USE_SSL', default=True)
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=False)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='no-reply@tasarini.com')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='Tasarini <no-reply@tasarini.com>')
SERVER_EMAIL = env('SERVER_EMAIL', default='no-reply@tasarini.com')
EMAIL_TIMEOUT = env.int('EMAIL_TIMEOUT', default=10)
EMAIL_USE_LOCALTIME = True

# Frontend URL for email links
FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:5173')

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
