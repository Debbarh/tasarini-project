from __future__ import annotations

from datetime import timedelta

from django.db.models import Count, F, Q, Sum
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AdvertisementSetting,
    DiscoveryItinerary,
    SavedItinerary,
    Story,
    StoryBookmark,
    StoryComment,
    StoryLike,
)
from .serializers import (
    AdvertisementSettingSerializer,
    DiscoveryItinerarySerializer,
    SavedItinerarySerializer,
    StoryCommentSerializer,
    StorySerializer,
)


class StoryViewSet(viewsets.ModelViewSet):
    serializer_class = StorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ['is_public', 'story_type', 'is_featured']
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'published_at', 'likes_count']

    def get_queryset(self):  # type: ignore[override]
        qs = (
            Story.objects.select_related('author', 'tourist_point')
            .prefetch_related('media', 'comments', 'links')
        )

        request = getattr(self, 'request', None)
        if not request:
            return qs

        params = request.query_params
        days_param = params.get('days')
        if days_param:
            try:
                days = int(days_param)
                since = timezone.now() - timedelta(days=days)
                qs = qs.filter(created_at__gte=since)
            except ValueError:
                pass

        user = request.user
        mine = params.get('mine')
        wants_own_stories = mine and mine.lower() in ('1', 'true', 'yes')

        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            if wants_own_stories and user.is_authenticated:
                qs = qs.filter(author=user)
            else:
                qs = qs.filter(is_public=True)
        else:
            if user.is_staff:
                pass
            else:
                qs = qs.filter(author=user)

        search = params.get('search')
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(content__icontains=search))

        location = params.get('location')
        if location:
            qs = qs.filter(location_name__icontains=location)

        date_from = params.get('date_from')
        if date_from:
            qs = qs.filter(trip_date__gte=date_from)

        date_to = params.get('date_to')
        if date_to:
            qs = qs.filter(trip_date__lte=date_to)

        tags = params.get('tags')
        if tags:
            tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()]
            for tag in tag_list:
                qs = qs.filter(tags__contains=[tag])

        linked_type = params.get('linked_type')
        if linked_type:
            qs = qs.filter(links__linked_type=linked_type).distinct()

        story_type = params.get('story_type')
        if story_type:
            qs = qs.filter(story_type=story_type)

        has_location = params.get('has_location')
        if has_location and has_location.lower() in ('1', 'true', 'yes'):
            qs = qs.exclude(location_lat__isnull=True).exclude(location_lon__isnull=True)

        ordering = params.get('ordering') or params.get('sort')
        if ordering == 'popular':
            qs = qs.order_by('-likes_count', '-comments_count', '-created_at')
        elif ordering == 'most_liked':
            qs = qs.order_by('-likes_count', '-created_at')
        elif ordering == 'most_commented':
            qs = qs.order_by('-comments_count', '-created_at')
        elif ordering == 'newest':
            qs = qs.order_by('-created_at')
        elif ordering:
            qs = qs.order_by(ordering)

        limit = params.get('limit')
        if limit:
            try:
                limit_value = max(int(limit), 0)
                if limit_value:
                    qs = qs[:limit_value]
            except ValueError:
                pass

        return qs

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(author=self.request.user)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def trending(self, request):
        days = request.query_params.get('days', '7')
        try:
            days_int = int(days)
        except ValueError:
            days_int = 7
        since = timezone.now() - timedelta(days=days_int)
        qs = self.get_queryset().filter(created_at__gte=since)
        stories = []
        for story in qs:
            engagement = story.likes_count * 3 + story.comments_count * 5 + story.views_count * 0.1
            stories.append((engagement, story))
        stories.sort(key=lambda item: item[0], reverse=True)
        top_stories = [story for _, story in stories[:20]]
        serializer = self.get_serializer(top_stories, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'], permission_classes=[permissions.IsAuthenticated], url_path='like')
    def like(self, request, pk=None):
        story = self.get_object()
        if request.method == 'GET':
            liked = StoryLike.objects.filter(story=story, user=request.user).exists()
            return Response({'liked': liked, 'likes_count': StoryLike.objects.filter(story=story).count()})

        like, created = StoryLike.objects.get_or_create(story=story, user=request.user)
        if not created:
            like.delete()
            liked = False
        else:
            liked = True
        likes_count = StoryLike.objects.filter(story=story).count()
        story.likes_count = likes_count
        story.save(update_fields=['likes_count'])
        return Response({'liked': liked, 'likes_count': likes_count})

    @action(detail=True, methods=['get', 'post'], permission_classes=[permissions.IsAuthenticated], url_path='bookmark')
    def bookmark(self, request, pk=None):
        story = self.get_object()
        if request.method == 'GET':
            bookmarked = StoryBookmark.objects.filter(story=story, user=request.user).exists()
            return Response({'bookmarked': bookmarked})

        bookmark, created = StoryBookmark.objects.get_or_create(story=story, user=request.user)
        if not created:
            bookmark.delete()
            bookmarked = False
        else:
            bookmarked = True
        return Response({'bookmarked': bookmarked})

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated], url_path='stats')
    def stats(self, request):
        qs = Story.objects.filter(author=request.user)
        stories_count = qs.count()
        total_likes = qs.aggregate(total=Sum('likes_count'))['total'] or 0
        countries_visited = (
            qs.exclude(location_name__isnull=True)
            .exclude(location_name='')
            .values_list('location_name', flat=True)
            .distinct()
            .count()
        )
        data = {
            'stories_count': stories_count,
            'followers_count': 0,
            'following_count': 0,
            'countries_visited': countries_visited,
            'total_likes': total_likes,
        }
        return Response(data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated], url_path='recommendations')
    def recommendations(self, request):
        liked_story_ids = list(StoryLike.objects.filter(user=request.user).values_list('story_id', flat=True))
        base_queryset = self.get_queryset().exclude(author=request.user)

        if liked_story_ids:
            liked_stories = Story.objects.filter(id__in=liked_story_ids)
            user_tags = {tag.lower() for story in liked_stories for tag in (story.tags or [])}
            user_locations = {
                story.location_name.lower()
                for story in liked_stories
                if story.location_name
            }

            candidate_qs = base_queryset.exclude(id__in=liked_story_ids)[:200]
            scored = []
            for story in candidate_qs:
                score = 0.0
                if story.tags:
                    story_tags = {tag.lower() for tag in story.tags}
                    score += 3 * len(user_tags.intersection(story_tags))
                if story.location_name and story.location_name.lower() in user_locations:
                    score += 5
                score += story.likes_count * 0.1 + story.comments_count * 0.2
                if score > 0:
                    scored.append((score, story))

            if scored:
                scored.sort(key=lambda item: item[0], reverse=True)
                recommended_stories = [story for _, story in scored[:10]]
            else:
                recommended_stories = list(candidate_qs.order_by('-likes_count', '-created_at')[:10])
        else:
            recommended_stories = list(base_queryset.filter(is_featured=True)[:10])
            if not recommended_stories:
                recommended_stories = list(base_queryset.order_by('-likes_count', '-created_at')[:10])

        serializer = self.get_serializer(recommended_stories, many=True)
        return Response(serializer.data)


