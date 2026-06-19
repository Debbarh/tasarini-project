import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Eye, MapPin, Calendar, ExternalLink, Bookmark, Verified, Award, Star, Bot, Briefcase } from "lucide-react";
import { MediaCarousel } from "@/components/media/MediaCarousel";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { storyService, Story } from "@/services/storyService";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

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
  // Gardes : ces champs peuvent arriver non-tableau (null/chaîne) → éviter .map crash
  const categories = Array.isArray(story.activity_categories) ? story.activity_categories : [];
  const storyTags = Array.isArray(story.tags) ? story.tags : [];
  const storyLinks = Array.isArray(story.travel_story_links) ? story.travel_story_links : [];
  const storyType = (story.story_type as 'user' | 'ai_generated' | 'partner_sponsored') || 'user';
  const navigate = useNavigate();
  const { t } = useTranslation();

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
      toast.error(t('travelStories.card.loginToLike', 'Connectez-vous pour liker les stories'));
      return;
    }
    try {
      const result = await storyService.toggleLike(story.id);
      setIsLiked(result.liked);
      onLike(story.id, result.liked);
    } catch (error) {
      toast.error(t('travelStories.card.likeError', 'Impossible de modifier le like'));
    }
  };

  // Build author display name from first and last name if available
  const firstName = story.author_first_name?.trim() || '';
  const lastName = story.author_last_name?.trim() || '';
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : '';

  const authorName = fullName || (story.author_name && story.author_name.trim()) || 'Voyageur';
  const displayText = fullName || (story.author_name && story.author_name.trim()) ? `par ${authorName}` : t('travelStories.card.authorFallback', 'Créé par voyageur');

  const authorInitials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : authorName
        .split(' ')
        .map(part => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'V';

  const handleBookmarkClick = async () => {
    if (!onBookmark || !currentUserId) {
      toast.error(t('travelStories.card.loginToBookmark', 'Connectez-vous pour enregistrer des stories'));
      return;
    }
    try {
      const result = await storyService.toggleBookmark(story.id);
      setIsBookmarked(result.bookmarked);
      onBookmark(story.id, result.bookmarked);
    } catch (error) {
      toast.error(t('travelStories.card.bookmarkError', 'Impossible de mettre à jour le signet'));
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
        return Bot;
      case 'partner_sponsored':
        return Briefcase;
      default:
        return null;
    }
  };
  const StoryTypeIcon = getStoryTypeIcon();

  const getLinkedTypeLabel = (type: string) => {
    switch (type) {
      case 'tourist_point': return t('travelStories.card.linkTypes.touristPoint', 'Point d\'intérêt');
      case 'itinerary': return t('travelStories.card.linkTypes.itinerary', 'Itinéraire');
      case 'activity': return t('travelStories.card.linkTypes.activity', 'Activité');
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
                {StoryTypeIcon && (
                  <StoryTypeIcon className="w-4 h-4 text-muted-foreground" />
                )}
                {storyType === 'partner_sponsored' && (
                  <Verified className="w-4 h-4 text-blue-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {displayText}
              </p>
            </div>
          </div>
          {!story.is_public && (
            <Badge variant="secondary" className="text-xs">
              {t('travelStories.card.private', 'Privé')}
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
          {categories.slice(0, 2).map((category, index) => (
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
          {storyTags.slice(0, 2).map((tag, index) => (
            <Badge key={`tag-${index}`} variant="outline" className="text-xs">
              #{tag}
            </Badge>
          ))}

          {/* Indicateur de tags supplémentaires */}
          {(categories.length > 2 || storyTags.length > 2) && (
            <Badge variant="outline" className="text-xs">
              +{categories.length + storyTags.length - 4}
            </Badge>
          )}
        </div>

        {/* Linked entities */}
        {storyLinks.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {storyLinks.slice(0, 2).map((link, index) => (
              <Badge key={index} variant="secondary" className="text-xs flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                {getLinkedTypeLabel(link.linked_type)}
              </Badge>
            ))}
            {storyLinks.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{storyLinks.length - 2}
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

        <div className="pt-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => navigate(`/travel-stories/${story.id}`)}>
            <ExternalLink className="w-4 h-4 mr-1" />
            {t('travelStories.card.viewDetails', 'Voir les détails')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
