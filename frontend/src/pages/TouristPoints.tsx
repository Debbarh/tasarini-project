import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, MapPin, Star, Building2 } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { toast } from 'sonner';
import TouristPointCard from '@/components/partner/TouristPointCard';
import PartnerBadge from '@/components/partner/PartnerBadge';
import { useTranslation } from 'react-i18next';

interface TouristPoint {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  review_count: number;
  tags: string[];
  contact_phone: string;
  contact_email: string;
  website_url: string;
  opening_hours: any;
  price_range: string;
  amenities: string[];
  media_images: string[];
  media_videos: string[];
  is_partner_point: boolean;
  partner_featured: boolean;
  partner_badge_text: string;
  created_at: string;
}

const PublicTouristPoints: React.FC = () => {
  const { t } = useTranslation();
  const [points, setPoints] = useState<TouristPoint[]>([]);
  const [filteredPoints, setFilteredPoints] = useState<TouristPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rating');

  useEffect(() => {
    fetchTouristPoints();
  }, []);

  useEffect(() => {
    filterAndSortPoints();
  }, [points, searchTerm, filterType, sortBy]);

  const fetchTouristPoints = async () => {
    try {
      const data = await apiClient.get<TouristPoint[]>('poi/tourist-points/', {
        is_active: true,
        ordering: '-created_at'
      });

      setPoints(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des points d\'intérêt:', error);
      toast.error('Erreur lors du chargement des points d\'intérêt');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortPoints = () => {
    let filtered = [...points];

    // Filtrage par recherche
    if (searchTerm) {
      filtered = filtered.filter(point =>
        point.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        point.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        point.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        point.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtrage par type
    switch (filterType) {
      case 'partners':
        filtered = filtered.filter(point => point.is_partner_point);
        break;
      case 'featured':
        filtered = filtered.filter(point => point.partner_featured);
        break;
      case 'regular':
        filtered = filtered.filter(point => !point.is_partner_point);
        break;
      default:
        // 'all' - pas de filtrage
        break;
    }

    // Tri
    switch (sortBy) {
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'reviews':
        filtered.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'recent':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      default:
        break;
    }

    // Mise en avant des partenaires featrued en premier
    if (sortBy !== 'name') {
      filtered.sort((a, b) => {
        if (a.partner_featured && !b.partner_featured) return -1;
        if (!a.partner_featured && b.partner_featured) return 1;
        if (a.is_partner_point && !b.is_partner_point) return -1;
        if (!a.is_partner_point && b.is_partner_point) return 1;
        return 0;
      });
    }

    setFilteredPoints(filtered);
  };

  const getStats = () => {
    const totalPoints = points.length;
    const partnerPoints = points.filter(p => p.is_partner_point).length;
    const featuredPoints = points.filter(p => p.partner_featured).length;
    const averageRating = points.length > 0 
      ? points.reduce((sum, p) => sum + (p.rating || 0), 0) / points.length 
      : 0;

    return { totalPoints, partnerPoints, featuredPoints, averageRating };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">{t('touristPoints.pageTitle')}</h1>
        <p className="text-muted-foreground mb-6">
          {t('touristPoints.pageDescription')}
        </p>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalPoints}</div>
              <div className="text-sm text-muted-foreground">{t('touristPoints.stats.totalPoints')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.partnerPoints}</div>
              <div className="text-sm text-muted-foreground">{t('touristPoints.stats.partners')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.featuredPoints}</div>
              <div className="text-sm text-muted-foreground">{t('touristPoints.stats.featured')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.averageRating.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">{t('touristPoints.stats.averageRating')}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filtres et recherche */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('touristPoints.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('touristPoints.filterByType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('touristPoints.filters.all')}</SelectItem>
                <SelectItem value="partners">{t('touristPoints.filters.partnersOnly')}</SelectItem>
                <SelectItem value="featured">{t('touristPoints.filters.featured')}</SelectItem>
                <SelectItem value="regular">{t('touristPoints.filters.regular')}</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('touristPoints.sortBy')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">{t('touristPoints.sorting.rating')}</SelectItem>
                <SelectItem value="reviews">{t('touristPoints.sorting.reviews')}</SelectItem>
                <SelectItem value="recent">{t('touristPoints.sorting.recent')}</SelectItem>
                <SelectItem value="name">{t('touristPoints.sorting.name')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Résultats */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted-foreground">
          {filteredPoints.length} {filteredPoints.length === 1 ? t('touristPoints.results.found') : t('touristPoints.results.foundPlural')}
          {searchTerm && ` ${t('touristPoints.results.for')} "${searchTerm}"`}
        </p>
        
        {filterType === 'partners' && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-muted-foreground">{t('touristPoints.results.certifiedPartners')}</span>
          </div>
        )}
      </div>

      {/* Grille des points d'intérêt */}
      {filteredPoints.length === 0 ? (
        <Card>
          <CardContent className="text-center p-12">
            <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('touristPoints.empty.title')}</h3>
            <p className="text-muted-foreground">
              {searchTerm ? t('touristPoints.empty.noResults') : t('touristPoints.empty.noPoints')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPoints.map((point) => (
            <TouristPointCard
              key={point.id}
              point={point}
              variant={point.partner_featured ? 'featured' : 'default'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicTouristPoints;