import { useState, useEffect } from 'react';
import { apiClient } from '@/integrations/api/client';

export interface SecurityCheck {
  id: string;
  table_name: string;
  check_type: string;
  status: 'passed' | 'warning' | 'critical';
  message: string;
  recommendation: string;
  details?: any;
}

export interface SecurityStats {
  total_tables: number;
  protected_tables: number;
  unprotected_tables: number;
  total_policies: number;
  security_score: number;
  last_scan: string;
}

export interface SecurityAlert {
  id: string;
  type: 'policy_violation' | 'unauthorized_access' | 'missing_rls' | 'weak_policy';
  message: string;
  table_name?: string;
  user_id?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

export const useSecurityData = () => {
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const performSecurityScan = async () => {
    try {
      setScanning(true);

      const [poiData, auditLogs] = await Promise.all([
        apiClient.get<any[]>('poi/tourist-points/', { limit: 100 }),
        apiClient.get<any[]>('admin/audit-logs/', { limit: 1 }),
      ]);

      const totalPoi = poiData?.length ?? 0;
      const approvedPoi = poiData?.filter((poi) => poi.status_enum === 'approved').length ?? 0;

      const checks: SecurityCheck[] = [
        {
          id: 'poi_validation',
          table_name: 'tourist_points',
          check_type: 'validation_status',
          status: approvedPoi === totalPoi ? 'passed' : approvedPoi / totalPoi > 0.7 ? 'warning' : 'critical',
          message: `${approvedPoi}/${totalPoi} POI validés`,
          recommendation: 'Vérifier les POI en attente ou rejetés pour s’assurer qu’ils ne restent pas accessibles involontairement.',
          details: { approvedPoi, totalPoi },
        },
        {
          id: 'audit_log_activity',
          table_name: 'admin_audit_logs',
          check_type: 'audit_log',
          status: auditLogs && auditLogs.length > 0 ? 'passed' : 'warning',
          message: auditLogs?.length ? 'Les logs d’audit sont actifs.' : 'Aucune activité récente dans les logs.',
          recommendation: 'S’assurer que les actions sensibles sont journalisées.',
          details: { sampleLog: auditLogs?.[0] },
        },
      ];

      setSecurityChecks(checks);

      const passedChecks = checks.filter(c => c.status === 'passed').length;
      const totalChecks = checks.length;
      const securityScore = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

      setStats({
        total_tables: 2,
        protected_tables: passedChecks,
        unprotected_tables: totalChecks - passedChecks,
        total_policies: totalChecks,
        security_score: securityScore,
        last_scan: new Date().toISOString()
      });

    } catch (error) {
      console.error('Erreur lors du scan de sécurité:', error);
      
      // Fallback avec données minimales en cas d'erreur
      setSecurityChecks([{
        id: 'error',
        table_name: 'system',
        check_type: 'scan_error',
        status: 'critical',
        message: 'Impossible d\'effectuer le scan de sécurité',
        recommendation: 'Vérifiez les permissions et la connexion à la base de données'
      }]);
      
      setStats({
        total_tables: 0,
        protected_tables: 0,
        unprotected_tables: 0,
        total_policies: 0,
        security_score: 0,
        last_scan: new Date().toISOString()
      });
    } finally {
      setScanning(false);
    }
  };

  const fetchSecurityAlerts = async () => {
    try {
      const alertsData = await apiClient.get<any[]>('admin/audit-logs/', { limit: 50 });

      // Transformer les logs d'audit en alertes de sécurité
      const alerts: SecurityAlert[] = (alertsData || [])
        .filter(log => 
          log.action === 'RLS_VIOLATION' || 
          log.action === 'UNAUTHORIZED_ACCESS' ||
          log.target_type === 'security_critical'
        )
        .map(log => {
          const details = log.details as any;
          return {
            id: log.id,
            type: log.action === 'RLS_VIOLATION' ? 'policy_violation' as const : 'unauthorized_access' as const,
            message: details?.message || `Action ${log.action} sur ${log.target_type}`,
            table_name: log.target_type,
            user_id: log.admin_id,
            timestamp: log.created_at,
            severity: details?.security_level === 'CRITICAL_FINANCIAL' ? 'critical' as const : 'medium' as const,
            resolved: false
          };
        });

      setAlerts(alerts);
    } catch (error) {
      console.error('Erreur lors du chargement des alertes:', error);
      setAlerts([]);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      // Marquer l'alerte comme résolue (on pourrait ajouter une table dédiée)
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, resolved: true } : alert
      ));
      
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la résolution de l\'alerte:', error);
      return { success: false, error: 'Impossible de résoudre l\'alerte' };
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([
        performSecurityScan(),
        fetchSecurityAlerts()
      ]);
      setLoading(false);
    };

    initializeData();
  }, []);

  return {
    securityChecks,
    stats,
    alerts,
    loading,
    scanning,
    performSecurityScan,
    fetchSecurityAlerts,
    resolveAlert
  };
};
