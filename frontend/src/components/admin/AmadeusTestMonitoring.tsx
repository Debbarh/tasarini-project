import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Database, 
  Globe, 
  Settings,
  TrendingUp,
  Zap,
  FlaskConical
} from 'lucide-react';
import { amadeusTestEnhancer } from '@/services/amadeusTestEnhancer';
import { cacheService } from '@/services/cacheService';

export const AmadeusTestMonitoring = () => {
  const [usageStats, setUsageStats] = useState<Record<string, number>>({});
  const [cacheStats, setCacheStats] = useState<any>({});
  const [config, setConfig] = useState({
    enableImageEnhancement: true,
    enableDataEnrichment: true,
    showTestBadges: true,
    mockBookingUrls: true,
    enableCaching: true,
  });

  useEffect(() => {
    const loadStats = () => {
      setUsageStats(amadeusTestEnhancer.getUsageStats());
      setCacheStats(cacheService.getStats());
    };

    loadStats();
    const interval = setInterval(loadStats, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const updateConfig = (key: string, value: boolean) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    amadeusTestEnhancer.updateConfig(newConfig);
  };

  const totalCalls = Object.values(usageStats).reduce((sum, count) => sum + count, 0);
  const dailyLimit = 1000; // Assuming 1000 calls per day for test APIs

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monitoring APIs Test Amadeus</h2>
          <p className="text-muted-foreground">
            Surveillance et configuration des APIs de test
          </p>
        </div>
        <Badge variant="outline" className="text-sm inline-flex items-center gap-1">
          <FlaskConical className="w-4 h-4" /> Mode Test
        </Badge>
      </div>

      {/* Usage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appels Total</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls}</div>
            <p className="text-xs text-muted-foreground">
              Aujourd'hui
            </p>
            <Progress 
              value={(totalCalls / dailyLimit) * 100} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((totalCalls / dailyLimit) * 100)}% du quota utilisé
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recherches Hôtels</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats['hotel-search'] || 0}</div>
            <p className="text-xs text-muted-foreground">
              Appels API aujourd'hui
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recherches Vols</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats['flight-search'] || 0}</div>
            <p className="text-xs text-muted-foreground">
              Appels API aujourd'hui
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cacheStats.hitRate ? `${Math.round(cacheStats.hitRate * 100)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              Efficacité du cache
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration des Optimisations
          </CardTitle>
          <CardDescription>
            Paramètres pour améliorer l'expérience avec les APIs de test
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="image-enhancement">Amélioration des images</Label>
                  <p className="text-xs text-muted-foreground">
                    Utilise Unsplash pour compléter les images manquantes
                  </p>
                </div>
                <Switch
                  id="image-enhancement"
                  checked={config.enableImageEnhancement}
                  onCheckedChange={(checked) => updateConfig('enableImageEnhancement', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="data-enrichment">Enrichissement des données</Label>
                  <p className="text-xs text-muted-foreground">
                    Génère des descriptions et équipements réalistes
                  </p>
                </div>
                <Switch
                  id="data-enrichment"
                  checked={config.enableDataEnrichment}
                  onCheckedChange={(checked) => updateConfig('enableDataEnrichment', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="test-badges">Badges de test</Label>
                  <p className="text-xs text-muted-foreground">
                    Affiche des indicateurs pour les données de test
                  </p>
                </div>
                <Switch
                  id="test-badges"
                  checked={config.showTestBadges}
                  onCheckedChange={(checked) => updateConfig('showTestBadges', checked)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="mock-booking">URLs de réservation test</Label>
                  <p className="text-xs text-muted-foreground">
                    Génère des liens de réservation vers l'env. test
                  </p>
                </div>
                <Switch
                  id="mock-booking"
                  checked={config.mockBookingUrls}
                  onCheckedChange={(checked) => updateConfig('mockBookingUrls', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-caching">Cache intelligent</Label>
                  <p className="text-xs text-muted-foreground">
                    Met en cache les données enrichies pour de meilleures performances
                  </p>
                </div>
                <Switch
                  id="enable-caching"
                  checked={config.enableCaching}
                  onCheckedChange={(checked) => updateConfig('enableCaching', checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status des Endpoints</CardTitle>
          <CardDescription>
            Statut et utilisation des différents endpoints Amadeus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(usageStats).map(([endpoint, count]) => (
              <div key={endpoint} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{endpoint}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline">
                    {count} appels
                  </Badge>
                  <Badge variant="secondary">
                    {count > 50 ? 'Actif' : 'Peu utilisé'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cache Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Statistiques du Cache
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{cacheStats.totalEntries || 0}</div>
              <p className="text-xs text-muted-foreground">Entrées totales</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{cacheStats.hits || 0}</div>
              <p className="text-xs text-muted-foreground">Cache hits</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{cacheStats.misses || 0}</div>
              <p className="text-xs text-muted-foreground">Cache misses</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {cacheStats.memoryUsage ? `${Math.round(cacheStats.memoryUsage / 1024)}KB` : '0KB'}
              </div>
              <p className="text-xs text-muted-foreground">Utilisation mémoire</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warnings and Recommendations */}
      <Card className="border-orange-200 bg-orange-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="h-5 w-5" />
            Recommandations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Zap className="h-4 w-4 text-orange-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">APIs de Test Utilisées</p>
              <p className="text-xs text-muted-foreground">
                Les données proviennent des APIs de test Amadeus. En production, activez les clés API production pour des données complètes.
              </p>
            </div>
          </div>
          
          {totalCalls > dailyLimit * 0.8 && (
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Quota Proche de la Limite</p>
                <p className="text-xs text-muted-foreground">
                  Vous avez utilisé {Math.round((totalCalls / dailyLimit) * 100)}% de votre quota quotidien.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Cache Actif</p>
              <p className="text-xs text-muted-foreground">
                Le système de cache réduit les appels API répétitifs et améliore les performances.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};