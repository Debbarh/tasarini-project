import { useState, useCallback } from 'react';
import { adminService } from '@/services/adminService';
import { useToast } from '@/hooks/use-toast';

const getPublicIp = async (): Promise<string | undefined> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.warn('Unable to retrieve IP address', error);
    return undefined;
  }
};

export const useAdminSecurity = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const logAdminAction = useCallback(
    async (action: string, targetType: string, targetId?: string, details?: Record<string, unknown>) => {
      try {
        const ipAddress = await getPublicIp();
        await adminService.logAuditAction({
          action,
          target_type: targetType,
          target_id: targetId,
          details,
          ip_address: ipAddress,
          user_agent: navigator.userAgent,
        });
      } catch (error) {
        console.error('Failed to log admin action:', error);
      }
    },
    [],
  );

  const createAdminSession = useCallback(async () => {
    try {
      setLoading(true);
      const ipAddress = await getPublicIp();
      const session = await adminService.createSession({
        ip_address: ipAddress,
        user_agent: navigator.userAgent,
      });
      localStorage.setItem('admin_session_token', session.session_token);
      return session.session_token;
    } catch (error) {
      console.error('Failed to create admin session:', error);
      toast({
        title: 'Erreur de session',
        description: "Impossible de créer la session administrateur",
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const validateAdminSession = useCallback(async () => {
    try {
      const sessionToken = localStorage.getItem('admin_session_token');
      if (!sessionToken) {
        return false;
      }
      const result = await adminService.validateSession(sessionToken);
      if (!result.valid) {
        localStorage.removeItem('admin_session_token');
      }
      return result.valid;
    } catch (error) {
      console.error('Failed to validate admin session:', error);
      return false;
    }
  }, []);

  const revokeAdminSession = useCallback(async () => {
    try {
      const sessionToken = localStorage.getItem('admin_session_token');
      if (!sessionToken) return;
      await adminService.revokeSession(sessionToken);
      localStorage.removeItem('admin_session_token');
    } catch (error) {
      console.error('Failed to revoke admin session:', error);
    }
  }, []);

  const checkAdminPermission = useCallback(
    async (permissionType: string, action: 'create' | 'read' | 'update' | 'delete') => {
      try {
        const result = await adminService.checkPermission({
          permission_type: permissionType,
          action,
        });
        return result.has_permission;
      } catch (error) {
        console.error('Failed to check admin permission:', error);
        return false;
      }
    },
    [],
  );

  return {
    loading,
    logAdminAction,
    createAdminSession,
    validateAdminSession,
    revokeAdminSession,
    checkAdminPermission,
  };
};
