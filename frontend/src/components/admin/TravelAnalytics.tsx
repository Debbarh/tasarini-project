import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/integrations/api/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { CalendarDays, MapPin, Users, DollarSign, Utensils, Bed, Activity, Table, Download, FileText, FileSpreadsheet } from "lucide-react";
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { exportToJSON, exportToCSV, exportToPDF } from "@/utils/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from '@/hooks/usePagination';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

interface AnalyticsData {
  id: string;
  session_id: string;
  user_country: string;
  user_city: string;
  user_region: string;
  destinations: any;
  travel_group_type: string;
  travel_group_size: number;
  budget_level: string;
  budget_amount: number;
  budget_currency: string;
  completion_status: string;
  created_at: string;
  culinary_preferences: any;
  accommodation_preferences: any;
  activity_preferences: any;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const TravelAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [countries, setCountries] = useState<Array<{id: string, name: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const { toast } = useToast();

  // Pagination for analytics data
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedAnalyticsData,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrevious
  } = usePagination({
    data: analyticsData,
    pageSize: 50
  });

  const fetchCountries = async () => {
    try {
      const data = await apiClient.get<string[]>('analytics/travel/countries/');
      const options = data.map((country, index) => ({ id: index.toString(), name: country }));
      setCountries(options);
    } catch (error) {
      console.error('Error fetching countries:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer la liste des pays.',
        variant: 'destructive',
      });
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(timeRange));

      const params: Record<string, string> = {
        days: timeRange,
      };
      if (selectedCountry !== 'all') {
        params.country = selectedCountry;
      }

