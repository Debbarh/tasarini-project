import { useState, useEffect } from "react";
import { StoryCard } from "./StoryCard";
import { TrendingUp, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { storyService, Story } from "@/services/storyService";

interface TrendingTabProps {
  currentUserId?: string | number;
  onLike: (storyId: Story['id'], isLiked: boolean) => void;
  onComment: (storyId: Story['id'], title: string) => void;
  onBookmark: (storyId: Story['id'], isBookmarked: boolean) => void;
}

export const TrendingTab = ({ currentUserId, onLike, onComment, onBookmark }: TrendingTabProps) => {
  const [trendingStories, setTrendingStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');

  const fetchTrendingStories = async () => {
    try {
      setLoading(true);
      const days = timeframe === 'day' ? 1 : timeframe === 'week' ? 7 : 30;
      const data = await storyService.fetchTrendingStories(days);
      setTrendingStories(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des tendances:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingStories();
  }, [timeframe]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Tendances</h2>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={timeframe === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('day')}
          >
            <Clock className="h-4 w-4 mr-1" />
            24h
          </Button>
          <Button
            variant={timeframe === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('week')}
          >
            7j
          </Button>
          <Button
            variant={timeframe === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('month')}
          >
            30j
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Chargement des tendances...
        </div>
      ) : trendingStories.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Aucune tendance trouvée pour cette période
        </div>
      ) : (
        <div className="space-y-4">
          {trendingStories.map((story, index) => (
            <div key={story.id} className="relative">
              {index < 3 && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-2 -left-2 z-10 bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                >
                  #{index + 1}
                </Badge>
              )}
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
