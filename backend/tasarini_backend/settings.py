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
    'apps.content.middleware.StoryMetricsMiddleware',  # Track API performance metrics
    'apps.content.middleware.StoryViewTrackingMiddleware',  # Auto-increment story view counts
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

# Caching configuration
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'tasarini-cache',
        'OPTIONS': {
            'MAX_ENTRIES': 1000,
        }
    }
}

# Cache timeout configurations (in seconds)
CACHE_TTL_SHORT = 60 * 5  # 5 minutes - for frequently changing data
CACHE_TTL_MEDIUM = 60 * 15  # 15 minutes - for semi-static data
CACHE_TTL_LONG = 60 * 60  # 1 hour - for static data

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
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,  # Default page size for all list endpoints
    'DEFAULT_THROTTLE_RATES': {
        'likes': '30/min',
        'comments': '10/min',
        'bookmarks': '30/min',
        'story_create': '5/min',
    },
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

# LibreTranslate service URL for translations
LIBRETRANSLATE_URL = env('LIBRETRANSLATE_URL', default='http://libretranslate:5000')

# DeepL API configuration
DEEPL_API_KEY = env('DEEPL_API_KEY', default='')

# AI provider API keys (stored only in environment, jamais côté frontend)
OPENAI_API_KEY = env('OPENAI_API_KEY', default='')
OPENAI_API_BASE = env('OPENAI_API_BASE', default='https://api.openai.com/v1')
GEMINI_API_KEY = env('GEMINI_API_KEY', default='')
GEMINI_API_BASE = env('GEMINI_API_BASE', default='https://generativelanguage.googleapis.com/v1beta')
PERPLEXITY_API_KEY = env('PERPLEXITY_API_KEY', default='')
PERPLEXITY_API_BASE = env('PERPLEXITY_API_BASE', default='https://api.perplexity.ai')

# Ollama local LLM server (pas de clé API : modèle hébergé localement)
OLLAMA_API_BASE = env('OLLAMA_API_BASE', default='http://ollama:11434')

# Traduction dynamique unifiée : un seul moteur = translategemma:4b (Ollama). Plus de DeepL.
TRANSLATION_OLLAMA_MODEL = env('TRANSLATION_OLLAMA_MODEL', default='translategemma:4b')
TRANSLATION_TIMEOUT = env.int('TRANSLATION_TIMEOUT', default=90)
# Accélération du cron : réglages Ollama + traduction par lots (voir services_i18n).
TRANSLATION_OLLAMA_NUM_CTX = env.int('TRANSLATION_OLLAMA_NUM_CTX', default=2048)
TRANSLATION_OLLAMA_NUM_PREDICT = env.int('TRANSLATION_OLLAMA_NUM_PREDICT', default=512)
TRANSLATION_OLLAMA_KEEP_ALIVE = env('TRANSLATION_OLLAMA_KEEP_ALIVE', default='30m')
TRANSLATION_BATCH_TEXTS = env.int('TRANSLATION_BATCH_TEXTS', default=25)
TRANSLATION_BATCH_ENABLED = env.bool('TRANSLATION_BATCH_ENABLED', default=True)

# --- OAuth social (Google & Facebook) ---
# Base d'URL du backend pour les redirect_uri OAuth (doit matcher EXACTEMENT la console).
OAUTH_CALLBACK_BASE_URL = env('OAUTH_CALLBACK_BASE_URL', default='https://tasarini.com/api/v1')
GOOGLE_OAUTH_CLIENT_ID = env('GOOGLE_OAUTH_CLIENT_ID', default='')
GOOGLE_OAUTH_CLIENT_SECRET = env('GOOGLE_OAUTH_CLIENT_SECRET', default='')
FACEBOOK_OAUTH_CLIENT_ID = env('FACEBOOK_OAUTH_CLIENT_ID', default='')
FACEBOOK_OAUTH_CLIENT_SECRET = env('FACEBOOK_OAUTH_CLIENT_SECRET', default='')

