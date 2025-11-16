import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, AlertTriangle, CheckCircle, XCircle, Eye, Database, RefreshCw, Activity } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import RLSPolicyManager from './RLSPolicyManager';
import RoleManagement from './RoleManagement';
import { useSecurityData } from '@/hooks/useSecurityData';
import { Skeleton } from '@/components/ui/skeleton';

const RLSSecurityDashboard = () => {
  const { 
    securityChecks, 
    stats, 
    alerts, 
    loading, 
    scanning, 
    performSecurityScan, 
    resolveAlert 
  } = useSecurityData();
  const { toast } = useToast();


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-5 h-5 text-success" />;
      case 'critical': return <XCircle className="w-5 h-5 text-destructive" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-warning" />;
      default: return <AlertTriangle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive/10 text-destructive';
      case 'high': return 'bg-destructive/20 text-destructive';
      case 'medium': return 'bg-warning/10 text-warning';
      case 'low': return 'bg-success/10 text-success';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-4 border rounded-lg">
                  <Skeleton className="w-5 h-5 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Overview Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Score de sécurité</p>
                  <p className="text-2xl font-bold">{stats.security_score}%</p>
                  <Progress value={stats.security_score} className="mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Tables protégées</p>
                  <p className="text-2xl font-bold">{stats.protected_tables}</p>
                  <p className="text-xs text-muted-foreground">
                    sur {stats.total_tables} total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <div>
                  <p className="text-sm text-muted-foreground">Tables non protégées</p>
                  <p className="text-2xl font-bold">{stats.unprotected_tables}</p>
                  <p className="text-xs text-muted-foreground">
                    Nécessitent attention
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-info" />
                <div>
                  <p className="text-sm text-muted-foreground">Politiques RLS</p>
                  <p className="text-2xl font-bold">{stats.total_policies}</p>
                  <p className="text-xs text-muted-foreground">
                    Dernier scan: {new Date(stats.last_scan).toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="policies">Politiques RLS</TabsTrigger>
          <TabsTrigger value="roles">Gestion des rôles</TabsTrigger>
          <TabsTrigger value="alerts">Alertes sécurité</TabsTrigger>
          <TabsTrigger value="audit">Audit & Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
            {/* Security Checks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Vérifications de sécurité
                </CardTitle>
                <Button 
                  onClick={performSecurityScan} 
                  disabled={scanning}
                  variant="outline"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
                  {scanning ? 'Scan en cours...' : 'Nouveau scan'}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {securityChecks.map((check) => (
                    <div key={check.id} className="flex items-start gap-3 p-4 border rounded-lg">
                      {getStatusIcon(check.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{check.table_name} - {check.check_type}</h4>
                          <Badge className={getSeverityColor(check.status === 'critical' ? 'critical' : check.status === 'warning' ? 'medium' : 'low')}>
                            {check.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {check.message}
                        </p>
                        {check.recommendation && (
                          <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                            Recommandation: {check.recommendation}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Alertes récentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="flex items-center gap-3 p-3 border rounded">
                      <AlertTriangle className={`w-4 h-4 ${alert.resolved ? 'text-muted-foreground' : 'text-warning'}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.message}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(alert.timestamp).toLocaleString('fr-FR')}</span>
                          {alert.table_name && <span>• Table: {alert.table_name}</span>}
                        </div>
                      </div>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      {!alert.resolved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveAlert(alert.id)}
                        >
                          Résoudre
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="policies">
          <RLSPolicyManager />
        </TabsContent>

        <TabsContent value="roles">
          <RoleManagement />
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Toutes les alertes de sécurité</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Sévérité</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <Badge variant="outline">{alert.type}</Badge>
                      </TableCell>
                      <TableCell>{alert.message}</TableCell>
                      <TableCell>{alert.table_name || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(alert.timestamp).toLocaleString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        {alert.resolved ? (
                          <Badge className="bg-success/10 text-success">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Résolu
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Actif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!alert.resolved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Logs d'audit récents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Actions d'administration récentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.slice(0, 10).map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{alert.message}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>{new Date(alert.timestamp).toLocaleString('fr-FR')}</span>
                          {alert.table_name && (
                            <>
                              <span>•</span>
                              <span>Table: {alert.table_name}</span>
                            </>
                          )}
                          <span>•</span>
                          <Badge variant="outline" className="text-xs px-1">
                            {alert.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Statistiques d'activité */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Activité système
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Alertes actives</span>
                    <span className="font-medium">
                      {alerts.filter(a => !a.resolved).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Alertes résolues aujourd'hui</span>
                    <span className="font-medium">
                      {alerts.filter(a => a.resolved && 
                        new Date(a.timestamp).toDateString() === new Date().toDateString()
                      ).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Scans de sécurité</span>
                    <span className="font-medium">
                      {stats ? new Date(stats.last_scan).toLocaleDateString('fr-FR') : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Score de sécurité</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{stats?.security_score || 0}%</span>
                      <Progress value={stats?.security_score || 0} className="w-16 h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RLSSecurityDashboard;