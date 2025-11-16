import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Map, Eye, Heart, MessageCircle, Share2, Calendar, MapPin, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/integrations/api/client';
import { Link } from 'react-router-dom';

interface Story {
  id: string;
  title: string;
  content: string;
  cover_image: string;
  location_name: string;
  trip_date: string;
  likes_count: number;
  views_count: number;
  comments_count: number;
  shares_count: number;
  is_public: boolean;
  is_featured: boolean;
  created_at: string;
  tags: string[];
}

interface SavedItinerary {
  id: string;
  title: string;
  description: string;
  destination_summary: string;
  trip_duration: number;
  created_at: string;
  is_favorite: boolean;
}

export const UserContent: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [itineraries, setItineraries] = useState<SavedItinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_stories: 0,
    total_views: 0,
    total_likes: 0,
    total_itineraries: 0,
  });

  useEffect(() => {
    fetchUserContent();
  }, []);

  const fetchUserContent = async () => {
    setLoading(true);
    try {
      const [storiesData, itinerariesData] = await Promise.all([
        apiClient.get<Story[]>('stories/?mine=true&limit=6'),
        apiClient.get<SavedItinerary[]>('travel/saved-itineraries/?limit=6')
      ]);

      const userStories = storiesData || [];
      const userItineraries = itinerariesData || [];

      setStories(userStories);
      setItineraries(userItineraries);

      // Calculate stats
      const totalViews = userStories.reduce((sum, story) => sum + (story.views_count || 0), 0);
      const totalLikes = userStories.reduce((sum, story) => sum + (story.likes_count || 0), 0);

      setStats({
        total_stories: userStories.length,
        total_views: totalViews,
        total_likes: totalLikes,
        total_itineraries: userItineraries.length,
      });
    } catch (error) {
      console.error('Error fetching user content:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Content Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Récits</p>
                <p className="text-2xl font-bold">{stats.total_stories}</p>
              </div>
              <BookOpen className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vues</p>
                <p className="text-2xl font-bold">{stats.total_views}</p>
              </div>
              <Eye className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Likes</p>
                <p className="text-2xl font-bold">{stats.total_likes}</p>
              </div>
              <Heart className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Itinéraires</p>
                <p className="text-2xl font-bold">{stats.total_itineraries}</p>
              </div>
              <Map className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stories and Itineraries Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Mon Contenu
          </CardTitle>
          <CardDescription>
            Mes récits de voyage et itinéraires sauvegardés
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="stories" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stories">
                Récits <Badge className="ml-2" variant="secondary">{stories.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="itineraries">
                Itinéraires <Badge className="ml-2" variant="secondary">{itineraries.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stories" className="space-y-4 mt-4">
              {stories.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="mb-4">Vous n'avez pas encore créé de récits</p>
                  <Button asChild>
                    <Link to="/travel-stories">Créer un récit</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stories.map((story) => (
                      <Card key={story.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                        <div className="relative aspect-video bg-muted">
                          {story.cover_image ? (
                            <img
                              src={story.cover_image}
                              alt={story.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                          {story.is_featured && (
                            <Badge className="absolute top-2 right-2" variant="default">
                              Featured
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-2 line-clamp-1">{story.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {story.content}
                          </p>

                          {story.location_name && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                              <MapPin className="w-3 h-3" />
                              <span>{story.location_name}</span>
                            </div>
                          )}

                          {story.trip_date && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(story.trip_date)}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              <span>{story.views_count || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              <span>{story.likes_count || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" />
                              <span>{story.comments_count || 0}</span>
                            </div>
                          </div>

                          {story.tags && story.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {story.tags.slice(0, 3).map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {stories.length >= 6 && (
                    <div className="text-center pt-4">
                      <Button variant="outline" asChild>
                        <Link to="/travel-stories">Voir tous mes récits</Link>
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="itineraries" className="space-y-4 mt-4">
              {itineraries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Map className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="mb-4">Vous n'avez pas encore d'itinéraires sauvegardés</p>
                  <Button asChild>
                    <Link to="/plan">Planifier un voyage</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {itineraries.map((itinerary) => (
                      <Card key={itinerary.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{itinerary.title}</h3>
                                {itinerary.is_favorite && (
                                  <Heart className="w-4 h-4 text-red-500 fill-current" />
                                )}
                              </div>
                              {itinerary.description && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {itinerary.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {itinerary.destination_summary && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    <span>{itinerary.destination_summary}</span>
                                  </div>
                                )}
                                {itinerary.trip_duration && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>{itinerary.trip_duration} jour{itinerary.trip_duration > 1 ? 's' : ''}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {itineraries.length >= 6 && (
                    <div className="text-center pt-4">
                      <Button variant="outline" asChild>
                        <Link to="/profile">Voir tous mes itinéraires</Link>
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
