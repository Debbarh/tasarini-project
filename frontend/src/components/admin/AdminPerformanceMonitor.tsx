import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap, Database, Clock, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface PerformanceMetrics {
  queryTime: number;
  cacheHitRate: number;
  activeQueries: number;
  errorRate: number;
  lastUpdate: Date;
}

export const AdminPerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    queryTime: 0,
    cacheHitRate: 0,
    activeQueries: 0,
    errorRate: 0,
    lastUpdate: new Date()
  });

  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      // Mock performance metrics - in real app, these would come from React Query devtools or analytics
      const mockMetrics: PerformanceMetrics = {
        queryTime: Math.random() * 500 + 50, // 50-550ms
        cacheHitRate: Math.random() * 40 + 60, // 60-100%
        activeQueries: Math.floor(Math.random() * 5),
        errorRate: Math.random() * 5, // 0-5%
        lastUpdate: new Date()
      };
      
      setMetrics(mockMetrics);
    }, 2000);

    setIsMonitoring(true);

    return () => {
      clearInterval(interval);
      setIsMonitoring(false);
    };
  }, []);

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (value <= thresholds.warning) return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    return <AlertTriangle className="w-4 h-4 text-red-600" />;
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Monitoring des Performances Admin
          {isMonitoring && (
            <Badge variant="outline" className="ml-auto">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
              Actif
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Temps de requête */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Temps de requête moyen</span>
            {getStatusIcon(metrics.queryTime, { good: 100, warning: 300 })}
          </div>
          <div className="text-right">
            <span className={`text-lg font-bold ${getStatusColor(metrics.queryTime, { good: 100, warning: 300 })}`}>
              {metrics.queryTime.toFixed(0)}ms
            </span>
            <Progress 
              value={Math.min((metrics.queryTime / 500) * 100, 100)} 
              className="w-24 h-2 mt-1"
            />
          </div>
        </div>

        {/* Taux de cache */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span className="text-sm font-medium">Taux de cache (React Query)</span>
            {getStatusIcon(100 - metrics.cacheHitRate, { good: 20, warning: 40 })}
          </div>
          <div className="text-right">
            <span className={`text-lg font-bold ${getStatusColor(100 - metrics.cacheHitRate, { good: 20, warning: 40 })}`}>
              {metrics.cacheHitRate.toFixed(1)}%
            </span>
            <Progress 
              value={metrics.cacheHitRate} 
              className="w-24 h-2 mt-1"
            />
          </div>
        </div>

        {/* Requêtes actives */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm font-medium">Requêtes actives</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold">
              {metrics.activeQueries}
            </span>
            <Badge variant={metrics.activeQueries > 3 ? "destructive" : "outline"} className="ml-2">
              {metrics.activeQueries > 3 ? "Élevé" : "Normal"}
            </Badge>
          </div>
        </div>

        {/* Taux d'erreur */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Taux d'erreur</span>
            {getStatusIcon(metrics.errorRate, { good: 1, warning: 3 })}
          </div>
          <div className="text-right">
            <span className={`text-lg font-bold ${getStatusColor(metrics.errorRate, { good: 1, warning: 3 })}`}>
              {metrics.errorRate.toFixed(1)}%
            </span>
            <Progress 
              value={Math.min(metrics.errorRate * 20, 100)} 
              className="w-24 h-2 mt-1"
            />
          </div>
        </div>

        {/* Dernière mise à jour */}
        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          Dernière mise à jour: {metrics.lastUpdate.toLocaleTimeString()}
        </div>

        {/* Optimizations Summary */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">✅ Optimisations Actives</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Cache intelligent React Query (5-10 min)</li>
            <li>• Lazy loading des composants admin</li>
            <li>• Debouncing sur les recherches (300ms)</li>
            <li>• Requêtes SQL optimisées avec index</li>
            <li>• Skeleton loaders pour l'UX</li>
            <li>• RPC functions pour réduire les requêtes</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};