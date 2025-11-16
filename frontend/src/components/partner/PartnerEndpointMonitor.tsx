import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  TrendingUp,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { partnerService } from '@/services/partnerService';

interface EndpointHealth {
  id: string;
  partner_id: string;
  endpoint_url: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time_ms: number;
  last_checked: string;
  error_message?: string;
  uptime_percentage: number;
  success_rate_24h: number;
}

interface PartnerEndpointMonitorProps {
  className?: string;
}

export const PartnerEndpointMonitor: React.FC<PartnerEndpointMonitorProps> = ({
  className = ''
}) => {
  const [endpoints, setEndpoints] = useState<EndpointHealth[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    fetchEndpointHealth();
    const interval = setInterval(fetchEndpointHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchEndpointHealth = async () => {
    setLoading(true);
    try {
      const data = await partnerService.listEndpointHealth();
      const mapped = data.map<EndpointHealth>((endpoint) => ({
        id: String(endpoint.id),
        partner_id: String(endpoint.partner || ''),
        endpoint_url: endpoint.endpoint_url,
        status: endpoint.status,
        response_time_ms: endpoint.response_time_ms,
        last_checked: endpoint.last_checked || new Date().toISOString(),
        uptime_percentage: Number(endpoint.uptime_percentage),
        success_rate_24h: Number(endpoint.success_rate_24h),
        error_message: endpoint.error_message,
      }));
      setEndpoints(mapped);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching endpoint health:', error);
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      await partnerService.runEndpointHealthCheck();
      setTimeout(fetchEndpointHealth, 1500);
    } catch (error) {
      console.error('Error running health check:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime < 500) return 'text-green-600';
    if (responseTime < 2000) return 'text-yellow-600';
    return 'text-red-600';
  };

  const overallHealth = endpoints.length > 0 
    ? endpoints.filter(e => e.status === 'healthy').length / endpoints.length * 100
    : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Surveillance des Endpoints
            {endpoints.length > 0 && (
              <Badge 
                variant="outline" 
                className={overallHealth >= 80 ? 'border-green-500 text-green-700' : 
                          overallHealth >= 50 ? 'border-yellow-500 text-yellow-700' : 
                          'border-red-500 text-red-700'}
              >
                {overallHealth.toFixed(0)}% opérationnel
              </Badge>
            )}
          </CardTitle>
          
          <Button
            variant="outline"
            size="sm"
            onClick={runHealthCheck}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Vérifier
          </Button>
        </div>
        
        {lastUpdate && (
          <p className="text-sm text-muted-foreground">
            Dernière mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}
          </p>
        )}
      </CardHeader>
      
      <CardContent>
        {loading && endpoints.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            Vérification des endpoints...
          </div>
        ) : endpoints.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wifi className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucun endpoint configuré</p>
            <p className="text-xs mt-1">
              Configurez vos endpoints dans les paramètres partenaire
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overall Health Bar */}
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Santé globale</span>
                <span className="text-sm text-muted-foreground">
                  {endpoints.filter(e => e.status === 'healthy').length} / {endpoints.length} actifs
                </span>
              </div>
              <Progress value={overallHealth} className="h-2" />
            </div>

            {/* Endpoint List */}
            <div className="space-y-3">
              {endpoints.map((endpoint) => (
                <div
                  key={endpoint.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(endpoint.status)}
                      <span className="font-medium text-sm truncate">
                        {endpoint.endpoint_url}
                      </span>
                    </div>
                    <Badge className={getStatusColor(endpoint.status)}>
                      {endpoint.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Temps de réponse:</span>
                      <span className={`ml-1 font-medium ${getResponseTimeColor(endpoint.response_time_ms)}`}>
                        {endpoint.response_time_ms}ms
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Disponibilité:</span>
                      <span className="ml-1 font-medium">
                        {endpoint.uptime_percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Succès 24h:</span>
                      <span className="ml-1 font-medium">
                        {endpoint.success_rate_24h.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dernière vérif:</span>
                      <span className="ml-1 font-medium">
                        {new Date(endpoint.last_checked).toLocaleTimeString('fr-FR')}
                      </span>
                    </div>
                  </div>

                  {endpoint.error_message && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {endpoint.error_message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>

            {/* Health Tips */}
            {overallHealth < 80 && (
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  <strong>Conseils pour améliorer la santé:</strong>
                  <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                    <li>Vérifiez que vos serveurs sont accessibles</li>
                    <li>Optimisez les temps de réponse (objectif &lt; 500ms)</li>
                    <li>Implémentez une surveillance proactive</li>
                    <li>Configurez des alertes automatiques</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
