
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CommentsDialog } from "@/components/stories/CommentsDialog";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, Plus, Heart, Eye, MapPin, Users, TrendingUp, Clock, Globe, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { CreateSocialStoryDialog } from "@/components/stories/CreateSocialStoryDialog";
import { StoryCard } from "@/components/stories/StoryCard";
import { StoryFilters } from "@/components/stories/StoryFilters";
import { TrendingTab } from "@/components/stories/TrendingTab";
import { AIRecommendationsTab } from "@/components/stories/AIRecommendationsTab";
import { MapTab } from "@/components/stories/MapTab";
import { storyService, Story } from "@/services/storyService";

interface StoryFilterState {
  search: string;
  tags: string[];
  location: string;
  dateFrom?: string;
  dateTo?: string;
  linkedType?: string;
  storyType?: string;
  sortBy?: 'newest' | 'popular' | 'most_liked' | 'most_commented';
}

const TravelStories = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');
  const [userStats, setUserStats] = useState({
    stories_count: 0,
    followers_count: 0,
    following_count: 0,
    countries_visited: 0,
    total_likes: 0
  });
  
  const [filters, setFilters] = useState<StoryFilterState>({
    search: '',
    tags: [],
    location: '',
    linkedType: ''
  });
  const [showMyStories, setShowMyStories] = useState(false);
  const [selectedStoryForComments, setSelectedStoryForComments] = useState<{id: Story['id']; title: string} | null>(null);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const data = await storyService.fetchStories({
        search: filters.search || undefined,
        location: filters.location || undefined,
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        tags: filters.tags.length ? filters.tags : undefined,
        linked_type: filters.linkedType || undefined,
        story_type: filters.storyType || undefined,
        sort: filters.sortBy,
        mine: Boolean(showMyStories && user),
      });
      setStories(
        (data || []).map((story) => ({
          ...story,
          story_type: (story.story_type as 'user' | 'ai_generated' | 'partner_sponsored') || 'user',
          comments_count: story.comments_count || 0,
        }))
      );
    } catch (error) {
      console.error('Erreur lors du chargement des stories:', error);
      toast.error('Impossible de charger les travel stories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, [filters, showMyStories, user]);

  useEffect(() => {
    fetchUserStats();
  }, [user]);

  useEffect(() => {
    if (!user && showMyStories) {
      setShowMyStories(false);
    }
  }, [user, showMyStories]);

  const handleStoryCreated = () => {
    setIsCreateDialogOpen(false);
    fetchStories();
    toast.success('Votre travel story a été créée !');
  };

  const fetchUserStats = async () => {
    if (!user) return;
    try {
      const stats = await storyService.fetchStats();
      setUserStats(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleLike = (storyId: Story['id'], isLiked: boolean) => {
    setStories((prev) =>
      prev.map((story) =>
        story.id === storyId
          ? { ...story, likes_count: Math.max(0, story.likes_count + (isLiked ? 1 : -1)) }
          : story
      )
    );
  };

  const handleComment = (storyId: Story['id']) => {
    const story = stories.find(s => s.id === storyId);
    if (story) {
      setSelectedStoryForComments({ id: storyId, title: story.title });
    }
  };

  const handleBookmark = (_storyId: Story['id'], isBookmarked: boolean) => {
    if (!user) {
      toast.error('Connectez-vous pour sauvegarder les stories');
      return;
    }
    toast.success(isBookmarked ? 'Story ajoutée aux favoris' : 'Story retirée des favoris');
  };

  const handleFiltersChange = (newFilters: Partial<StoryFilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return (
    <main className="container mx-auto px-4 py-6 animate-fade-in">
      <Helmet>
        <title>Réseau Social de Voyage | Travel Stories</title>
        <meta name="description" content="Découvrez, partagez et vivez les plus belles aventures de voyage. Rejoignez notre communauté de voyageurs passionnés." />
        <link rel="canonical" href="/travel-stories" />
      </Helmet>

      {/* Header with user stats */}
      <div className="flex flex-col lg:flex-row items-start justify-between gap-6 mb-6">
        <div className="flex-1">
          <h1 className="mb-4 text-3xl font-bold flex items-center gap-3">
            <Globe className="w-8 h-8 text-primary" />
            <span>📖 Travel Stories Social</span>
          </h1>
          <p className="text-muted-foreground mb-4">
            Découvrez un monde d'aventures partagées. Créez, explorez et connectez-vous avec des voyageurs du monde entier.
          </p>
          
          {user && (
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>{userStats.stories_count} stories</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-primary" />
                <span>{userStats.followers_count} abonnés</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-primary" />
                <span>{userStats.total_likes} likes</span>
              </div>
              <div className="flex items-center gap-1">
                <Globe className="w-4 h-4 text-primary" />
                <span>{userStats.countries_visited} pays</span>
              </div>
            </div>
          )}
        </div>
        
        
        {user && (
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <Button
              variant={showMyStories ? 'default' : 'outline'}
              className="w-full lg:w-auto"
              onClick={() => setShowMyStories((prev) => !prev)}
            >
              {showMyStories ? 'Voir le feed public' : 'Voir mes stories'}
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="w-full lg:w-auto">
                  <Plus className="w-5 h-5 mr-2" />
                  ✍️ Partager mon voyage
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>✍️ Partagez votre aventure</DialogTitle>
                  <DialogDescription>
                    Créez une story qui inspirera la communauté de voyageurs
                  </DialogDescription>
                </DialogHeader>
                <CreateSocialStoryDialog
                  onStoryCreated={handleStoryCreated}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="feed" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Feed</span>
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Tendances</span>
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">Carte</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">IA</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-6">
          {/* Filtres */}
          <StoryFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            resultCount={stories.length}
            isLoading={loading}
          />

          {/* Stories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {loading ? (
          // Loading skeletons
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-5/6"></div>
                  <div className="h-3 bg-muted rounded w-4/6"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : stories.length === 0 ? (
          <div className="col-span-full text-center py-8 sm:py-12">
            <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">
              {showMyStories ? "✈️ Aucune de vos épopées" : "🌟 Aucune histoire découverte"}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 max-w-md mx-auto">
              {showMyStories 
                ? "Vous n'avez pas encore partagé vos aventures. Votre première histoire n'attend que vous !"
                : "Soyez le pionnier ! Partagez la première épopée qui inspirera toute la communauté."
              }
            </p>
            {user && (
              <Button onClick={() => setIsCreateDialogOpen(true)} size="sm" className="sm:size-default">
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">✍️ Raconter ma première épopée</span>
                <span className="sm:hidden">✍️ Commencer</span>
              </Button>
            )}
          </div>
        ) : (
            stories.map((story) => (
              <StoryCard
                key={story.id}
                story={{...story, comments_count: story.comments_count || 0}}
                currentUserId={user?.id}
                onLike={handleLike}
                onComment={handleComment}
                onBookmark={handleBookmark}
              />
            ))
          )}
          </div>
        </TabsContent>

        <TabsContent value="trending">
          <TrendingTab
            currentUserId={user?.id}
            onLike={handleLike}
            onComment={(storyId: Story['id'], title: string) => setSelectedStoryForComments({ id: storyId, title })}
            onBookmark={handleBookmark}
          />
        </TabsContent>

        <TabsContent value="map">
          <MapTab
            currentUserId={user?.id}
            onLike={handleLike}
            onComment={(storyId: Story['id'], title: string) => setSelectedStoryForComments({ id: storyId, title })}
            onBookmark={handleBookmark}
          />
        </TabsContent>

        <TabsContent value="ai">
          <AIRecommendationsTab
            currentUserId={user?.id}
            onLike={handleLike}
            onComment={(storyId: Story['id'], title: string) => setSelectedStoryForComments({ id: storyId, title })}
            onBookmark={handleBookmark}
          />
        </TabsContent>
      </Tabs>

      {/* Statistics */}
      {!loading && stories.length > 0 && activeTab === 'feed' && (
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span>{stories.length} épopées</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>{stories.reduce((acc, story) => acc + story.likes_count, 0)} likes</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{stories.reduce((acc, story) => acc + story.views_count, 0)} vues</span>
            </div>
          </div>
        </div>
      )}

      <CommentsDialog
        isOpen={!!selectedStoryForComments}
        onClose={() => setSelectedStoryForComments(null)}
        storyId={selectedStoryForComments?.id || ''}
        storyTitle={selectedStoryForComments?.title || ''}
      />
    </main>
  );
};

export default TravelStories;
