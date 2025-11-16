import { useState, useEffect } from 'react';
import { beInspiredAnalyticsService } from '@/services/beInspiredAnalyticsService';

export interface BeInspiredMetrics {
  totalPOIs: number;
  activePOIs: number;
  totalFavorites: number;
  totalReviews: number;
  totalItineraries: number;
  averageRating: number;
  activeUsers: number;
  aiRequests: number;
  topPOIs: Array<{
    id: string;
    name: string;
    views: number;
    favorites: number;
    rating: number;
  }>;
  categoryDistribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  userEngagement: {
    dailyActiveUsers: number;
    averageSessionDuration: number;
    bounceRate: number;
    conversionRate: number;
  };
}

const parseRangeToDays = (range: string) => {
  if (range.endsWith('h')) {
    const hours = parseInt(range, 10);
    if (!Number.isNaN(hours)) {
      return Math.max(Math.round(hours / 24) || 1, 1);
    }
  }
  const match = range.match(/(\d+)/);
  return match ? Math.max(parseInt(match[1], 10), 1) : 7;
};

export const useBeInspiredAnalytics = (timeRange: string = '7d') => {
  const [metrics, setMetrics] = useState<BeInspiredMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, [timeRange]);

  const loadMetrics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const days = parseRangeToDays(timeRange);
      const [
        overviewStats,
        poiStats,
        userActivity,
        aiStats,
      ] = await Promise.all([
        beInspiredAnalyticsService.getOverview(days),
        beInspiredAnalyticsService.getPoiStats({ days, limit: 100 }),
        beInspiredAnalyticsService.getUserActivity({ limit: 100 }),
        beInspiredAnalyticsService.getAIStats(days),
      ]);

      const poiList = poiStats ?? [];
      const totalPOIs = overviewStats?.totalPOIs ?? poiList.length;
      const activePOIs = poiList.filter((poi) => poi.is_active).length;
      const totalFavorites =
        overviewStats?.totalFavorites ??
        poiList.reduce((sum, poi) => sum + (poi.favorite_count ?? 0), 0);
      const totalReviews =
        overviewStats?.totalReviews ?? poiList.reduce((sum, poi) => sum + (poi.review_count ?? 0), 0);
      const totalItineraries = overviewStats?.totalItineraries ?? 0;
      const activeUsers = overviewStats?.activeUsers ?? (userActivity?.length ?? 0);

      const avgRating =
        poiList.length > 0
          ? poiList.reduce((acc, poi) => acc + (poi.rating || 0), 0) / poiList.length
          : overviewStats?.avgRating ?? 0;

      const topPOIs =
        poiList
          .slice()
          .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
          .slice(0, 10)
          .map((poi) => ({
            id: poi.id,
            name: poi.name,
            views: poi.view_count ?? 0,
            favorites: poi.favorite_count ?? 0,
            rating: poi.rating ?? 0,
          })) ?? [];

      const categoryCount: Record<string, number> = {};
      poiList.forEach((poi) => {
        (poi.tags ?? []).forEach((tag) => {
          categoryCount[tag] = (categoryCount[tag] || 0) + 1;
        });
      });

      const categoryDistribution = Object.entries(categoryCount)
        .map(([category, count]) => ({
          category,
          count,
          percentage: totalPOIs > 0 ? (count / totalPOIs) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      const aiUsageAverage =
        aiStats?.usage_by_day && aiStats.usage_by_day.length > 0
          ? aiStats.usage_by_day.reduce((sum, entry) => sum + entry.count, 0) / aiStats.usage_by_day.length
          : 0;
      const estimatedDailyUsers = Math.round(
        aiUsageAverage || overviewStats?.activeUsers || userActivity?.length || 0,
      );
      const conversionRate =
        activeUsers > 0 ? Math.min((totalFavorites / activeUsers) * 100, 100) : 0;
      const bounceRate = Math.max(5, Math.min(95, 100 - Math.round(conversionRate / 1.3)));

      const userEngagement = {
        dailyActiveUsers: estimatedDailyUsers,
        averageSessionDuration: Math.max((aiStats?.average_response_time ?? 2) * 2.5, 1),
        bounceRate,
        conversionRate: Math.round(conversionRate * 10) / 10,
      };

      const metrics: BeInspiredMetrics = {
        totalPOIs,
        activePOIs,
        totalFavorites,
        totalReviews,
        totalItineraries,
        averageRating: Math.round(avgRating * 10) / 10,
        activeUsers,
        aiRequests: aiStats?.total_requests ?? 0,
        topPOIs,
        categoryDistribution,
        userEngagement
      };

      setMetrics(metrics);
    } catch (err) {
      console.error('Erreur lors du chargement des analytics:', err);
      setError('Impossible de charger les données analytiques');
    } finally {
      setLoading(false);
    }
  };

  const refreshMetrics = () => {
    loadMetrics();
  };

  return {
    metrics,
    loading,
    error,
    refreshMetrics
  };
};
