import { useState, useEffect } from "react";
import { storyService, Story } from "@/services/storyService";
import { InteractiveInspireMap } from "@/components/inspire/InteractiveInspireMap";
import { StoryCard } from "./StoryCard";
import { MapPin, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { POI } from "@/services/poiService";

interface MapTabProps {
  currentUserId?: string | number;
  onLike: (storyId: Story['id'], isLiked: boolean) => void;
  onComment: (storyId: Story['id'], title: string) => void;
  onBookmark: (storyId: Story['id'], isBookmarked: boolean) => void;
}

export const MapTab = ({ currentUserId, onLike, onComment, onBookmark }: MapTabProps) => {
  const [mapStories, setMapStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 48.8566, lon: 2.3522 });
  const [showList, setShowList] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMapStories = async () => {
    try {
      setLoading(true);
      const data = await storyService.fetchStories({
        has_location: true,
        sort: 'newest',
        limit: 100,
      });
      setMapStories(data);
    } catch (error) {
      console.error('Erreur lors du chargement des histoires géolocalisées:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapStories();
  }, []);

  // Convert stories to POI format for the map
  const handlePOISelect = (poi: POI) => {
    const story = mapStories.find(s => s.id === poi.id);
    if (story) {
      setSelectedStory(story);
      setShowList(true);
      const lat = Number(story.location_lat);
      const lon = Number(story.location_lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        setMapCenter({ lat, lon });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Carte interactive</h2>
        </div>
        
        <Button
          variant={showList ? "default" : "outline"}
          size="sm"
          onClick={() => setShowList(!showList)}
        >
          <MapPin className="h-4 w-4 mr-1" />
          {showList ? 'Masquer la liste' : 'Voir la liste'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[600px] rounded-lg overflow-hidden">
          <InteractiveInspireMap
            centerLat={mapCenter.lat}
            centerLon={mapCenter.lon}
            radiusKm={100}
            onPOISelect={handlePOISelect}
            // Pass story POIs instead of regular POIs
          />
        </div>

        {showList && (
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            <h3 className="font-semibold text-lg">
              Histoires géolocalisées ({mapStories.length})
            </h3>
            
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Chargement...</div>
            ) : mapStories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune histoire géolocalisée trouvée
              </div>
            ) : (
              mapStories.map((story) => (
                <div 
                  key={story.id} 
                  className={`cursor-pointer transition-all ${
                    selectedStory?.id === story.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedStory(story);
                    const lat = Number(story.location_lat);
                    const lon = Number(story.location_lon);
                    if (Number.isFinite(lat) && Number.isFinite(lon)) {
                      setMapCenter({ lat, lon });
                    }
                  }}
                >
                    <StoryCard
                      story={story}
                      currentUserId={currentUserId}
                      onLike={onLike}
                      onComment={(storyId) => onComment(storyId, story.title)}
                      onBookmark={onBookmark}
                    />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
