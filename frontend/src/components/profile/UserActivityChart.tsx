import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface MonthlyData {
  month: string;
  count: number;
}

interface UserActivityChartProps {
  stories: MonthlyData[];
  bookings: MonthlyData[];
  itineraries: MonthlyData[];
}

export const UserActivityChart: React.FC<UserActivityChartProps> = ({
  stories,
  bookings,
  itineraries
}) => {
  // Combiner toutes les données pour créer un tableau unifié par mois
  const months = new Set([
    ...stories.map(s => s.month),
    ...bookings.map(b => b.month),
    ...itineraries.map(i => i.month)
  ]);

  const chartData = Array.from(months).sort().map(month => {
    const story = stories.find(s => s.month === month);
    const booking = bookings.find(b => b.month === month);
    const itinerary = itineraries.find(i => i.month === month);

    // Format le mois pour l'affichage (ex: "2025-01" => "Jan 2025")
    const date = new Date(month + '-01');
    const monthName = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });

    return {
      month: monthName,
      Récits: story?.count || 0,
      Réservations: booking?.count || 0,
      Itinéraires: itinerary?.count || 0,
    };
  });

  // Si aucune donnée, afficher un message
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Activité mensuelle
          </CardTitle>
          <CardDescription>
            Évolution de votre activité sur les 6 derniers mois
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Aucune activité récente à afficher
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Activité mensuelle
        </CardTitle>
        <CardDescription>
          Évolution de votre activité sur les 6 derniers mois
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorRecits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorReservations" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorItineraires" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="Récits"
              stroke="#8b5cf6"
              fillOpacity={1}
              fill="url(#colorRecits)"
            />
            <Area
              type="monotone"
              dataKey="Réservations"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorReservations)"
            />
            <Area
              type="monotone"
              dataKey="Itinéraires"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#colorItineraires)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
