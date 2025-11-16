import { useState, useEffect } from "react";
import { StoryCard } from "./StoryCard";
import { Sparkles, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { storyService, Story } from "@/services/storyService";
import { toast } from "sonner";

interface AIRecommendationsTabProps {
  currentUserId?: string | number;
  onLike: (storyId: Story['id'], isLiked: boolean) => void;
  onComment: (storyId: Story['id'], title: string) => void;
  onBookmark: (storyId: Story['id'], isBookmarked: boolean) => void;
}

export const AIRecommendationsTab = ({ currentUserId, onLike, onComment, onBookmark }: AIRecommendationsTabProps) => {
  const [recommendations, setRecommendations] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAIRecommendations = async () => {
    if (!currentUserId) return;
    
    try {
      setLoading(true);
      const data = await storyService.fetchRecommendations();
      setRecommendations(data);
    } catch (error) {
      console.error('Erreur lors du chargement des recommandations:', error);
      toast.error('Impossible de charger les recommandations pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIRecommendations();
  }, [currentUserId]);

  if (!currentUserId) {
    return (
      <div className="text-center py-8">
        <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          Connectez-vous pour voir vos recommandations personnalisées
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Recommandations IA</h2>
        <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          Personnalisé
        </Badge>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          <Brain className="h-8 w-8 animate-pulse mx-auto mb-2" />
          Analyse de vos préférences...
        </div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Aimez quelques histoires pour recevoir des recommandations personnalisées !</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((story) => (
            <div key={story.id} className="relative">
              <Badge 
                variant="outline" 
                className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Recommandé
              </Badge>
              <StoryCard
                story={story}
                currentUserId={currentUserId}
                onLike={onLike}
                onComment={(storyId) => onComment(storyId, story.title)}
                onBookmark={onBookmark}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
