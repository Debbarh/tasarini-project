
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Eye, Users, DollarSign } from 'lucide-react';

interface PartnerStats {
  totalPoints: number;
  totalViews: number;
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
  pendingPayments: number;
  thisMonthViews: number;
  thisMonthBookings: number;
  thisMonthRevenue: number;
}

interface MobilePartnerStatsProps {
  stats: PartnerStats;
}

const MobilePartnerStats: React.FC<MobilePartnerStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Points</CardTitle>
          <MapPin className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-lg md:text-2xl font-bold">{stats.totalPoints}</div>
          <p className="text-xs text-muted-foreground">Total actifs</p>
        </CardContent>
      </Card>

      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Vues</CardTitle>
          <Eye className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-lg md:text-2xl font-bold">
            {stats.thisMonthViews > 999 ? `${(stats.thisMonthViews / 1000).toFixed(1)}k` : stats.thisMonthViews}
          </div>
          <p className="text-xs text-muted-foreground">Ce mois</p>
        </CardContent>
      </Card>

      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Réservations</CardTitle>
          <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-lg md:text-2xl font-bold">{stats.thisMonthBookings}</div>
          <p className="text-xs text-muted-foreground">Ce mois</p>
        </CardContent>
      </Card>

      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Revenus</CardTitle>
          <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-lg md:text-2xl font-bold">{stats.thisMonthRevenue.toFixed(0)}€</div>
          <p className="text-xs text-muted-foreground">Ce mois</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobilePartnerStats;
