import React, { useState, useEffect } from 'react';
import { apiClient } from '@/integrations/api/client';
import { toast } from 'sonner';
import { UserActivityChart } from './UserActivityChart';
import { UserBadges } from './UserBadges';
import { ActivityTimeline } from './ActivityTimeline';
import { Loader2 } from 'lucide-react';

interface AdvancedStats {
  totals: {
    stories: number;
    favorites: number;
    bookmarks: number;
    bookings: number;
    itineraries: number;
  };
  monthly_activity: {
    stories: { month: string; count: number }[];
    bookings: { month: string; count: number }[];
    itineraries: { month: string; count: number }[];
  };
  badges: {
    id: string;
    name: string;
    description: string;
    icon: string;
    earned: boolean;
  }[];
  recent_activities: {
    type: string;
    action: string;
    title: string;
    date: string;
    icon: string;
  }[];
}

export const AdvancedStatistics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdvancedStats | null>(null);

  useEffect(() => {
    fetchAdvancedStats();
  }, []);

  const fetchAdvancedStats = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<AdvancedStats>('accounts/advanced-stats/');
      setStats(data);
    } catch (error) {
      console.error('Error fetching advanced stats:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
        Impossible de charger les statistiques
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Activity Chart */}
      <UserActivityChart
        stories={stats.monthly_activity.stories}
        bookings={stats.monthly_activity.bookings}
        itineraries={stats.monthly_activity.itineraries}
      />

      {/* Badges */}
      <UserBadges badges={stats.badges} />

      {/* Recent Activity Timeline */}
      <ActivityTimeline activities={stats.recent_activities} />
    </div>
  );
};
