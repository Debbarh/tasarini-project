import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, Users, Calendar, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/integrations/api/client';

interface Destination {
  id: string;
  name: string;
  description: string;
  rating: number;
  tags: string[];
  latitude: number;
  longitude: number;
  estimatedBudget?: string;
  bestSeason?: string;
}

interface DestinationSuggestionsProps {
  onSelect: (destination: Destination) => void;
  searchQuery?: string;
  budgetLevel?: string;
  groupType?: string;
}

export const DestinationSuggestions: React.FC<DestinationSuggestionsProps> = ({
  onSelect,
  searchQuery,
  budgetLevel,
  groupType
}) => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(false);
  const [personalizedSuggestions, setPersonalizedSuggestions] = useState<Destination[]>([]);

  useEffect(() => {
    fetchSuggestions();
    if (user) {
      fetchPersonalizedSuggestions();
    }
  }, [searchQuery, budgetLevel, groupType, user]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const params: any = {
        is_active: true,
        rating__gte: 4.0,
        ordering: '-rating',
        limit: 6
      };

      if (searchQuery && searchQuery.length > 2) {
        params.search = searchQuery;
      }

      const data = await apiClient.get<any[]>('poi/tourist-points/', params);

      const destinations: Destination[] = (data || []).map((point: any) => ({
        id: point.id,
        name: point.name,
        description: point.description || '',
        rating: point.rating || 0,
        tags: point.tags || [],
        latitude: point.latitude || 0,
        longitude: point.longitude || 0,
        estimatedBudget: getBudgetForTags(point.tags || []),
        bestSeason: getSeasonForTags(point.tags || [])
      }));

      setSuggestions(destinations);
    } catch (error) {
      console.error('Erreur lors de la récupération des suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonalizedSuggestions = async () => {
    if (!user) return;

    try {
      // Get user's favorite POIs from Django API
      const favorites = await apiClient.get<any[]>('poi/favorites/', {
        user: user.id
      });

      if (!favorites || favorites.length === 0) return;

      const userTags = favorites.flatMap((f: any) => f.tourist_point?.tags || []);
      const uniqueTags = [...new Set(userTags)];

      // Find destinations with similar tags
      const similar = await apiClient.get<any[]>('poi/tourist-points/', {
        is_active: true,
        rating__gte: 3.5,
        limit: 3
      });

      if (similar) {
        const personalizedDests: Destination[] = similar
          .filter((point: any) => {
            const pointTags = point.tags || [];
            return uniqueTags.some(tag => pointTags.includes(tag));
          })
          .map((point: any) => ({
            id: point.id,
            name: point.name,
            description: point.description || '',
            rating: point.rating || 0,
            tags: point.tags || [],
            latitude: point.latitude || 0,
            longitude: point.longitude || 0,
            estimatedBudget: getBudgetForTags(point.tags || []),
            bestSeason: getSeasonForTags(point.tags || [])
          }));

        setPersonalizedSuggestions(personalizedDests);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des suggestions personnalisées:', error);
    }
  };

  const getBudgetForTags = (tags: string[]): string => {
    if (tags.some(tag => ['luxury', 'premium', 'gastronomique'].includes(tag.toLowerCase()))) {
      return 'Luxe';
    }
    if (tags.some(tag => ['budget', 'économique', 'gratuit'].includes(tag.toLowerCase()))) {
      return 'Économique';
    }
    return 'Modéré';
  };

  const getSeasonForTags = (tags: string[]): string => {
    if (tags.some(tag => ['plage', 'été', 'soleil'].includes(tag.toLowerCase()))) {
      return 'Été';
    }
    if (tags.some(tag => ['ski', 'hiver', 'neige'].includes(tag.toLowerCase()))) {
      return 'Hiver';
    }
    if (tags.some(tag => ['randonnée', 'nature'].includes(tag.toLowerCase()))) {
      return 'Printemps/Automne';
    }
    return 'Toute l\'année';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Suggestions personnalisées */}
      {personalizedSuggestions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Suggestions personnalisées
          </h3>
          <div className="grid gap-3">
            {personalizedSuggestions.map(destination => (
              <DestinationCard
                key={`personalized-${destination.id}`}
                destination={destination}
                onSelect={onSelect}
                isPersonalized
              />
            ))}
          </div>
        </div>
      )}

      {/* Suggestions générales */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Destinations populaires
        </h3>
        <div className="grid gap-3">
          {suggestions.map(destination => (
            <DestinationCard
              key={destination.id}
              destination={destination}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface DestinationCardProps {
  destination: Destination;
  onSelect: (destination: Destination) => void;
  isPersonalized?: boolean;
}

const DestinationCard: React.FC<DestinationCardProps> = ({
  destination,
  onSelect,
  isPersonalized
}) => {
  return (
    <Card className={`cursor-pointer hover:shadow-md transition-shadow ${
      isPersonalized ? 'border-primary/50 bg-primary/5' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold">{destination.name}</h4>
              {isPersonalized && (
                <Badge variant="default" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Pour vous
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {destination.description}
            </p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span>{destination.rating.toFixed(1)}</span>
              </div>
              {destination.estimatedBudget && (
                <div className="flex items-center gap-1">
                  <span>💰</span>
                  <span>{destination.estimatedBudget}</span>
                </div>
              )}
              {destination.bestSeason && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{destination.bestSeason}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {destination.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {destination.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{destination.tags.length - 3}
                </Badge>
              )}
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => onSelect(destination)}
            className="ml-4"
          >
            Choisir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};