class DiscoveryItineraryViewSet(viewsets.ModelViewSet):
    serializer_class = DiscoveryItinerarySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):  # type: ignore[override]
        qs = DiscoveryItinerary.objects.select_related('user').order_by('-created_at')
        request = getattr(self, 'request', None)
        if not request:
            return qs.none()

        params = request.query_params
        search = params.get('search')
        difficulty = params.get('difficulty')
        mine = params.get('mine')
        public_only = params.get('public')

        truthy = {'1', 'true', 'yes', 'on'}
        user = request.user

        if request.method in permissions.SAFE_METHODS:
            if mine and mine.lower() in truthy and user.is_authenticated:
                qs = qs.filter(user=user)
            elif public_only and public_only.lower() in truthy:
                qs = qs.filter(is_public=True)
            elif user.is_authenticated:
                qs = qs.filter(Q(is_public=True) | Q(user=user))
            else:
                qs = qs.filter(is_public=True)
        else:
            qs = qs.filter(user=user)

        if search:
            qs = qs.filter(title__icontains=search)

        if difficulty:
            qs = qs.filter(difficulty_level=difficulty)

        limit = params.get('limit')
        if limit:
            try:
                limit_value = max(int(limit), 0)
                if limit_value:
                    qs = qs[:limit_value]
            except ValueError:
                pass

        return qs

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):  # type: ignore[override]
        instance = self.get_object()
        if instance.user != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied('Vous ne pouvez modifier que vos itinéraires.')
        serializer.save()

    def perform_destroy(self, instance):  # type: ignore[override]
        if instance.user != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied('Vous ne pouvez supprimer que vos itinéraires.')
        instance.delete()


