import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Calendar, ArrowLeft, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { storyService, Story } from "@/services/storyService";
import { MediaCarousel } from "@/components/media/MediaCarousel";
import { toast } from "sonner";

const StoryDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(false);

  // Build author display text from first and last name if available
  const getAuthorDisplayText = (story: Story | null) => {
    if (!story) return '';

    const firstName = story.author_first_name?.trim() || '';
    const lastName = story.author_last_name?.trim() || '';
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : '';

    const authorName = fullName || (story.author_name && story.author_name.trim()) || 'Voyageur';
    return fullName || (story.author_name && story.author_name.trim())
      ? `par ${authorName}`
      : 'Créé par voyageur';
  };

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await storyService.fetchStory(id);
        setStory(data);
      } catch (error) {
        console.error("Erreur lors du chargement de la story:", error);
        toast.error(t("travelStories.toast.errorLoading"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, t]);

  if (!id) {
    return (
      <main className="container mx-auto px-4 py-6">
        <p className="text-muted-foreground">Story introuvable.</p>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6 space-y-4">
      <Helmet>
        <title>{story ? story.title : t("travelStories.title")}</title>
      </Helmet>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t("common.back", "Retour")}
        </Button>
        {story && story.story_type === "ai_generated" && (
          <Badge variant="outline" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
            🤖 IA
          </Badge>
        )}
        {story && story.is_featured && (
          <Badge variant="secondary">{t("travelStories.labels.featured", "Mis en avant")}</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{story?.title || t("travelStories.title")}</CardTitle>
          {story && (
            <p className="text-sm text-muted-foreground">
              {getAuthorDisplayText(story)}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {story?.media_images?.length || story?.media_videos?.length ? (
            <MediaCarousel
              images={story.media_images || []}
              videos={story.media_videos || []}
              showThumbnails
            />
          ) : null}

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {story?.location_name && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{story.location_name}</span>
              </div>
            )}
            {story?.trip_date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(story.trip_date), "PPP", { locale: fr })}</span>
              </div>
            )}
          </div>

          {story?.tags && story.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {story.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {story?.travel_story_links && story.travel_story_links.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {story.travel_story_links.map((link) => (
                <Badge key={`${link.linked_type}-${link.linked_id}`} variant="secondary" className="flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  {link.linked_type}
                </Badge>
              ))}
            </div>
          )}

          <Separator />

          <div className="prose prose-sm sm:prose max-w-none text-foreground whitespace-pre-line">
            {story?.content}
          </div>
        </CardContent>
      </Card>
      {loading && <p className="text-muted-foreground text-sm">{t("travelStories.toast.loading", "Chargement...")}</p>}
    </main>
  );
};

export default StoryDetails;
