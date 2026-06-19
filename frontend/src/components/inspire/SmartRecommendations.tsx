import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, MapPin, Star, TrendingUp, Target, Loader2, AlertTriangle, Lock, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { POIFavoriteButton } from './POIFavoriteButton';
import { PartnerBookingButton } from '@/components/partner/PartnerBookingButton';
import { toast } from 'sonner';
import { smartRecommendationService } from '@/services/smartRecommendationService';
import { POI, categorizePOI, getPOIColor } from '@/services/poiService';

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
    is_partner_point?: boolean;
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
  previewPOIs?: POI[]; // POI visibles -> aperçu de valeur pour les visiteurs anonymes
}

export const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({
  userLat,
  userLon,
  radiusKm = 30,
  onPOISelect,
  previewPOIs = []
}) => {
  const { t } = useTranslation();
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
        toast.info(t('beInspired.smartRecommendations.noNewRecommendations'));
      } else {
        toast.success(t('beInspired.smartRecommendations.successGenerated', { count: data.recommendations?.length || 0 }));
      }

    } catch (error: any) {
      console.error('Error loading recommendations:', error);
      setError(t('beInspired.smartRecommendations.error'));
      toast.error(t('beInspired.smartRecommendations.loadingError'));
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
    if (score >= 80) return t('beInspired.smartRecommendations.excellentMatch');
    if (score >= 60) return t('beInspired.smartRecommendations.goodMatch');
    return t('beInspired.smartRecommendations.toDiscover');
  };

  if (!user) {
    // Aperçu de valeur : top lieux de la zone (par note) + CTA connexion.
    const preview = [...previewPOIs]
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
      .slice(0, 3);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-primary" />
            {t('beInspired.smartRecommendations.title')}
            <Badge variant="secondary" className="ml-1 text-[10px]">{t('beInspired.smartRecommendations.previewBadge', 'Aperçu')}</Badge>
          </CardTitle>
          <CardDescription>
            {t('beInspired.smartRecommendations.previewIntro', 'Un avant-goût des lieux de cette zone. Connectez-vous pour des recommandations personnalisées selon vos goûts.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {preview.length > 0 ? (
            preview.map((poi) => (
              <button
                key={poi.id}
                onClick={() => onPOISelect?.(poi)}
                className="w-full text-left flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: getPOIColor(categorizePOI(poi)) }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium line-clamp-1">{poi.name}</p>
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
                    <span>{t(`beInspired.map.category.${categorizePOI(poi)}`, categorizePOI(poi))}</span>
                    {poi.rating != null && (
                      <span className="inline-flex items-center gap-0.5"><Star className="w-3 h-3 text-yellow-500" />{Number(poi.rating).toFixed(1)}</span>
                    )}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              {t('beInspired.smartRecommendations.previewEmpty', 'Déplacez la carte pour voir des suggestions de lieux ici.')}
            </p>
          )}
          <Button
            className="w-full"
            onClick={() => { window.location.href = '/auth?redirectTo=/inspire'; }}
          >
            <LogIn className="w-4 h-4 mr-2" />
            {t('beInspired.smartRecommendations.loginCta', 'Se connecter pour des recommandations sur mesure')}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center inline-flex items-center justify-center gap-1 w-full">
            <Lock className="w-3 h-3" /> {t('beInspired.smartRecommendations.loginPerk', 'Itinéraires personnalisés, favoris et suggestions selon vos préférences.')}
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
            {t('beInspired.smartRecommendations.title')}
            <TrendingUp className="w-4 h-4 text-green-500" />
          </CardTitle>
          <CardDescription>
            {t('beInspired.smartRecommendations.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {userProfile && (
                <div className="flex flex-wrap gap-2">
                  <span>{t('beInspired.smartRecommendations.yourPreferences')}</span>
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
              {t('beInspired.smartRecommendations.refresh')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">{t('beInspired.smartRecommendations.analyzing')}</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-destructive mb-4 flex items-center justify-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>
            <Button onClick={fetchRecommendations} variant="outline">
              {t('beInspired.smartRecommendations.retry')}
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && recommendations.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('beInspired.smartRecommendations.noRecommendationsTitle')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('beInspired.smartRecommendations.noRecommendationsDesc')}
            </p>
            <Button onClick={() => window.location.href = '/inspire'}>
              {t('beInspired.smartRecommendations.exploreMap')}
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
                        {recommendation.score}% {t('beInspired.smartRecommendations.match')}
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
                    {t('beInspired.smartRecommendations.viewOnMap')}
                  </Button>

                  {/* Bouton « Réserver » seulement si le POI est lié à un partenaire */}
                  <PartnerBookingButton
                    touristPoint={{
                      id: recommendation.poi.id,
                      name: recommendation.poi.name,
                      description: recommendation.poi.description,
                      price_range: recommendation.poi.price_range,
                      has_booking_system: !!recommendation.poi.is_partner_point,
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
