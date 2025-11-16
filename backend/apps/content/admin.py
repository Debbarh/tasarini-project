from django.contrib import admin

from .models import Story, StoryComment, StoryMedia


class StoryMediaInline(admin.TabularInline):
    model = StoryMedia
    extra = 0


@admin.register(Story)
class StoryAdmin(admin.ModelAdmin):
    inlines = [StoryMediaInline]
    list_display = ('title', 'author', 'is_public', 'is_featured', 'published_at')
    list_filter = ('is_public', 'is_featured', 'story_type')
    search_fields = ('title', 'author__username')


@admin.register(StoryComment)
class StoryCommentAdmin(admin.ModelAdmin):
    list_display = ('story', 'author', 'created_at')
    search_fields = ('story__title', 'author__username', 'content')


@admin.register(StoryMedia)
class StoryMediaAdmin(admin.ModelAdmin):
    list_display = ('story', 'caption')