class SavedItineraryViewSet(viewsets.ModelViewSet):
    serializer_class = SavedItinerarySerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):  # type: ignore[override]
        qs = SavedItinerary.objects.filter(user=self.request.user).order_by('-created_at')
        params = self.request.query_params
        favorite = params.get('favorite')
        search = params.get('search')
        if favorite and favorite.lower() in {'1', 'true', 'yes'}:
            qs = qs.filter(is_favorite=True)
        if search:
            qs = qs.filter(title__icontains=search)
        limit = params.get('limit')
        if limit:
            try:
                limit_value = max(int(limit), 0)
                if limit_value:
                    qs = qs[:limit_value]
            except ValueError:
                pass
        return qs

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(user=self.request.user)

class StoryGenerationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        mode = request.data.get('mode', 'prompt')
        if mode == 'itinerary':
            itinerary = request.data.get('itinerary') or {}
            payload = self._from_itinerary(itinerary)
        else:
            prompt = request.data.get('prompt') or ''
            payload = self._from_prompt(prompt)
        return Response(payload)

    def _from_itinerary(self, itinerary: dict):
        title = itinerary.get('title') or 'Carnet de voyage'
        trip = itinerary.get('itinerary_data') or itinerary
        trip_obj = trip.get('trip') if isinstance(trip, dict) else {}
        destinations = trip_obj.get('destinations') if isinstance(trip_obj, dict) else trip.get('destinations', [])
        destination_names = []
        if isinstance(destinations, list):
            for dest in destinations:
                city = dest.get('city') or dest.get('country')
                if city:
                    destination_names.append(city)
        summary = ', '.join(destination_names[:3]) if destination_names else 'vos points d’intérêt favoris'
        paragraphs = [
            f"{title} commence par {summary}. Chaque étape met en avant une ambiance différente entre découvertes locales et pauses gourmandes.",
            "Les rencontres avec les artisans, les balades matinales et les dégustations improvisées ponctuent ce séjour.",
            "En fin de journée, prenez le temps d'écrire quelques lignes pour graver ces souvenirs chaleureux.",
        ]
        tags = [name.split()[0] for name in destination_names[:3]] if destination_names else ['voyage', 'inspiration']
        location = destination_names[0] if destination_names else 'Destination secrète'
        return {
            'title': title,
            'content': '\n\n'.join(paragraphs),
            'tags': tags,
            'location': location,
        }

    def _from_prompt(self, prompt: str):
        clean_prompt = prompt.strip() or 'une escapade créative'
        title = f"Inspiration : {clean_prompt[:40]}".rstrip()
        paragraphs = [
            f"Vous rêvez de {clean_prompt}? Voici une version romancée de cette aventure.",
            "Commencez par explorer les ruelles où l'on entend encore les récits des habitants. "
            "Laissez-vous guider par les senteurs, les musiques et les sourires rencontrés.",
            "Terminez par un coucher de soleil qui colore les façades et promet de nouvelles escapades.",
        ]
        tags = ['story', 'ai', 'voyage']
        return {'title': title, 'content': '\n\n'.join(paragraphs), 'tags': tags, 'location': 'À personnaliser'}


class StoryCommentViewSet(viewsets.ModelViewSet):
    serializer_class = StoryCommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ['story']
    ordering = ['created_at']

    def get_queryset(self):  # type: ignore[override]
        return StoryComment.objects.select_related('author', 'story')

    def perform_create(self, serializer):  # type: ignore[override]
        comment = serializer.save(author=self.request.user)
        Story.objects.filter(pk=comment.story_id).update(comments_count=F('comments_count') + 1)

    def perform_destroy(self, instance):  # type: ignore[override]
        story_id = instance.story_id
        super().perform_destroy(instance)
        Story.objects.filter(pk=story_id, comments_count__gt=0).update(comments_count=F('comments_count') - 1)


class AdvertisementSettingViewSet(viewsets.ModelViewSet):
    serializer_class = AdvertisementSettingSerializer
    queryset = AdvertisementSetting.objects.all().order_by('-created_at')

    def get_permissions(self):  # type: ignore[override]
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]
