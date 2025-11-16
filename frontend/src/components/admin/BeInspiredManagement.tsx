import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Heart, MapPin, Route, MessageSquare, TrendingUp, Users, 
  Eye, Star, Calendar, Filter, Search, Download, BarChart3,
  Bot, Sparkles, Map
} from 'lucide-react';
import { adminPoiService } from '@/services/adminPoiService';
import { beInspiredAnalyticsService } from '@/services/beInspiredAnalyticsService';
import { useToast } from '@/hooks/use-toast';
import { BeInspiredAnalytics } from './BeInspiredAnalytics';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePagination } from '@/hooks/usePagination';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

interface POIStats {
  id: string;
  name: string;
  rating: number;
  review_count: number;
  favorite_count: number;
  view_count: number;
  created_at: string;
  is_active: boolean;
  is_verified: boolean;
  tags: string[];
}

interface UserActivity {
  id: string;
  email: string;
  favorites_count: number;
  reviews_count: number;
  itineraries_count: number;
  last_activity: string;
}

interface AIUsageStats {
  total_requests: number;
  successful_requests: number;
  average_response_time: number;
  most_asked_topics: string[];
  usage_by_day: { date: string; count: number }[];
}

export const BeInspiredManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data states
  const [poiStats, setPoiStats] = useState<POIStats[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [aiStats, setAiStats] = useState<AIUsageStats | null>(null);
  const [overviewStats, setOverviewStats] = useState({
    totalPOIs: 0,
    totalFavorites: 0,
    totalReviews: 0,
    totalItineraries: 0,
    avgRating: 0,
    activeUsers: 0
  });

  // Pagination for POIs
  const {
    currentPage: poiCurrentPage,
    totalPages: poiTotalPages,
    paginatedData: paginatedPOIs,
    goToPage: poiGoToPage,
    goToNextPage: poiGoToNextPage,
    goToPreviousPage: poiGoToPreviousPage,
    canGoNext: poiCanGoNext,
    canGoPrevious: poiCanGoPrevious
  } = usePagination({
    data: poiStats.filter(poi => 
      poi.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    pageSize: 10
  });

  // Pagination for users
  const {
    currentPage: userCurrentPage,
    totalPages: userTotalPages,
    paginatedData: paginatedUsers,
    goToPage: userGoToPage,
    goToNextPage: userGoToNextPage,
    goToPreviousPage: userGoToPreviousPage,
    canGoNext: userCanGoNext,
    canGoPrevious: userCanGoPrevious
  } = usePagination({
    data: userActivity,
    pageSize: 10
  });

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const parseDateRangeToDays = (range: string) => {
    const match = range.match(/(\d+)/);
    return match ? Math.max(parseInt(match[1], 10), 1) : 30;
  };

  const loadDashboardData = async () => {
    setLoading(true);
    const days = parseDateRangeToDays(dateRange);
    try {
      await Promise.all([
        loadOverviewStats(days),
        loadPOIStats(days),
        loadUserActivity(),
        loadAIStats(days)
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOverviewStats = async (days: number) => {
    const stats = await beInspiredAnalyticsService.getOverview(days);
    setOverviewStats(stats);
  };

  const loadPOIStats = async (days: number) => {
    const data = await beInspiredAnalyticsService.getPoiStats({ days, limit: 50 });
    setPoiStats(data ?? []);
  };

  const loadUserActivity = async () => {
    const data = await beInspiredAnalyticsService.getUserActivity({ limit: 50 });
    setUserActivity(data ?? []);
  };

  const loadAIStats = async (days: number) => {
    const stats = await beInspiredAnalyticsService.getAIStats(days);
    setAiStats(stats);
  };

  const exportData = async (type: string) => {
    toast({
      title: "Export en cours",
      description: `Génération du fichier ${type}...`
    });
    // Implementation de l'export
  };

  const togglePOIStatus = async (poiId: string, currentStatus: boolean) => {
    try {
      await adminPoiService.update(poiId, { is_active: !currentStatus });

      toast({ title: "Statut mis à jour avec succès" });
      loadPOIStats(parseDateRangeToDays(dateRange));
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive"
      });
    }
  };

  const verifyPOI = async (poiId: string) => {
    try {
      await adminPoiService.update(poiId, { is_verified: true, is_active: true });

      toast({ title: "Point d'intérêt vérifié avec succès" });
      loadPOIStats(parseDateRangeToDays(dateRange));
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de vérifier le point d'intérêt",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion "Be Inspired"</h2>
          <p className="text-muted-foreground">
            Analytics et outils de gestion pour le module d'inspiration voyage
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="90d">90 derniers jours</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => exportData('analytics')}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Points d'intérêt</p>
                <p className="text-2xl font-bold">{overviewStats.totalPOIs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Favoris</p>
                <p className="text-2xl font-bold">{overviewStats.totalFavorites}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avis</p>
                <p className="text-2xl font-bold">{overviewStats.totalReviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Itinéraires</p>
                <p className="text-2xl font-bold">{overviewStats.totalItineraries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Note moyenne</p>
                <p className="text-2xl font-bold">{overviewStats.avgRating}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Utilisateurs</p>
                <p className="text-2xl font-bold">{overviewStats.activeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="pois" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pois" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Points d'intérêt
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Activité utilisateurs
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Assistant IA
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics détaillées
          </TabsTrigger>
        </TabsList>

        {/* Points d'intérêt */}
        <TabsContent value="pois">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Gestion des Points d'Intérêt</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un POI..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    Filtres
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Avis</TableHead>
                      <TableHead>Favoris</TableHead>
                      <TableHead>Vues</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPOIs.map((poi) => (
                      <TableRow key={poi.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{poi.name}</p>
                            <div className="flex gap-1 mt-1">
                              {poi.tags?.slice(0, 2).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            {poi.rating.toFixed(1)}
                          </div>
                        </TableCell>
                        <TableCell>{poi.review_count}</TableCell>
                        <TableCell>{poi.favorite_count}</TableCell>
                        <TableCell>{poi.view_count}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Badge variant={poi.is_active ? "default" : "secondary"}>
                              {poi.is_active ? "Actif" : "Inactif"}
                            </Badge>
                            {poi.is_verified && (
                              <Badge variant="outline" className="text-green-600">
                                Vérifié
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => togglePOIStatus(poi.id, poi.is_active)}
                            >
                              {poi.is_active ? "Désactiver" : "Activer"}
                            </Button>
                            {!poi.is_verified && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => verifyPOI(poi.id)}
                              >
                                Vérifier
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination for POIs */}
              {poiTotalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={poiGoToPreviousPage}
                          className={!poiCanGoPrevious ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {[...Array(poiTotalPages)].map((_, index) => {
                        const pageNumber = index + 1;
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              onClick={() => poiGoToPage(pageNumber)}
                              isActive={poiCurrentPage === pageNumber}
                              className="cursor-pointer"
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={poiGoToNextPage}
                          className={!poiCanGoNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activité utilisateurs */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Activité des Utilisateurs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Favoris</TableHead>
                      <TableHead>Avis</TableHead>
                      <TableHead>Itinéraires</TableHead>
                      <TableHead>Dernière activité</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.favorites_count}</TableCell>
                        <TableCell>{user.reviews_count}</TableCell>
                        <TableCell>{user.itineraries_count}</TableCell>
                        <TableCell>
                          {format(new Date(user.last_activity), 'dd/MM/yyyy', { locale: fr })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination for Users */}
              {userTotalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={userGoToPreviousPage}
                          className={!userCanGoPrevious ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {[...Array(userTotalPages)].map((_, index) => {
                        const pageNumber = index + 1;
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              onClick={() => userGoToPage(pageNumber)}
                              isActive={userCurrentPage === pageNumber}
                              className="cursor-pointer"
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={userGoToNextPage}
                          className={!userCanGoNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assistant IA */}
        <TabsContent value="ai">
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total requêtes</p>
                      <p className="text-2xl font-bold">{aiStats?.total_requests}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Taux de succès</p>
                      <p className="text-2xl font-bold">
                        {aiStats ? Math.round((aiStats.successful_requests / aiStats.total_requests) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Temps de réponse</p>
                      <p className="text-2xl font-bold">{aiStats?.average_response_time}s</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Sujets les plus demandés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {aiStats?.most_asked_topics.map((topic, index) => (
                    <div key={topic} className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <span>{topic}</span>
                      <Badge>{index + 1}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics détaillées */}
        <TabsContent value="analytics">
          <BeInspiredAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
};
