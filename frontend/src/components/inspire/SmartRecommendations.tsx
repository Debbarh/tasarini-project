import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, MapPin, Star, TrendingUp, Target, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { POIFavoriteButton } from './POIFavoriteButton';
import { PartnerBookingButton } from '@/components/partner/PartnerBookingButton';
import { toast } from 'sonner';
import { smartRecommendationService } from '@/services/smartRecommendationService';

interface SmartRecommendation {
  id: string;
  score: number;
  reason: string;
  poi: {
    id: string;
    name: string;
    description: string;
    tags: string[];
    rating: number;
    price_range: string;
    latitude: number;
    longitude: number;
  };
}

interface UserProfile {
  preferredTags: string[];
  preferredPriceRange: string;
  preferredDifficulty: string;
  avgDuration: number;
  visitedPOIs: string[];
}

interface SmartRecommendationsProps {
  userLat?: number;
  userLon?: number;
  radiusKm?: number;
  onPOISelect?: (poi: any) => void;
}

export const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({
  userLat,
  userLon,
  radiusKm = 30,
  onPOISelect
}) => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && userLat && userLon) {
      fetchRecommendations();
    }
  }, [user, userLat, userLon, radiusKm]);

  const fetchRecommendations = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const data = await smartRecommendationService.fetch({ userLat, userLon, radiusKm });

      setRecommendations(data.recommendations || []);
      setUserProfile(data.userProfile || null);

      if (data.recommendations?.length === 0) {
        toast.info('Aucune nouvelle recommandation trouvée. Explorez plus pour améliorer vos suggestions !');
      } else {
        toast.success(`${data.recommendations?.length || 0} recommandations personnalisées générées !`);
      }

    } catch (error: any) {
      console.error('Erreur lors du chargement des recommandations:', error);
      setError('Impossible de charger les recommandations intelligentes');
      toast.error('Erreur lors du chargement des recommandations');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent match';
    if (score >= 60) return 'Bon match';
    return 'À découvrir';
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Recommandations Intelligentes</h3>
          <p className="text-muted-foreground">
            Connectez-vous pour recevoir des recommandations personnalisées basées sur vos préférences
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Recommandations Intelligentes
            <TrendingUp className="w-4 h-4 text-green-500" />
          </CardTitle>
          <CardDescription>
            Suggestions personnalisées basées sur vos goûts et votre historique
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {userProfile && (
                <div className="flex flex-wrap gap-2">
                  <span>Vos préférences:</span>
                  {userProfile.preferredTags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {userProfile.preferredTags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{userProfile.preferredTags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <Button
              onClick={fetchRecommendations}
              disabled={loading}
              size="sm"
              variant="outline"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Analyse de vos préférences en cours...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-destructive mb-4">⚠️ {error}</div>
            <Button onClick={fetchRecommendations} variant="outline">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && recommendations.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Besoin de plus de données</h3>
            <p className="text-muted-foreground mb-4">
              Ajoutez des lieux à vos favoris et créez des itinéraires pour recevoir des recommandations personnalisées !
            </p>
            <Button onClick={() => window.location.href = '/inspire'}>
              Explorer la carte
            </Button>
          </CardContent>
        </Card>
      )}

      {recommendations.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {recommendations.map((recommendation, index) => (
            <Card key={recommendation.id} className="hover-scale cursor-pointer" onClick={() => onPOISelect?.(recommendation.poi)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-base line-clamp-1">
                      {recommendation.poi.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`${getScoreColor(recommendation.score)} text-white`}>
                        {recommendation.score}% match
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {getScoreLabel(recommendation.score)}
                      </span>
                    </div>
                  </div>
                  <POIFavoriteButton touristPointId={recommendation.poi.id} />
                </div>

                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {recommendation.poi.description}
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span>{recommendation.poi.rating}/5</span>
                    {recommendation.poi.price_range && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span>{recommendation.poi.price_range}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-500" />
                    <span className="text-green-600 font-medium">
                      {recommendation.reason}
                    </span>
                  </div>

                  {recommendation.poi.tags && recommendation.poi.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {recommendation.poi.tags.slice(0, 3).map((tag, tagIndex) => (
                        <Badge key={tagIndex} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {recommendation.poi.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{recommendation.poi.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (recommendation.poi.latitude && recommendation.poi.longitude) {
                        window.location.href = `/inspire?lat=${recommendation.poi.latitude}&lng=${recommendation.poi.longitude}`;
                      }
                    }}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Carte
                  </Button>

                  {/* Add partner booking button if available */}
                  <PartnerBookingButton
                    touristPoint={{
                      id: recommendation.poi.id,
                      name: recommendation.poi.name,
                      description: recommendation.poi.description,
                      price_range: recommendation.poi.price_range,
                      has_booking_system: true, // Assume partner POIs have booking
                      booking_system_type: 'redirect',
                      booking_instructions: undefined
                    }}
                    bookingType="activity"
                    variant="compact"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
