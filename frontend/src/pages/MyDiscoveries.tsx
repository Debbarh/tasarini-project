import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Heart, Route, MapPin, Clock, Users, Share2, Eye, Edit, Trash2, Globe, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFavoritePOIs } from '@/hooks/useFavoritePOIs';
import { toast } from 'sonner';
import { discoveryService, DiscoveryItinerary } from '@/services/discoveryService';

const MyDiscoveries = () => {
  const { user } = useAuth();
  const { favorites, loading: favoritesLoading } = useFavoritePOIs();
  const [itineraries, setItineraries] = useState<DiscoveryItinerary[]>([]);
  const [publicItineraries, setPublicItineraries] = useState<DiscoveryItinerary[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('favorites');

  useEffect(() => {
    if (user) {
      fetchItineraries();
      fetchPublicItineraries();
    }
  }, [user]);

  const fetchItineraries = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = await discoveryService.list({ mine: 'true' });
      setItineraries(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des itinéraires:', error);
      toast.error('Erreur lors du chargement des itinéraires');
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicItineraries = async () => {
    setLoading(true);
    try {
      const data = await discoveryService.list({ public: 'true', limit: 20 });
      setPublicItineraries(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des itinéraires publics:', error);
      toast.error('Erreur lors du chargement des itinéraires publics');
    } finally {
      setLoading(false);
    }
  };

  const deleteItinerary = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet itinéraire ?')) return;

    try {
      await discoveryService.delete(id);

      setItineraries(prev => prev.filter(item => item.id !== id));
      toast.success('Itinéraire supprimé');
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const togglePublicStatus = async (id: string, currentStatus: boolean) => {
    try {
      const updated = await discoveryService.update(id, { is_public: !currentStatus });
      setItineraries(prev => prev.map(item => 
        item.id === id ? updated : item
      ));
      
      toast.success(`Itinéraire ${!currentStatus ? 'rendu public' : 'rendu privé'}`);
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const shareItinerary = async (itinerary: DiscoveryItinerary) => {
    const url = `${window.location.origin}/inspire?itinerary=${itinerary.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: itinerary.title,
          text: itinerary.description || 'Découvrez cet itinéraire !',
          url: url,
        });
      } catch (error) {
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Lien copié dans le presse-papiers !');
      } catch (error) {
        toast.error('Impossible de copier le lien');
      }
    }
  };

  const getDifficultyLabel = (level: string) => {
    switch (level) {
      case 'easy': return 'Facile';
      case 'medium': return 'Modéré';
      case 'hard': return 'Difficile';
      default: return 'Facile';
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-green-500';
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Mes Découvertes</h1>
          <p className="text-muted-foreground">
            Connectez-vous pour voir vos favoris et itinéraires.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 animate-fade-in">
      <Helmet>
        <title>Mes Découvertes | Voyage AI</title>
        <meta name="description" content="Gérez vos lieux favoris et itinéraires de découverte personnalisés." />
      </Helmet>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Mes Découvertes</h1>
        <p className="text-muted-foreground">
          Retrouvez vos lieux favoris et itinéraires personnalisés
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="favorites" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Favoris ({favorites.length})
          </TabsTrigger>
          <TabsTrigger value="itineraries" className="flex items-center gap-2">
            <Route className="w-4 h-4" />
            Mes Itinéraires ({itineraries.length})
          </TabsTrigger>
          <TabsTrigger value="community" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Communauté
          </TabsTrigger>
        </TabsList>

        {/* Onglet Favoris */}
        <TabsContent value="favorites" className="space-y-4">
          {favoritesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : favorites.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun favori</h3>
                <p className="text-muted-foreground mb-4">
                  Commencez par ajouter des lieux à vos favoris depuis la carte
                </p>
                <Button 
                  onClick={() => window.location.href = '/inspire'}
                >
                  Explorer la carte
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((favorite) => (
                <Card key={favorite.id} className="hover-scale">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg line-clamp-1">
                        {favorite.tourist_point?.name || 'Lieu'}
                      </h3>
                      <Heart className="w-5 h-5 text-red-500 fill-current flex-shrink-0" />
                    </div>
                    
                    {favorite.tourist_point?.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {favorite.tourist_point.description}
                      </p>
                    )}
                    
                    <div className="space-y-2 text-sm">
                      {favorite.tourist_point?.rating && (
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span>{favorite.tourist_point.rating}/5</span>
                        </div>
                      )}
                      
                      {favorite.tourist_point?.tags && (
                        <div className="flex flex-wrap gap-1">
                          {favorite.tourist_point.tags.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={() => {
                        const lat = favorite.tourist_point?.latitude;
                        const lng = favorite.tourist_point?.longitude;
                        if (lat && lng) {
                          window.location.href = `/inspire?lat=${lat}&lng=${lng}`;
                        }
                      }}
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Voir sur la carte
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Onglet Mes Itinéraires */}
        <TabsContent value="itineraries" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : itineraries.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Route className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun itinéraire</h3>
                <p className="text-muted-foreground mb-4">
                  Créez votre premier itinéraire en sélectionnant des points d'intérêt
                </p>
                <Button 
                  onClick={() => window.location.href = '/inspire'}
                >
                  Créer un itinéraire
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {itineraries.map((itinerary) => (
                <Card key={itinerary.id} className="hover-scale">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg line-clamp-1">{itinerary.title}</h3>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => shareItinerary(itinerary)}
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteItinerary(itinerary.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {itinerary.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {itinerary.description}
                      </p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{itinerary.poi_ids?.length || 0} lieux</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{itinerary.estimated_duration_hours}h</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getDifficultyColor(itinerary.difficulty_level)}>
                          {getDifficultyLabel(itinerary.difficulty_level)}
                        </Badge>
                        {itinerary.is_public && (
                          <Badge variant="outline">
                            <Globe className="w-3 h-3 mr-1" />
                            Public
                          </Badge>
                        )}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePublicStatus(itinerary.id, itinerary.is_public)}
                      >
                        {itinerary.is_public ? 'Rendre privé' : 'Rendre public'}
                      </Button>
                    </div>
                    
                    <div className="text-xs text-muted-foreground mt-3">
                      Distance: ~{itinerary.total_distance_km} km
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Onglet Communauté */}
        <TabsContent value="community" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Itinéraires de la communauté
              </CardTitle>
              <CardDescription>
                Découvrez les itinéraires partagés par d'autres utilisateurs
              </CardDescription>
            </CardHeader>
          </Card>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publicItineraries.map((itinerary) => (
                <Card key={itinerary.id} className="hover-scale">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg line-clamp-1">{itinerary.title}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => shareItinerary(itinerary)}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-2">
                      Par {itinerary.user_display_name || 'Voyageur Tasarini'}
                    </div>
                    
                    {itinerary.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {itinerary.description}
                      </p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{itinerary.poi_ids?.length || 0} lieux</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{itinerary.estimated_duration_hours}h</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge className={getDifficultyColor(itinerary.difficulty_level)}>
                        {getDifficultyLabel(itinerary.difficulty_level)}
                      </Badge>
                      
                      <div className="text-xs text-muted-foreground">
                        ~{itinerary.total_distance_km} km
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default MyDiscoveries;
