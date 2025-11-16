import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Eye, MapPin, Calendar, ExternalLink, Bookmark, Verified, Award, Star, Sparkles } from "lucide-react";
import { MediaCarousel } from "@/components/media/MediaCarousel";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { storyService, Story } from "@/services/storyService";
import { toast } from "sonner";

interface EnhancedStoryCardProps {
  story: Story;
  currentUserId?: string | number;
  onLike: (storyId: Story['id'], isLiked: boolean) => void;
  onComment?: (storyId: Story['id']) => void;
  onBookmark?: (storyId: Story['id'], isBookmarked: boolean) => void;
}

export const EnhancedStoryCard = ({ story, currentUserId, onLike, onComment, onBookmark }: EnhancedStoryCardProps) => {
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
      toast.error('Connectez-vous pour aimer cette story');
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

  const authorName = story.author_name || 'Voyageur';
  const authorInitials = authorName
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'V';

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
      case 'accommodation': return 'Hébergement';
      case 'restaurant': return 'Restaurant';
      default: return type;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-secondary/20">
                {authorInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-1">
                  <p className="font-medium text-sm">{authorName}</p>
                  {story.is_verified && (
                    <Verified className="h-4 w-4 text-primary" />
                  )}
                </div>
                {getStoryTypeIcon() && (
                  <span className="text-xs">{getStoryTypeIcon()}</span>
                )}
              </div>
              {story.is_featured && (
                <Badge variant="secondary" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Vedette
                </Badge>
              )}
            </div>
          </div>
          {storyType === 'ai_generated' && (
            <Badge variant="outline" className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
              <Sparkles className="h-3 w-3 mr-1" />
              IA
            </Badge>
          )}
        </div>
        
        <h3 className="font-semibold text-lg mt-2 line-clamp-2">{story.title}</h3>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Rich Media Content */}
        {(story.media_images?.length || story.media_videos?.length) ? (
          <MediaCarousel 
            images={story.media_images || []}
            videos={story.media_videos || []}
            showThumbnails={true}
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

        {/* Tags et entités liées */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Catégories d'activités */}
          {story.activity_categories?.map((category) => (
            <Badge key={category} variant="default" className="text-xs">
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
          {story.tags?.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              #{tag}
            </Badge>
          ))}
          
          {story.travel_story_links?.map((link) => (
            <Badge 
              key={`${link.linked_type}-${link.linked_id}`} 
              variant="outline" 
              className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Naviguer vers le POI/hébergement lié
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              {getLinkedTypeLabel(link.linked_type)}
            </Badge>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
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

        <div className="pt-2 text-xs text-muted-foreground">
          {format(new Date(story.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
        </div>
      </CardContent>
    </Card>
  );
};
