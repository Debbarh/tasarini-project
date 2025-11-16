from __future__ import annotations

from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from .models import (
    ActivityAvoidance,
    ActivityCategory,
    ActivityIntensityLevel,
    ActivityInterest,
    BudgetLevel,
    BudgetCurrency,
    BudgetFlexibilityOption,
    City,
    Country,
    CulinaryAdventureLevel,
    DietaryRestriction,
    CuisineType,
    DifficultyLevel,
    POIConversation,
    POIConversationMessage,
    POIMedia,
    RestaurantCategory,
    Tag,
    TouristPoint,
    TravelGroupType,
    TravelGroupSubtype,
    TravelGroupConfiguration,
    AccommodationType,
    AccommodationAmenity,
    AccommodationLocation,
    AccommodationAccessibilityFeature,
    AccommodationSecurityFeature,
    AccommodationAmbiance,
    FavoriteTouristPoint,
    TouristPointReview,
)


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'code', 'label_fr', 'label_en']


class BudgetLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetLevel
        fields = '__all__'


class BudgetCurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetCurrency
        fields = '__all__'


class BudgetFlexibilityOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetFlexibilityOption
        fields = '__all__'


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ['id', 'name', 'code', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ('id', 'created_at', 'updated_at')


class CitySerializer(serializers.ModelSerializer):
    country_detail = CountrySerializer(source='country', read_only=True)
    country = serializers.PrimaryKeyRelatedField(queryset=Country.objects.all())

    class Meta:
        model = City
        fields = [
            'id',
            'name',
            'country',
            'country_detail',
            'latitude',
            'longitude',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'created_at', 'updated_at', 'country_detail')


class ActivityCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityCategory
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class ActivityIntensityLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityIntensityLevel
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class ActivityInterestSerializer(serializers.ModelSerializer):
    category_detail = ActivityCategorySerializer(source='category', read_only=True)

    class Meta:
        model = ActivityInterest
        fields = [
            'id',
            'code',
            'label_fr',
            'label_en',
            'description_fr',
            'description_en',
            'category',
            'category_detail',
            'is_active',
            'display_order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'created_at', 'updated_at', 'category_detail')


class ActivityAvoidanceSerializer(serializers.ModelSerializer):
    category_detail = ActivityCategorySerializer(source='category', read_only=True)

    class Meta:
        model = ActivityAvoidance
        fields = [
            'id',
            'code',
            'label_fr',
            'label_en',
            'description_fr',
            'description_en',
            'category',
            'category_detail',
            'is_active',
            'display_order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'created_at', 'updated_at', 'category_detail')


class DietaryRestrictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DietaryRestriction
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class CuisineTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CuisineType
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class CulinaryAdventureLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = CulinaryAdventureLevel
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class RestaurantCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantCategory
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class TravelGroupSubtypeSerializer(serializers.ModelSerializer):
    travel_group_type_detail = serializers.CharField(source='travel_group_type.label_fr', read_only=True)

    class Meta:
        model = TravelGroupSubtype
        fields = [
            'id',
            'travel_group_type',
            'travel_group_type_detail',
            'code',
            'label_fr',
            'label_en',
            'description_fr',
            'description_en',
            'icon',
            'is_active',
            'display_order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'created_at', 'updated_at', 'travel_group_type_detail')


class TravelGroupConfigurationSerializer(serializers.ModelSerializer):
    travel_group_type_detail = serializers.CharField(source='travel_group_type.label_fr', read_only=True)

    class Meta:
        model = TravelGroupConfiguration
        fields = [
            'id',
            'travel_group_type',
            'travel_group_type_detail',
            'has_fixed_size',
            'fixed_size',
            'min_size',
            'max_size',
            'default_size',
            'allows_children',
            'min_child_age',
            'max_child_age',
            'requires_size_input',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'created_at', 'updated_at', 'travel_group_type_detail')


class AccommodationTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccommodationType
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class AccommodationAmenitySerializer(serializers.ModelSerializer):
    class Meta:
        model = AccommodationAmenity
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class AccommodationLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccommodationLocation
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class AccommodationAccessibilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = AccommodationAccessibilityFeature
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class AccommodationSecuritySerializer(serializers.ModelSerializer):
    class Meta:
        model = AccommodationSecurityFeature
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class AccommodationAmbianceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccommodationAmbiance
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class LocationResolveSerializer(serializers.Serializer):
    country_name = serializers.CharField(max_length=150)
    city_name = serializers.CharField(max_length=150)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)

    def validate_country_name(self, value):
        return value.strip()

    def validate_city_name(self, value):
        return value.strip()


class TravelGroupTypeSerializer(serializers.ModelSerializer):
    configuration = TravelGroupConfigurationSerializer(read_only=True)

    class Meta:
        model = TravelGroupType
        fields = [
            'id',
            'code',
            'label_fr',
            'label_en',
            'description_fr',
            'description_en',
            'icon',
            'color',
            'is_active',
            'display_order',
            'configuration',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'created_at', 'updated_at', 'configuration')


class DifficultyLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = DifficultyLevel
        fields = '__all__'


class POIMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = POIMedia
        fields = ['id', 'kind', 'file', 'external_url', 'alt_text']
        read_only_fields = ('id',)


class TouristPointSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Tag.objects.all(),
        source='tags',
        write_only=True,
        required=False,
    )
    budget_level = BudgetLevelSerializer(read_only=True)
    budget_level_id = serializers.PrimaryKeyRelatedField(
        queryset=BudgetLevel.objects.all(),
        source='budget_level',
        write_only=True,
        required=False,
        allow_null=True,
    )
    difficulty_level = DifficultyLevelSerializer(read_only=True)
    difficulty_level_id = serializers.PrimaryKeyRelatedField(
        queryset=DifficultyLevel.objects.all(),
        source='difficulty_level',
        write_only=True,
        required=False,
        allow_null=True,
    )
    media = POIMediaSerializer(many=True, read_only=True)
    owner_detail = serializers.SerializerMethodField()
    partner_detail = serializers.SerializerMethodField()
    status_enum = serializers.CharField(source='status', required=False)
    conversation_id = serializers.SerializerMethodField()

    class Meta:
        model = TouristPoint
        fields = [
            'id',
            'name',
            'description',
            'latitude',
            'longitude',
            'address',
            'contact_email',
            'contact_phone',
            'website_url',
            'price_range',
            'rating',
            'review_count',
            'budget_level',
            'budget_level_id',
            'difficulty_level',
            'difficulty_level_id',
            'is_active',
            'is_verified',
            'backend',
            'status_enum',
            'rejection_reason',
            'blocked_reason',
            'validation_score',
            'submission_count',
            'is_restaurant',
            'is_accommodation',
            'is_activity',
            'amenities',
            'metadata',
            'tags',
            'tag_ids',
            'media',
            'owner_detail',
            'partner_detail',
            'conversation_id',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('created_at', 'updated_at')

    def create(self, validated_data):  # type: ignore[override]
        tags = validated_data.pop('tags', [])
        tourist_point = TouristPoint.objects.create(**validated_data, owner=self.context['request'].user)
        if tags:
            tourist_point.tags.set(tags)
        return tourist_point

    def update(self, instance, validated_data):  # type: ignore[override]
        tags = validated_data.pop('tags', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if tags is not None:
            instance.tags.set(tags)
        return instance

    def get_owner_detail(self, obj):
        request = self.context.get('request')
        if not request:
            return None
        user = obj.owner
        if not request.user.is_staff and request.user != user:
            return None
        return UserSerializer(user, context=self.context).data

    def get_partner_detail(self, obj):
        profile = getattr(obj.owner, 'partner_profile', None)
        if not profile:
            return None
        return {
            'id': profile.id,
            'company_name': profile.company_name,
            'status': profile.status,
            'website': profile.website,
        }

    def get_conversation_id(self, obj):
        conversation = getattr(obj, 'conversation', None)
        if not conversation:
            conversation, _ = POIConversation.objects.get_or_create(tourist_point=obj)
        return str(conversation.id)


class MinimalTouristPointSerializer(serializers.ModelSerializer):
    tags = serializers.SerializerMethodField()

    class Meta:
        model = TouristPoint
        fields = ['id', 'name', 'description', 'latitude', 'longitude', 'rating', 'tags']

    def get_tags(self, obj):
        return list(obj.tags.values_list('label_fr', flat=True))


class FavoriteTouristPointSerializer(serializers.ModelSerializer):
    tourist_point = MinimalTouristPointSerializer(read_only=True)
    tourist_point_id = serializers.UUIDField(source='tourist_point.id', read_only=True)
    tourist_point_input = serializers.PrimaryKeyRelatedField(
        queryset=TouristPoint.objects.all(),
        source='tourist_point',
        write_only=True,
    )

    class Meta:
        model = FavoriteTouristPoint
        fields = ['id', 'tourist_point_id', 'tourist_point_input', 'tourist_point', 'created_at']
        read_only_fields = ('id', 'tourist_point_id', 'tourist_point', 'created_at')


class ActivityEquipmentSerializer(serializers.Serializer):
    id = serializers.CharField(required=False)
    name = serializers.CharField(max_length=255)
    type = serializers.ChoiceField(choices=['provided', 'required', 'optional'])
    description = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    is_included_in_price = serializers.BooleanField(default=True)
    rental_price = serializers.FloatField(required=False, allow_null=True)
    created_at = serializers.CharField(required=False)
    updated_at = serializers.CharField(required=False)


class ActivityRequirementSerializer(serializers.Serializer):
    id = serializers.CharField(required=False)
    type = serializers.ChoiceField(
        choices=[
            'age_min',
            'age_max',
            'weight_min',
            'weight_max',
            'fitness_level',
            'medical_condition',
            'experience_required',
            'other',
        ]
    )
    value = serializers.CharField()
    description = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    is_mandatory = serializers.BooleanField(default=True)
    created_at = serializers.CharField(required=False)
    updated_at = serializers.CharField(required=False)


class ActivityTimeSlotSerializer(serializers.Serializer):
    id = serializers.CharField(required=False)
    day_of_week = serializers.IntegerField(min_value=0, max_value=6)
    start_time = serializers.CharField()
    end_time = serializers.CharField()
    duration_minutes = serializers.IntegerField(min_value=15)
    max_participants = serializers.IntegerField(min_value=1)
    is_active = serializers.BooleanField(default=True)
    seasonal_start_date = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    seasonal_end_date = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    created_at = serializers.CharField(required=False)
    updated_at = serializers.CharField(required=False)


class ActivityPricingSerializer(serializers.Serializer):
    id = serializers.CharField(required=False)
    participant_type = serializers.ChoiceField(choices=['adult', 'child', 'senior', 'student', 'group'])
    base_price = serializers.FloatField(min_value=0)
    min_age = serializers.IntegerField(required=False, allow_null=True)
    max_age = serializers.IntegerField(required=False, allow_null=True)
    min_group_size = serializers.IntegerField(required=False, allow_null=True)
    max_group_size = serializers.IntegerField(required=False, allow_null=True)
    seasonal_multiplier = serializers.FloatField(min_value=0, default=1)
    weekend_multiplier = serializers.FloatField(min_value=0, default=1)
    is_active = serializers.BooleanField(default=True)
    created_at = serializers.CharField(required=False)
    updated_at = serializers.CharField(required=False)


class ActivityBookingSerializer(serializers.Serializer):
    id = serializers.CharField(required=False)
    customer_name = serializers.CharField(max_length=255)
    customer_email = serializers.EmailField()
    customer_phone = serializers.CharField(max_length=64, allow_blank=True, allow_null=True, required=False)
    booking_date = serializers.CharField()
    time_slot_id = serializers.CharField()
    start_time = serializers.CharField()
    end_time = serializers.CharField()
    adult_participants = serializers.IntegerField(min_value=0)
    child_participants = serializers.IntegerField(min_value=0)
    senior_participants = serializers.IntegerField(min_value=0)
    total_participants = serializers.IntegerField(min_value=0)
    total_amount = serializers.FloatField(min_value=0)
    booking_status = serializers.ChoiceField(choices=['pending', 'confirmed', 'cancelled', 'completed'])
    special_requests = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    equipment_rentals = serializers.ListField(child=serializers.CharField(), required=False)
    participant_details = serializers.ListField(child=serializers.DictField(), required=False)
    created_at = serializers.CharField(required=False)
    updated_at = serializers.CharField(required=False)


MEAL_PLAN_CHOICES = [
    ('bb', 'Bed & Breakfast'),
    ('half_board', 'Demi-pension'),
    ('full_board', 'Pension complète'),
    ('all_inclusive', 'Tout inclus'),
]


class AccommodationRoomSerializer(serializers.Serializer):
    id = serializers.CharField(required=False)
    tourist_point_id = serializers.CharField(required=False)
    room_name = serializers.CharField(max_length=255)
    room_type = serializers.CharField(max_length=120)
    capacity = serializers.IntegerField(min_value=1)
    base_price_per_night = serializers.FloatField(min_value=0)
    amenities = serializers.ListField(child=serializers.CharField(), default=list)
    description = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    images = serializers.ListField(child=serializers.CharField(), default=list)
    is_available = serializers.BooleanField(default=True)
    inventory_total = serializers.IntegerField(min_value=0, default=1)
    created_at = serializers.CharField(required=False)
    updated_at = serializers.CharField(required=False)


class AccommodationBookingSerializer(serializers.Serializer):
    id = serializers.CharField(required=False)
    tourist_point_id = serializers.CharField(required=False)
    room_id = serializers.CharField()
    customer_name = serializers.CharField(max_length=255)
    customer_email = serializers.EmailField()
    customer_phone = serializers.CharField(max_length=64, allow_blank=True, allow_null=True, required=False)
    check_in_date = serializers.CharField()
    check_out_date = serializers.CharField()
    number_of_guests = serializers.IntegerField(min_value=1)
    total_nights = serializers.IntegerField(min_value=1)
    total_amount = serializers.FloatField(min_value=0)
    booking_status = serializers.CharField()
    special_requests = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    created_at = serializers.CharField(required=False)
    updated_at = serializers.CharField(required=False)


class AccommodationAvailabilitySerializer(serializers.Serializer):
    id = serializers.CharField(required=False)
    room_id = serializers.CharField()
    date = serializers.CharField()
    is_available = serializers.BooleanField(default=True)
    special_price = serializers.FloatField(required=False, allow_null=True)
    minimum_stay = serializers.IntegerField(required=False, allow_null=True)
    created_at = serializers.CharField(required=False)
    updated_at = serializers.CharField(required=False)


class AccommodationRatePlanSerializer(serializers.Serializer):
    id = serializers.CharField(required=False)
    tourist_point_id = serializers.CharField(required=False)
    room_id = serializers.CharField()
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    base_meal_plan = serializers.ChoiceField(choices=MEAL_PLAN_CHOICES)
    pricing_strategy = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    currency = serializers.CharField(max_length=8, default='EUR')
    is_active = serializers.BooleanField(default=True)
    display_order = serializers.IntegerField(default=0)
    created_at = serializers.CharField(required=False)
    updated_at = serializers.CharField(required=False)


class AccommodationRateSeasonSerializer(serializers.Serializer):
    id = serializers.CharField(required=False)
    rate_plan_id = serializers.CharField()
    season_name = serializers.CharField(max_length=255)
    start_date = serializers.CharField()
    end_date = serializers.CharField()
    base_price = serializers.FloatField(min_value=0)
    currency = serializers.CharField(max_length=8, default='EUR')
    meal_plan_pricing = serializers.DictField(required=False, allow_null=True, default=None)
    minimum_stay = serializers.IntegerField(required=False, allow_null=True)
    maximum_stay = serializers.IntegerField(required=False, allow_null=True)
    closed_to_arrival = serializers.BooleanField(required=False, allow_null=True)
    closed_to_departure = serializers.BooleanField(required=False, allow_null=True)
    advance_purchase_days = serializers.IntegerField(required=False, allow_null=True)
    cutoff_hours = serializers.IntegerField(required=False, allow_null=True)
    restrictions = serializers.DictField(required=False, allow_null=True)
    created_at = serializers.CharField(required=False)
    updated_at = serializers.CharField(required=False)


class AccommodationLegacyRateSerializer(serializers.Serializer):
    id = serializers.CharField(required=False)
    room_id = serializers.CharField()
    rate_name = serializers.CharField(max_length=255)
    start_date = serializers.CharField()
    end_date = serializers.CharField()
    price_per_night = serializers.FloatField(min_value=0)
    minimum_stay = serializers.IntegerField(required=False, allow_null=True)
    is_active = serializers.BooleanField(default=True)
    meal_plan_pricing = serializers.DictField(required=False, allow_null=True)
    created_at = serializers.CharField(required=False)
    updated_at = serializers.CharField(required=False)


class RestaurantMenuSerializer(serializers.Serializer):
    id = serializers.CharField(required=False)
    restaurant_id = serializers.CharField(required=False)
    menu_type = serializers.CharField()
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    price = serializers.FloatField(required=False, allow_null=True)
    is_available = serializers.BooleanField(default=True)
    valid_from = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    valid_to = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    meal_period = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    display_order = serializers.IntegerField(default=0)
    created_at = serializers.CharField(required=False)
    updated_at = serializers.CharField(required=False)


class RestaurantDishSerializer(serializers.Serializer):
    id = serializers.CharField(required=False)
    restaurant_id = serializers.CharField(required=False)
    menu_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    price = serializers.FloatField()
    category = serializers.CharField()
    ingredients = serializers.ListField(child=serializers.CharField(), required=False)
    allergens = serializers.ListField(child=serializers.CharField(), required=False)
    dietary_info = serializers.ListField(child=serializers.CharField(), required=False)
    preparation_time_minutes = serializers.IntegerField(required=False, allow_null=True)
    is_available = serializers.BooleanField(default=True)
    image_urls = serializers.ListField(child=serializers.CharField(), required=False)
    portion_size = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    spiciness_level = serializers.IntegerField(required=False, allow_null=True)
    calories = serializers.IntegerField(required=False, allow_null=True)
    display_order = serializers.IntegerField(default=0)
    created_at = serializers.CharField(required=False)
    updated_at = serializers.CharField(required=False)


class RestaurantReservationSerializer(serializers.Serializer):
    id = serializers.CharField(required=False)
    restaurant_id = serializers.CharField(required=False)
    customer_name = serializers.CharField(max_length=255)
    customer_email = serializers.EmailField()
    customer_phone = serializers.CharField(max_length=64, required=False, allow_blank=True, allow_null=True)
    reservation_date = serializers.CharField()
    reservation_time = serializers.CharField()
    party_size = serializers.IntegerField(min_value=1)
    status = serializers.ChoiceField(choices=['pending', 'confirmed', 'cancelled', 'completed', 'no_show'])
    special_requests = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    table_preferences = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    total_amount = serializers.FloatField(required=False, allow_null=True)
    deposit_amount = serializers.FloatField(required=False, allow_null=True)
    cancellation_reason = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    created_at = serializers.CharField(required=False)
    updated_at = serializers.CharField(required=False)


class RestaurantOperatingHoursSerializer(serializers.Serializer):
    id = serializers.CharField(required=False)
    restaurant_id = serializers.CharField(required=False)
    day_of_week = serializers.IntegerField(min_value=0, max_value=6)
    open_time = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    close_time = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    is_closed = serializers.BooleanField(default=False)
    break_start = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    break_end = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    last_order_time = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    service_type = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    created_at = serializers.CharField(required=False)
    updated_at = serializers.CharField(required=False)


class RestaurantTableSerializer(serializers.Serializer):
    id = serializers.CharField(required=False)
    restaurant_id = serializers.CharField(required=False)
    table_number = serializers.CharField(max_length=64)
    capacity = serializers.IntegerField(min_value=1)
    location = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    is_available = serializers.BooleanField(default=True)
    table_type = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    amenities = serializers.ListField(child=serializers.CharField(), required=False)
    created_at = serializers.CharField(required=False)
    updated_at = serializers.CharField(required=False)


class POIConversationMessageSerializer(serializers.ModelSerializer):
    sender_detail = UserSerializer(source='sender', read_only=True)

    class Meta:
        model = POIConversationMessage
        fields = [
            'id',
            'conversation',
            'sender',
            'sender_detail',
            'sender_type',
            'message_type',
            'content',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'sender', 'sender_type', 'created_at', 'updated_at', 'conversation', 'sender_detail')


class POIConversationSerializer(serializers.ModelSerializer):
    tourist_point = serializers.PrimaryKeyRelatedField(queryset=TouristPoint.objects.all(), write_only=True)
    tourist_point_id = serializers.UUIDField(source='tourist_point.id', read_only=True)
    tourist_point_name = serializers.CharField(source='tourist_point.name', read_only=True)

    class Meta:
        model = POIConversation
        fields = [
            'id',
            'tourist_point',
            'tourist_point_id',
            'tourist_point_name',
            'is_active',
            'last_message_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'tourist_point_id', 'tourist_point_name', 'last_message_at', 'created_at', 'updated_at')


class TouristPointReviewSerializer(serializers.ModelSerializer):
    reviewer_detail = UserSerializer(source='reviewer', read_only=True)
    tourist_point_name = serializers.CharField(source='tourist_point.name', read_only=True)

    class Meta:
        model = TouristPointReview
        fields = [
            'id',
            'tourist_point',
            'tourist_point_name',
            'reviewer',
            'reviewer_detail',
            'rating',
            'comment',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'reviewer', 'reviewer_detail', 'tourist_point_name', 'created_at', 'updated_at')

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError('Le rating doit être entre 1 et 5')
        return value

    def create(self, validated_data):
        validated_data['reviewer'] = self.context['request'].user
        return super().create(validated_data)
