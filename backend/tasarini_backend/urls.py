from __future__ import annotations

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework import routers
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.oauth_views import OAuthLoginView, OAuthCallbackView
from apps.accounts.views import (
    AdminAuditLogViewSet,
    AdminDashboardView,
    AdminPermissionCheckView,
    AdminPermissionViewSet,
    AdminPermissionsView,
    AdminSessionViewSet,
    NotificationPreferenceView,
    NotificationViewSet,
    EmailTokenObtainPairView,
    RegisterView,
    RequestPasswordResetView,
    ResendVerificationEmailView,
    ResetPasswordView,
    RoleHierarchyView,
    UserPermissionsView,
    UserProfileViewSet,
    UserRoleAssignmentViewSet,
    UserViewSet,
    UserBookingsView,
    UserPreferencesView,
    UploadAvatarView,
    UserStatsView,
    AdvancedUserStatsView,
    ChangePasswordView,
    UserSessionView,
    RevokeAllOtherSessionsView,
    DownloadUserDataView,
    DeleteAccountView,
    VerifyEmailView,
    VerifyEmailCompleteView,
    UserFollowViewSet,
    AchievementViewSet,
    UserAchievementViewSet,
)
from apps.analytics.views import (
    TouristPointAnalyticsViewSet,
    TravelAnalyticsViewSet,
    BeInspiredOverviewView,
    BeInspiredPOIStatsView,
    BeInspiredUserActivityView,
    BeInspiredAIStatsView,
)
from apps.media.views import MediaDeleteView, MediaUploadView
from apps.poi.external_views import ExternalPOIListView, ExternalPOIImportView, POIImageView, POIEnrichView
from apps.poi.views import (
    ActivityAvoidanceViewSet,
    ActivityCategoryViewSet,
    ActivityIntensityLevelViewSet,
    ActivityInterestViewSet,
    BudgetCurrencyViewSet,
    BudgetFlexibilityOptionViewSet,
    BudgetLevelViewSet,
    CityViewSet,
    CountryViewSet,
    CulinaryAdventureLevelViewSet,
    DietaryRestrictionViewSet,
    CuisineTypeViewSet,
    TravelGroupTypeViewSet,
    TravelGroupSubtypeViewSet,
    TravelGroupConfigurationViewSet,
    DifficultyLevelViewSet,
    TagViewSet,
    TouristPointViewSet,
    POIConversationViewSet,
    POIMediaViewSet,
    RestaurantCategoryViewSet,
    LocationResolveView,
    AccommodationTypeViewSet,
    AccommodationAmenityViewSet,
    AccommodationLocationViewSet,
    AccommodationAccessibilityViewSet,
    AccommodationSecurityViewSet,
    AccommodationAmbianceViewSet,
    FavoriteTouristPointViewSet,
    TouristPointReviewViewSet,
    POIClaimViewSet,
    POISuggestionViewSet,
    POIReportViewSet,
    TranslationCronView,
    ActivityMetadataCollectionView,
    ActivityMetadataDetailView,
    AccommodationMetadataCollectionView,
    AccommodationMetadataDetailView,
    RestaurantMetadataCollectionView,
    RestaurantMetadataDetailView,
)
from apps.partners.views import (
    PartnerAnalyticsView,
    PartnerAnalyticsSeriesView,
    PartnerApplicationViewSet,
    PartnerBookingConfigViewSet,
    PartnerBulkPOIStatusView,
    PartnerCommissionViewSet,
    PartnerInvoiceViewSet,
    PartnerDashboardMetricsView,
    PartnerEndpointHealthViewSet,
    PartnerNotificationViewSet,
    PartnerPaymentMethodViewSet,
    PartnerProfileViewSet,
    PartnerWithdrawalViewSet,
    PartnerSubscriptionCheckoutView,
    PartnerBillingInfoView,
    PartnerKYCViewSet,
    PartnerKYCDocumentDownloadView,
)
from apps.content.views import (
    AdvertisementSettingViewSet,
    ContentReportViewSet,
    DiscoveryItineraryViewSet,
    ModerationActionViewSet,
    SavedItineraryViewSet,
    SpamCheckView,
    SpamPatternViewSet,
    StoryAIProviderConfigViewSet,
    StoryAnalyticsViewSet,
    StoryCollectionViewSet,
    StoryCommentViewSet,
    StoryDraftViewSet,
    StoryGenerationView,
    StoryMediaViewSet,
    StorySeriesViewSet,
    StoryViewSet,
)
from apps.bookings.views import BookingViewSet, RatePlanViewSet, RoomViewSet
from apps.travel.views import (
    ActivityDescribeView,
    EnhancedTripPlannerView,
    StreamingTripPlannerView,
    TripPlanningProgressView,
    DestinationImagesView,
    ActivityImagesView,
    TravelAIAssistantView,
    SmartRecommendationsView,
    AmadeusProxyView,
    HotelBedsProxyView,
    KayakProxyView,
    AIProviderConfigViewSet,
)
from apps.core.views import SystemSettingViewSet, APIProviderViewSet, WidgetViewSet