# Unsplash API keys for destination images
UNSPLASH_ACCESS_KEY = env('UNSPLASH_ACCESS_KEY', default='')
UNSPLASH_SECRET_KEY = env('UNSPLASH_SECRET_KEY', default='')
UNSPLASH_API_BASE = env('UNSPLASH_API_BASE', default='https://api.unsplash.com')

# External POI providers for "Be Inspired" (live-fetched + cached, merged with platform POIs)
GEOAPIFY_API_KEY = env('GEOAPIFY_API_KEY', default='')
FOURSQUARE_API_KEY = env('FOURSQUARE_API_KEY', default='')
LOCATIONIQ_API_KEY = env('LOCATIONIQ_API_KEY', default='')
OPENTRIPMAP_API_KEY = env('OPENTRIPMAP_API_KEY', default='')
LOCATIONIQ_API_BASE = env('LOCATIONIQ_API_BASE', default='https://us1.locationiq.com/v1')
# Stay22 (carte hôtels/POI home via embed; clé API pour usage data futur)
STAY22_API_KEY = env('STAY22_API_KEY', default='')
# Overpass (OSM) and Wikidata SPARQL need no key; endpoints overridable for failover.
OVERPASS_API_URL = env('OVERPASS_API_URL', default='https://overpass-api.de/api/interpreter')
WIKIDATA_SPARQL_URL = env('WIKIDATA_SPARQL_URL', default='https://query.wikidata.org/sparql')
EXTERNAL_POI_USER_AGENT = env('EXTERNAL_POI_USER_AGENT', default='Tasarini/1.0 (https://tasarini.com; contact: no-reply@tasarini.com)')

# Travel APIs for real-time booking data
# Amadeus API for flights and travel data
AMADEUS_API_KEY = env('AMADEUS_API_KEY', default='')
AMADEUS_API_SECRET = env('AMADEUS_API_SECRET', default='')
AMADEUS_API_BASE = env('AMADEUS_API_BASE', default='https://test.api.amadeus.com')

# Hotelbeds API for hotel bookings
HOTELBEDS_API_KEY = env('HOTELBEDS_API_KEY', default='')
HOTELBEDS_SECRET = env('HOTELBEDS_SECRET', default='')
HOTELBEDS_API_BASE = env('HOTELBEDS_API_BASE', default='https://api.test.hotelbeds.com')

# Hotelbeds Activities API
HOTELBEDS_ACTIVITIES_API_KEY = env('HOTELBEDS_ACTIVITIES_API_KEY', default='')
HOTELBEDS_ACTIVITIES_SECRET = env('HOTELBEDS_ACTIVITIES_SECRET', default='')
HOTELBEDS_ACTIVITIES_API_BASE = env('HOTELBEDS_ACTIVITIES_API_BASE', default='https://api.test.hotelbeds.com')

# Hotelbeds Transfers API
HOTELBEDS_TRANSFERS_API_KEY = env('HOTELBEDS_TRANSFERS_API_KEY', default='')
HOTELBEDS_TRANSFERS_SECRET = env('HOTELBEDS_TRANSFERS_SECRET', default='')
HOTELBEDS_TRANSFERS_API_BASE = env('HOTELBEDS_TRANSFERS_API_BASE', default='https://api.test.hotelbeds.com')

# Kayak API for travel bookings
KAYAK_API_KEY = env('KAYAK_API_KEY', default='')
# Default to sandbox affiliate base; can be overridden via env
KAYAK_API_BASE = env('KAYAK_API_BASE', default='https://sandbox-en-us.kayakaffiliates.com/api/affiliate')

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


# --- Production security hardening (active uniquement quand DEBUG=False) ---
# Derrière le proxy nginx qui termine le TLS.
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    X_FRAME_OPTIONS = 'SAMEORIGIN'
    # nginx assure déjà la redirection HTTP->HTTPS, on évite une double redirection
    SECURE_SSL_REDIRECT = False