      const data = await apiClient.get<AnalyticsData[]>('analytics/travel/', params);
      setAnalyticsData(data || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer les analytics.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, selectedCountry]);

  // Analytics calculations
  const totalSessions = analyticsData.length;
  const uniqueCountries = [...new Set(analyticsData.map(d => d.user_country).filter(Boolean))].length;
  const completedSessions = analyticsData.filter(d => d.completion_status === 'completed').length;
  const averageBudget = analyticsData
    .filter(d => d.budget_amount)
    .reduce((acc, d) => acc + d.budget_amount, 0) / analyticsData.filter(d => d.budget_amount).length || 0;

  // Country distribution
  const countryData = analyticsData
    .filter(d => d.user_country)
    .reduce((acc: any, d) => {
      acc[d.user_country] = (acc[d.user_country] || 0) + 1;
      return acc;
    }, {});
  
  const countryChartData = Object.entries(countryData)
    .map(([country, count]) => ({ country, count }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10);

  // Budget level distribution
  const budgetData = analyticsData
    .filter(d => d.budget_level)
    .reduce((acc: any, d) => {
      acc[d.budget_level] = (acc[d.budget_level] || 0) + 1;
      return acc;
    }, {});
  
  const budgetChartData = Object.entries(budgetData)
    .map(([level, count]) => ({ level, count }));

  // Travel group type distribution
  const groupData = analyticsData
    .filter(d => d.travel_group_type)
    .reduce((acc: any, d) => {
      acc[d.travel_group_type] = (acc[d.travel_group_type] || 0) + 1;
      return acc;
    }, {});
  
  const groupChartData = Object.entries(groupData)
    .map(([type, count]) => ({ type, count }));

  // Daily sessions trend
  const dailyData = analyticsData.reduce((acc: any, d) => {
    const date = new Date(d.created_at).toLocaleDateString();
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});
  
  const trendData = Object.entries(dailyData)
    .map(([date, count]) => ({ date, sessions: count }))
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Culinary preferences analysis
  const getCulinaryStats = () => {
    const dietaryRestrictionsData: { [key: string]: number } = {};
    const cuisineTypesData: { [key: string]: number } = {};
    
    analyticsData
      .filter(d => d.culinary_preferences)
      .forEach(d => {
        try {
          const prefs = typeof d.culinary_preferences === 'string' 
            ? JSON.parse(d.culinary_preferences) 
            : d.culinary_preferences;
          
          if (prefs?.dietaryRestrictions) {
            prefs.dietaryRestrictions.forEach((restriction: string) => {
              dietaryRestrictionsData[restriction] = (dietaryRestrictionsData[restriction] || 0) + 1;
            });
          }
          
          if (prefs?.cuisineTypes) {
            prefs.cuisineTypes.forEach((cuisine: string) => {
              cuisineTypesData[cuisine] = (cuisineTypesData[cuisine] || 0) + 1;
            });
          }
        } catch (error) {
          console.error('Error parsing culinary preferences:', error);
        }
      });

    const total = analyticsData.filter(d => d.culinary_preferences).length;
    
    return {
      dietaryRestrictions: Object.entries(dietaryRestrictionsData)
        .map(([name, count]) => ({ 
          name, 
          count, 
          percentage: total > 0 ? (count as number / total) * 100 : 0 
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      cuisineTypes: Object.entries(cuisineTypesData)
        .map(([name, count]) => ({ 
          name, 
          count, 
          percentage: total > 0 ? (count as number / total) * 100 : 0 
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    };
  };

  // Accommodation preferences analysis
  const getAccommodationStats = () => {
    const typesData: { [key: string]: number } = {};
    const amenitiesData: { [key: string]: number } = {};
    
    analyticsData
      .filter(d => d.accommodation_preferences)
      .forEach(d => {
        try {
          const prefs = typeof d.accommodation_preferences === 'string' 
            ? JSON.parse(d.accommodation_preferences) 
            : d.accommodation_preferences;
          
          if (prefs?.accommodationTypes) {
            prefs.accommodationTypes.forEach((type: string) => {
              typesData[type] = (typesData[type] || 0) + 1;
            });
          }
          
          if (prefs?.amenities) {
            prefs.amenities.forEach((amenity: string) => {
              amenitiesData[amenity] = (amenitiesData[amenity] || 0) + 1;
            });
          }
        } catch (error) {
          console.error('Error parsing accommodation preferences:', error);
        }
      });

    const total = analyticsData.filter(d => d.accommodation_preferences).length;
    
    return {
      types: Object.entries(typesData)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      amenities: Object.entries(amenitiesData)
        .map(([name, count]) => ({ 
          name, 
          count, 
          percentage: total > 0 ? (count as number / total) * 100 : 0 
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
    };
  };

  // Activity preferences analysis
  const getActivityStats = () => {
    const categoriesData: { [key: string]: number } = {};
    const intensityData: { [key: string]: number } = {};
    
    analyticsData
      .filter(d => d.activity_preferences)
      .forEach(d => {
        try {
          const prefs = typeof d.activity_preferences === 'string' 
            ? JSON.parse(d.activity_preferences) 
            : d.activity_preferences;
          
          if (prefs?.categories) {
            prefs.categories.forEach((category: string) => {
              categoriesData[category] = (categoriesData[category] || 0) + 1;
            });
          }
          
          if (prefs?.intensityLevel) {
            intensityData[prefs.intensityLevel] = (intensityData[prefs.intensityLevel] || 0) + 1;
          }
        } catch (error) {
          console.error('Error parsing activity preferences:', error);
        }
      });

    const total = analyticsData.filter(d => d.activity_preferences).length;
    
    return {
      categories: Object.entries(categoriesData)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      intensityLevels: Object.entries(intensityData)
        .map(([name, count]) => ({ 
          name, 
          count, 
          percentage: total > 0 ? (count as number / total) * 100 : 0 
        }))
        .sort((a, b) => b.count - a.count)
    };
  };

  // Regional statistics analysis
  const getRegionalStats = () => {
    const regionData = analyticsData
      .filter(d => d.user_region)
      .reduce((acc: any, d) => {
        acc[d.user_region] = (acc[d.user_region] || 0) + 1;
        return acc;
      }, {});

    const total = analyticsData.filter(d => d.user_region).length;
    
    return Object.entries(regionData)
      .map(([region, count]) => ({ 
        region, 
        count, 
        percentage: total > 0 ? ((count as number / total) * 100).toFixed(1) : 0 
      }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 8);
  };

  // Emitter basin detailed statistics
  const getEmitterBasinStats = () => {
    const basins: { [key: string]: any } = {};
    
    analyticsData.forEach(d => {
      if (!d.user_country) return;
      
      if (!basins[d.user_country]) {
        basins[d.user_country] = {
          country: d.user_country,
          totalSessions: 0,
          completedSessions: 0,
          budgets: [],
          destinations: []
        };
      }
      
      basins[d.user_country].totalSessions++;
      
      if (d.completion_status === 'completed') {
        basins[d.user_country].completedSessions++;
      }
      
      if (d.budget_amount) {
        basins[d.user_country].budgets.push(d.budget_amount);
      }
      
      if (d.destinations) {
        try {
          const dests = typeof d.destinations === 'string' 
            ? JSON.parse(d.destinations) 
            : d.destinations;
          if (Array.isArray(dests)) {
            dests.forEach((dest: any) => {
              if (dest.country) {
                basins[d.user_country].destinations.push(dest.country);
              }
            });
          }
        } catch (error) {
          console.error('Error parsing destinations:', error);
        }
      }
    });

    return Object.values(basins).map((basin: any) => {
      const conversionRate = basin.totalSessions > 0 
        ? ((basin.completedSessions / basin.totalSessions) * 100).toFixed(1)
        : '0';
      
      const avgBudget = basin.budgets.length > 0
        ? (basin.budgets.reduce((a: number, b: number) => a + b, 0) / basin.budgets.length).toFixed(0)
        : '0';
      
      const destCounts = basin.destinations.reduce((acc: any, dest: string) => {
        acc[dest] = (acc[dest] || 0) + 1;
        return acc;
      }, {});
      
      const topDestinations = Object.entries(destCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 2)
        .map(([dest, count]) => dest)
        .join(', ') || 'N/A';

      return {
        ...basin,
        conversionRate,
        avgBudget,
        topDestinations
      };
    })
    .sort((a: any, b: any) => b.totalSessions - a.totalSessions)
    .slice(0, 9);
  };

  // Export functions
  const handleExportJSON = () => {
    try {
      const exportData = {
        analyticsData,
        stats: {
          totalSessions,
          uniqueCountries,
          completedSessions,
          averageBudget
        },
        selectedCountry,
        timeRange
      };
      exportToJSON(exportData);
      toast({ title: "Export JSON réussi", description: "Les données ont été exportées en JSON" });
    } catch (error) {
      toast({ title: "Erreur d'export", description: "Impossible d'exporter en JSON", variant: "destructive" });
    }
  };

  const handleExportCSV = () => {
    try {
      const exportData = {
        analyticsData,
        stats: {
          totalSessions,
          uniqueCountries,
          completedSessions,
          averageBudget
        },
        selectedCountry,
        timeRange
      };
      exportToCSV(exportData);
      toast({ title: "Export CSV réussi", description: "Les données ont été exportées en CSV" });
    } catch (error) {
      toast({ title: "Erreur d'export", description: "Impossible d'exporter en CSV", variant: "destructive" });
    }
  };

  const handleExportPDF = async () => {
    try {
      toast({ title: "Génération PDF en cours...", description: "Veuillez patienter pendant la génération" });
      const exportData = {
        analyticsData,
        stats: {
          totalSessions,
          uniqueCountries,
          completedSessions,
          averageBudget
        },
        selectedCountry,
        timeRange
      };
      await exportToPDF(exportData);
      toast({ title: "Export PDF réussi", description: "Le rapport PDF a été généré avec succès" });
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast({ title: "Erreur d'export", description: "Impossible de générer le PDF", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tendances de Voyage</h2>
        <div className="flex gap-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <FileText className="h-4 w-4 mr-2" />
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par pays" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les pays</SelectItem>
              {countries.map((country) => (
                <SelectItem key={country.id} value={country.name}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 derniers jours</SelectItem>
              <SelectItem value="30">30 derniers jours</SelectItem>
              <SelectItem value="90">90 derniers jours</SelectItem>
              <SelectItem value="365">1 an</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions Totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pays Uniques</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueCountries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Conversion</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalSessions > 0 ? ((completedSessions / totalSessions) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Moyen</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageBudget ? `${averageBudget.toFixed(0)}€` : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="geography">Géographie</TabsTrigger>
          <TabsTrigger value="preferences">Préférences</TabsTrigger>
          <TabsTrigger value="trends">Tendances</TabsTrigger>
          <TabsTrigger value="data">Données Brutes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Distribution des Niveaux de Budget</CardTitle>
              </CardHeader>
              <CardContent data-chart="budget-pie">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={budgetChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ level, count }) => `${level}: ${count}`}
                    >
                      {budgetChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Types de Groupes de Voyage</CardTitle>
              </CardHeader>
              <CardContent data-chart="group-bar">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={groupChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="geography" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Bassins Émetteurs - Top Pays</CardTitle>
              </CardHeader>
              <CardContent data-chart="country-bar">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={countryChartData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="country" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Répartition Régionale</CardTitle>
              </CardHeader>
              <CardContent data-chart="regional-pie">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getRegionalStats()}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ region, count, percentage }) => `${region}: ${percentage}%`}
                    >
                      {getRegionalStats().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Analyse Détaillée des Bassins Émetteurs</CardTitle>
            </CardHeader>
              <CardContent data-analysis="basin">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getEmitterBasinStats().map((basin, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold">{basin.country}</h4>
                      <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                        {basin.totalSessions} sessions
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Taux de conversion:</span>
                        <span className="font-medium">{basin.conversionRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Budget moyen:</span>
                        <span className="font-medium">{basin.avgBudget}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Destinations préférées:</span>
                        <span className="font-medium text-xs">{basin.topDestinations}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          {/* Préférences Culinaires */}
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Utensils className="h-4 w-4 mr-2" />
              <CardTitle className="text-lg">Préférences Culinaires</CardTitle>
            </CardHeader>
            <CardContent data-preferences="culinary">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Restrictions Alimentaires</h4>
                  <div className="space-y-2">
                    {getCulinaryStats().dietaryRestrictions.map((restriction, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{restriction.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${restriction.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{restriction.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Types de Cuisine</h4>
                  <div className="space-y-2">
                    {getCulinaryStats().cuisineTypes.map((cuisine, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{cuisine.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${cuisine.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{cuisine.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Préférences d'Hébergement */}
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Bed className="h-4 w-4 mr-2" />
              <CardTitle className="text-lg">Préférences d'Hébergement</CardTitle>
            </CardHeader>
            <CardContent data-preferences="accommodation">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Types d'Hébergement</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={getAccommodationStats().types}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Équipements Recherchés</h4>
                  <div className="space-y-2">
                    {getAccommodationStats().amenities.map((amenity, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{amenity.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${amenity.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{amenity.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Préférences d'Activités */}
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Activity className="h-4 w-4 mr-2" />
              <CardTitle className="text-lg">Préférences d'Activités</CardTitle>
            </CardHeader>
            <CardContent data-preferences="activity">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Catégories d'Activités</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={getActivityStats().categories}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="count"
                        label={({ name, count }) => `${name}: ${count}`}
                      >
                        {getActivityStats().categories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Niveaux d'Intensité</h4>
                  <div className="space-y-2">
                    {getActivityStats().intensityLevels.map((level, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{level.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${level.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{level.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Évolution des Sessions</CardTitle>
            </CardHeader>
            <CardContent data-chart="trends-line">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="sessions" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Table className="h-5 w-5 mr-2" />
              <CardTitle>Tableau Récapitulatif des Données</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Chargement des données...</div>
              ) : (
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <UITable>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky top-0 bg-background">Session ID</TableHead>
                        <TableHead className="sticky top-0 bg-background">Pays</TableHead>
                        <TableHead className="sticky top-0 bg-background">Ville</TableHead>
                        <TableHead className="sticky top-0 bg-background">Région</TableHead>
                        <TableHead className="sticky top-0 bg-background">Type de Groupe</TableHead>
                        <TableHead className="sticky top-0 bg-background">Taille Groupe</TableHead>
                        <TableHead className="sticky top-0 bg-background">Niveau Budget</TableHead>
                        <TableHead className="sticky top-0 bg-background">Montant Budget</TableHead>
                        <TableHead className="sticky top-0 bg-background">Devise</TableHead>
                        <TableHead className="sticky top-0 bg-background">Destinations</TableHead>
                        <TableHead className="sticky top-0 bg-background">Préf. Culinaires</TableHead>
                        <TableHead className="sticky top-0 bg-background">Préf. Hébergement</TableHead>
                        <TableHead className="sticky top-0 bg-background">Préf. Activités</TableHead>
                        <TableHead className="sticky top-0 bg-background">Statut</TableHead>
                        <TableHead className="sticky top-0 bg-background">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAnalyticsData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs">{item.session_id?.substring(0, 12)}...</TableCell>
                          <TableCell>{item.user_country || '-'}</TableCell>
                          <TableCell>{item.user_city || '-'}</TableCell>
                          <TableCell>{item.user_region || '-'}</TableCell>
                          <TableCell>{item.travel_group_type || '-'}</TableCell>
                          <TableCell>{item.travel_group_size || '-'}</TableCell>
                          <TableCell>{item.budget_level || '-'}</TableCell>
                          <TableCell>{item.budget_amount ? `${item.budget_amount}` : '-'}</TableCell>
                          <TableCell>{item.budget_currency || '-'}</TableCell>
                          <TableCell className="max-w-[200px]">
                            {item.destinations ? (
                              <div className="text-xs">
                                {Array.isArray(item.destinations) 
                                  ? item.destinations.map((dest: any, i: number) => (
                                      <div key={i}>{dest.name || dest}</div>
                                    )).slice(0, 2)
                                  : typeof item.destinations === 'string' 
                                    ? item.destinations.substring(0, 50) + '...'
                                    : JSON.stringify(item.destinations).substring(0, 50) + '...'
                                }
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="max-w-[150px]">
                            {item.culinary_preferences ? (
                              <div className="text-xs">
                                {typeof item.culinary_preferences === 'string' 
                                  ? item.culinary_preferences.substring(0, 30) + '...'
                                  : JSON.stringify(item.culinary_preferences).substring(0, 30) + '...'
                                }
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="max-w-[150px]">
                            {item.accommodation_preferences ? (
                              <div className="text-xs">
                                {typeof item.accommodation_preferences === 'string' 
                                  ? item.accommodation_preferences.substring(0, 30) + '...'
                                  : JSON.stringify(item.accommodation_preferences).substring(0, 30) + '...'
                                }
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="max-w-[150px]">
                            {item.activity_preferences ? (
                              <div className="text-xs">
                                {typeof item.activity_preferences === 'string' 
                                  ? item.activity_preferences.substring(0, 30) + '...'
                                  : JSON.stringify(item.activity_preferences).substring(0, 30) + '...'
                                }
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              item.completion_status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : item.completion_status === 'in_progress'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {item.completion_status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">
                            {new Date(item.created_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </UITable>
                  {analyticsData.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucune donnée disponible pour la période sélectionnée
                    </div>
                  )}
                </div>
              )}

              {/* Pagination for Analytics Data */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={goToPreviousPage}
                          className={!canGoPrevious ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {[...Array(totalPages)].map((_, index) => {
                        const pageNumber = index + 1;
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              onClick={() => goToPage(pageNumber)}
                              isActive={currentPage === pageNumber}
                              className="cursor-pointer"
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={goToNextPage}
                          className={!canGoNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