router = routers.DefaultRouter()
router.register('users', UserViewSet, basename='user')
router.register('accounts/profiles', UserProfileViewSet, basename='user-profile')
router.register('accounts/user-roles', UserRoleAssignmentViewSet, basename='user-role')
router.register('accounts/notifications', NotificationViewSet, basename='notification')
router.register('accounts/follows', UserFollowViewSet, basename='user-follow')  # Phase 7: Follow system
router.register('accounts/achievements', AchievementViewSet, basename='achievement')  # Phase 9: Badges
router.register('accounts/user-achievements', UserAchievementViewSet, basename='user-achievement')  # Phase 9: User badges
router.register('admin/audit-logs', AdminAuditLogViewSet, basename='admin-audit-log')
router.register('admin/sessions', AdminSessionViewSet, basename='admin-session')
router.register('admin/permission-rules', AdminPermissionViewSet, basename='admin-permission')
router.register('poi/tags', TagViewSet, basename='tag')
router.register('poi/budget-levels', BudgetLevelViewSet, basename='budgetlevel')
router.register('poi/budget-currencies', BudgetCurrencyViewSet, basename='budgetcurrency')
router.register('poi/budget-flex-options', BudgetFlexibilityOptionViewSet, basename='budgetflexoption')
router.register('locations/countries', CountryViewSet, basename='country')
router.register('locations/cities', CityViewSet, basename='city')
router.register('activities/categories', ActivityCategoryViewSet, basename='activity-category')
router.register('activities/intensity-levels', ActivityIntensityLevelViewSet, basename='activity-intensity')
router.register('activities/interests', ActivityInterestViewSet, basename='activity-interest')
router.register('activities/avoidances', ActivityAvoidanceViewSet, basename='activity-avoidance')
router.register('culinary/dietary-restrictions', DietaryRestrictionViewSet, basename='dietary-restriction')
router.register('culinary/cuisine-types', CuisineTypeViewSet, basename='cuisine-type')
router.register('culinary/adventure-levels', CulinaryAdventureLevelViewSet, basename='culinary-adventure')
router.register('culinary/restaurant-categories', RestaurantCategoryViewSet, basename='restaurant-category')
router.register('accommodation/types', AccommodationTypeViewSet, basename='accommodation-type')
router.register('accommodation/amenities', AccommodationAmenityViewSet, basename='accommodation-amenity')
router.register('accommodation/locations', AccommodationLocationViewSet, basename='accommodation-location')
router.register('accommodation/accessibility', AccommodationAccessibilityViewSet, basename='accommodation-accessibility')
router.register('accommodation/security', AccommodationSecurityViewSet, basename='accommodation-security')
router.register('accommodation/ambiance', AccommodationAmbianceViewSet, basename='accommodation-ambiance')
router.register('travel-groups/types', TravelGroupTypeViewSet, basename='travel-group-type')
router.register('travel-groups/subtypes', TravelGroupSubtypeViewSet, basename='travel-group-subtype')
router.register('travel-groups/configurations', TravelGroupConfigurationViewSet, basename='travel-group-config')
router.register('poi/difficulty-levels', DifficultyLevelViewSet, basename='difficultylevel')
router.register('poi/tourist-points', TouristPointViewSet, basename='touristpoint')
router.register('poi/conversations', POIConversationViewSet, basename='poiconversation')
router.register('poi/media', POIMediaViewSet, basename='poi-media')
router.register('poi/favorites', FavoriteTouristPointViewSet, basename='poi-favorite')
router.register('poi/reviews', TouristPointReviewViewSet, basename='poi-review')
router.register('poi/claims', POIClaimViewSet, basename='poi-claim')
router.register('poi/suggestions', POISuggestionViewSet, basename='poi-suggestion')
router.register('poi/reports', POIReportViewSet, basename='poi-report')
router.register('partners/profiles', PartnerProfileViewSet, basename='partnerprofile')
router.register('partners/applications', PartnerApplicationViewSet, basename='partnerapplication')
router.register('partners/notifications', PartnerNotificationViewSet , basename='partnernotification')
router.register('partners/booking-configs', PartnerBookingConfigViewSet, basename='partnerbookingconfig')
router.register('partners/payment-methods', PartnerPaymentMethodViewSet, basename='partnerpaymentmethod')
router.register('partners/commissions', PartnerCommissionViewSet, basename='partnercommission')
router.register('partners/invoices', PartnerInvoiceViewSet, basename='partnerinvoice')
router.register('partners/kyc', PartnerKYCViewSet, basename='partnerkyc')
router.register('partners/withdrawals', PartnerWithdrawalViewSet, basename='partnerwithdrawal')
router.register('partners/endpoints', PartnerEndpointHealthViewSet, basename='partnerendpointhealth')
router.register('stories', StoryViewSet, basename='story')
router.register('story-comments', StoryCommentViewSet, basename='storycomment')
router.register('content/story-ai-providers', StoryAIProviderConfigViewSet, basename='story-ai-provider')
router.register('content/analytics', StoryAnalyticsViewSet, basename='story-analytics')
router.register('content/reports', ContentReportViewSet, basename='content-report')
router.register('content/moderation-actions', ModerationActionViewSet, basename='moderation-action')
router.register('content/spam-patterns', SpamPatternViewSet, basename='spam-pattern')
router.register('content/collections', StoryCollectionViewSet, basename='story-collection')
router.register('content/drafts', StoryDraftViewSet, basename='story-draft')
router.register('content/series', StorySeriesViewSet, basename='story-series')
router.register('content/media', StoryMediaViewSet, basename='story-media')
router.register('discovery/itineraries', DiscoveryItineraryViewSet, basename='discovery-itinerary')
router.register('travel/saved-itineraries', SavedItineraryViewSet, basename='saved-itinerary')
router.register('travel/ai-providers', AIProviderConfigViewSet, basename='travel-ai-provider')
router.register('content/advertisements', AdvertisementSettingViewSet, basename='advertisementsetting')
router.register('bookings/rooms', RoomViewSet, basename='room')
router.register('bookings/rate-plans', RatePlanViewSet, basename='rateplan')
router.register('bookings/reservations', BookingViewSet, basename='reservation')
router.register('analytics/tourist-points', TouristPointAnalyticsViewSet, basename='poi-analytics')
router.register('analytics/travel', TravelAnalyticsViewSet, basename='travel-analytics')
router.register('admin/system-settings', SystemSettingViewSet, basename='system-setting')
router.register('admin/api-providers', APIProviderViewSet, basename='api-provider')
router.register('admin/widgets', WidgetViewSet, basename='widget')

