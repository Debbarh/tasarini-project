import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Eye, MapPin, Calendar, ExternalLink, Bookmark, Verified, Award, Star } from "lucide-react";
import { MediaCarousel } from "@/components/media/MediaCarousel";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { storyService, Story } from "@/services/storyService";
import { toast } from "sonner";

interface StoryCardProps {
  story: Story;
  currentUserId?: string | number;
  onLike: (storyId: Story['id'], isLiked: boolean) => void;
  onComment?: (storyId: Story['id']) => void;
  onBookmark?: (storyId: Story['id'], isBookmarked: boolean) => void;
}

export const StoryCard = ({ story, currentUserId, onLike, onComment, onBookmark }: StoryCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const storyType = (story.story_type as 'user' | 'ai_generated' | 'partner_sponsored') || 'user';

  useEffect(() => {
    if (!currentUserId) return;
    const fetchStatuses = async () => {
      try {
        const likeStatus = await storyService.getLikeStatus(story.id);
        setIsLiked(likeStatus.liked);
        const bookmarkStatus = await storyService.getBookmarkStatus(story.id);
        setIsBookmarked(bookmarkStatus.bookmarked);
      } catch (error) {
        setIsLiked(false);
        setIsBookmarked(false);
      }
    };
    fetchStatuses();
  }, [story.id, currentUserId]);

  const handleLikeClick = async () => {
    if (!currentUserId) {
      toast.error('Connectez-vous pour liker les stories');
      return;
    }
    try {
      const result = await storyService.toggleLike(story.id);
      setIsLiked(result.liked);
      onLike(story.id, result.liked);
    } catch (error) {
      toast.error('Impossible de modifier le like');
    }
  };

  const authorName = story.author_name || 'Voyageur';
  const authorInitials = authorName
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'V';

  const handleBookmarkClick = async () => {
    if (!onBookmark || !currentUserId) {
      toast.error('Connectez-vous pour enregistrer des stories');
      return;
    }
    try {
      const result = await storyService.toggleBookmark(story.id);
      setIsBookmarked(result.bookmarked);
      onBookmark(story.id, result.bookmarked);
    } catch (error) {
      toast.error('Impossible de mettre à jour le signet');
    }
  };

  const handleCommentClick = () => {
    if (onComment) {
      onComment(story.id);
    }
  };

  const getStoryTypeIcon = () => {
    switch (storyType) {
      case 'ai_generated':
        return '🤖';
      case 'partner_sponsored':
        return '💼';
      default:
        return '';
    }
  };

  const getLinkedTypeLabel = (type: string) => {
    switch (type) {
      case 'tourist_point': return 'Point d\'intérêt';
      case 'itinerary': return 'Itinéraire';
      case 'activity': return 'Activité';
      default: return type;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="text-sm">
                {authorInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold line-clamp-1">{story.title}</h3>
                {getStoryTypeIcon() && (
                  <span className="text-sm">{getStoryTypeIcon()}</span>
                )}
                {storyType === 'partner_sponsored' && (
                  <Verified className="w-4 h-4 text-blue-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                par {authorName}
              </p>
            </div>
          </div>
          {!story.is_public && (
            <Badge variant="secondary" className="text-xs">
              Privé
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Media content */}
        {(story.media_images?.length || story.media_videos?.length) ? (
          <MediaCarousel 
            images={story.media_images || []}
            videos={story.media_videos || []}
            className="mb-4"
          />
        ) : null}

        {/* Content preview */}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {story.content}
        </p>

        {/* Location and date */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {story.location_name && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span className="truncate">{story.location_name}</span>
            </div>
          )}
          
          {story.trip_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(story.trip_date), "MMM yyyy", { locale: fr })}</span>
            </div>
          )}
        </div>

        {/* Tags et catégories */}
        <div className="flex flex-wrap gap-1">
          {/* Catégories d'activités */}
          {story.activity_categories?.slice(0, 2).map((category, index) => (
            <Badge key={index} variant="default" className="text-xs">
              {category}
            </Badge>
          ))}
          
          {/* Niveau d'intensité */}
          {story.intensity_level && (
            <Badge variant="secondary" className="text-xs">
              {story.intensity_level}
            </Badge>
          )}
          
          {/* Tags personnalisés */}
          {story.tags?.slice(0, 2).map((tag, index) => (
            <Badge key={`tag-${index}`} variant="outline" className="text-xs">
              #{tag}
            </Badge>
          ))}
          
          {/* Indicateur de tags supplémentaires */}
          {(story.activity_categories?.length > 2 || story.tags?.length > 2) && (
            <Badge variant="outline" className="text-xs">
              +{(story.activity_categories?.length || 0) + (story.tags?.length || 0) - 4}
            </Badge>
          )}
        </div>

        {/* Linked entities */}
        {story.travel_story_links && story.travel_story_links.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {story.travel_story_links.slice(0, 2).map((link, index) => (
              <Badge key={index} variant="secondary" className="text-xs flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                {getLinkedTypeLabel(link.linked_type)}
              </Badge>
            ))}
            {story.travel_story_links.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{story.travel_story_links.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLikeClick}
              disabled={!currentUserId}
              className={`gap-1 ${isLiked ? 'text-red-500' : ''}`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              <span>{story.likes_count}</span>
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1"
              onClick={handleCommentClick}
              disabled={!currentUserId}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{story.comments_count}</span>
            </Button>

            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Eye className="w-4 h-4" />
              <span>{story.views_count}</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleBookmarkClick}
            disabled={!currentUserId}
            className={`${isBookmarked ? 'text-yellow-500' : ''}`}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </Button>
        </div>

        <div className="pt-2">
          <div className="text-xs text-muted-foreground">
            {format(new Date(story.created_at), "dd MMM", { locale: fr })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