urlpatterns = [
    # Admin Django déplacé hors de /admin/ (réservé au panel React) vers une URL secrète,
    # elle-même restreinte aux IP du Maroc côté nginx (+ login Django). Triple barrière.
    path('ops-console-7q9x3m/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='api-docs'),
    path('api/token/', EmailTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/register/', RegisterView.as_view(), name='auth_register'),
    path('api/auth/verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('api/auth/verify-email/complete/', VerifyEmailCompleteView.as_view(), name='verify_email_complete'),
    path('api/auth/resend-verification/', ResendVerificationEmailView.as_view(), name='resend_verification'),
    path('api/auth/request-password-reset/', RequestPasswordResetView.as_view(), name='request_password_reset'),
    path('api/auth/reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('api/v1/user/permissions/', UserPermissionsView.as_view(), name='user-permissions'),
    path('api/v1/roles/hierarchy/', RoleHierarchyView.as_view(), name='roles-hierarchy'),
    path(
        'api/v1/accounts/notification-preferences/me/',
        NotificationPreferenceView.as_view(),
        name='notification-preferences',
    ),
    path('api/v1/user/preferences/', UserPreferencesView.as_view(), name='user-preferences'),
    path('api/v1/user/bookings/', UserBookingsView.as_view(), name='user-bookings'),
    path('api/v1/accounts/upload-avatar/', UploadAvatarView.as_view(), name='upload-avatar'),
    path('api/v1/accounts/stats/', UserStatsView.as_view(), name='user-stats'),
    path('api/v1/accounts/advanced-stats/', AdvancedUserStatsView.as_view(), name='advanced-user-stats'),
    path('api/v1/accounts/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('api/v1/accounts/sessions/', UserSessionView.as_view(), name='user-sessions'),
    path('api/v1/accounts/sessions/<uuid:session_id>/', UserSessionView.as_view(), name='user-session-detail'),
    path('api/v1/accounts/sessions/revoke-all-others/', RevokeAllOtherSessionsView.as_view(), name='revoke-all-sessions'),
    path('api/v1/partners/dashboard/metrics/', PartnerDashboardMetricsView.as_view(), name='partner-dashboard-metrics'),
    path('api/v1/partners/analytics/series/', PartnerAnalyticsSeriesView.as_view(), name='partner-analytics-series'),
    path('api/v1/accounts/download-data/', DownloadUserDataView.as_view(), name='download-user-data'),
    path('api/v1/accounts/delete-account/', DeleteAccountView.as_view(), name='delete-account'),
    path('api/v1/media/upload/', MediaUploadView.as_view(), name='media-upload'),
    path('api/v1/media/delete/', MediaDeleteView.as_view(), name='media-delete'),
    # Doit précéder le router : sinon `stories/generate/` est capté par le détail
    # du StoryViewSet (pk='generate') → POST renvoie 405.
    path('api/v1/stories/generate/', StoryGenerationView.as_view(), name='story-generate'),
    path('api/v1/', include(router.urls)),
    path('api/v1/admin/dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('api/v1/admin/permissions/', AdminPermissionsView.as_view(), name='admin-permissions'),
    path('api/v1/admin/permissions/check/', AdminPermissionCheckView.as_view(), name='admin-permission-check'),
    path('api/v1/partners/<str:pk>/analytics/', PartnerAnalyticsView.as_view(), name='partner-analytics'),
    path('api/v1/partners/bulk-poi-status/', PartnerBulkPOIStatusView.as_view(), name='partner-bulk-poi'),
    path('api/v1/locations/resolve/', LocationResolveView.as_view(), name='location-resolve'),
    path('api/v1/analytics/be-inspired/overview/', BeInspiredOverviewView.as_view(), name='be-inspired-overview'),
    path('api/v1/analytics/be-inspired/pois/', BeInspiredPOIStatsView.as_view(), name='be-inspired-pois'),
    path('api/v1/analytics/be-inspired/users/', BeInspiredUserActivityView.as_view(), name='be-inspired-users'),
    path('api/v1/analytics/be-inspired/ai/', BeInspiredAIStatsView.as_view(), name='be-inspired-ai'),
    path('api/v1/poi/external/', ExternalPOIListView.as_view(), name='poi-external-list'),
    path('api/v1/poi/external/import/', ExternalPOIImportView.as_view(), name='poi-external-import'),
    path('api/v1/poi/image/', POIImageView.as_view(), name='poi-image'),
    path('api/v1/poi/enrich/', POIEnrichView.as_view(), name='poi-enrich'),
    path(
        'api/v1/poi/tourist-points/<uuid:pk>/activity/<str:section>/',
        ActivityMetadataCollectionView.as_view(),
        name='poi-activity-section',
    ),
    path(
        'api/v1/poi/tourist-points/<uuid:pk>/activity/<str:section>/<uuid:item_id>/',
        ActivityMetadataDetailView.as_view(),
        name='poi-activity-section-detail',
    ),
    path(
        'api/v1/poi/tourist-points/<uuid:pk>/accommodation/<str:section>/',
        AccommodationMetadataCollectionView.as_view(),
        name='poi-accommodation-section',
    ),
    path(
        'api/v1/poi/tourist-points/<uuid:pk>/accommodation/<str:section>/<uuid:item_id>/',
        AccommodationMetadataDetailView.as_view(),
        name='poi-accommodation-section-detail',
    ),
    path(
        'api/v1/poi/tourist-points/<uuid:pk>/restaurant/<str:section>/',
        RestaurantMetadataCollectionView.as_view(),
        name='poi-restaurant-section',
    ),
    path(
        'api/v1/poi/tourist-points/<uuid:pk>/restaurant/<str:section>/<uuid:item_id>/',
        RestaurantMetadataDetailView.as_view(),
        name='poi-restaurant-section-detail',
    ),
    path('api/v1/travel/planner/', EnhancedTripPlannerView.as_view(), name='travel-planner'),
    path('api/v1/travel/planner/stream/', StreamingTripPlannerView.as_view(), name='travel-planner-stream'),
    path('api/v1/travel/activity/describe/', ActivityDescribeView.as_view(), name='travel-activity-describe'),
    path('api/v1/travel/planner/progress/', TripPlanningProgressView.as_view(), name='travel-planner-progress'),
    path('api/v1/travel/destination-images/', DestinationImagesView.as_view(), name='travel-destination-images'),
    path('api/v1/travel/activity-images/', ActivityImagesView.as_view(), name='travel-activity-images'),
    path('api/v1/travel/assistant/', TravelAIAssistantView.as_view(), name='travel-assistant'),
    path('api/v1/travel/smart-recommendations/', SmartRecommendationsView.as_view(), name='travel-smart-recommendations'),
    path('api/v1/poi/translation-cron/', TranslationCronView.as_view(), name='poi-translation-cron'),
    # OAuth social (Google / Facebook) — login redirige vers le fournisseur, callback émet le JWT.
    path('api/v1/auth/<str:provider>/login/', OAuthLoginView.as_view(), name='oauth-login'),
    path('api/v1/auth/<str:provider>/callback/', OAuthCallbackView.as_view(), name='oauth-callback'),
    path('api/v1/travel/amadeus/', AmadeusProxyView.as_view(), name='travel-amadeus'),
    path('api/v1/travel/hotelbeds/', HotelBedsProxyView.as_view(), name='travel-hotelbeds'),
    path('api/v1/travel/kayak/<str:endpoint>/', KayakProxyView.as_view(), name='travel-kayak'),
    path('api/v1/partners/subscriptions/checkout/', PartnerSubscriptionCheckoutView.as_view(), name='partner-subscription-checkout'),
    path('api/v1/partners/billing-info/', PartnerBillingInfoView.as_view(), name='partner-billing-info'),
    path('api/v1/partners/kyc/documents/<int:pk>/download/', PartnerKYCDocumentDownloadView.as_view(), name='partner-kyc-doc-download'),
    path('api/v1/content/check-spam/', SpamCheckView.as_view(), name='check-spam'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
