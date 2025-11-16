import { useState, useCallback } from 'react';
import { apiClient } from '@/integrations/api/client';
import { toast } from 'sonner';

export interface PartnerManagementActions {
  validatePartner: (partnerId: string, action: 'approve' | 'reject' | 'suspend', reason?: string, adminMessage?: string) => Promise<void>;
  updatePartner: (partnerId: string, data: Partial<PartnerData>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendMessage: (partnerId: string, message: string, type: string) => Promise<void>;
  updateSubscription: (partnerId: string, subscriptionType: string) => Promise<void>;
  getPartnerAnalytics: (partnerId: string) => Promise<PartnerAnalytics>;
  bulkUpdatePOIs: (poiIds: string[], status: string) => Promise<void>;
}

export interface PartnerData {
  company_name?: string;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  description?: string;
  subscription_type?: string;
  logo_url?: string;
}

export interface PartnerAnalytics {
  totalPOIs: number;
  approvedPOIs: number;
  pendingPOIs: number;
  rejectedPOIs: number;
  totalViews: number;
  totalBookings: number;
  monthlyRevenue: number;
  performanceScore: number;
}

export const usePartnerManagement = (): PartnerManagementActions => {
  const [isLoading, setIsLoading] = useState(false);

  const validatePartner = useCallback(async (
    partnerId: string, 
    action: 'approve' | 'reject' | 'suspend', 
    reason?: string, 
    adminMessage?: string
  ) => {
    setIsLoading(true);
    try {
      await apiClient.post(`partners/profiles/${partnerId}/moderate/`, {
        action,
        reason,
        admin_message: adminMessage,
      });
      toast.success(`Partenaire ${action === 'approve' ? 'approuvé' : action === 'reject' ? 'refusé' : 'suspendu'} avec succès`);
    } catch (error: any) {
      console.error('Erreur lors de la validation:', error);
      toast.error('Erreur lors de la validation du partenaire');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePartner = useCallback(async (partnerId: string, data: Partial<PartnerData>) => {
    setIsLoading(true);
    try {
      await apiClient.patch(`partners/profiles/${partnerId}/`, data);
      toast.success('Partenaire mis à jour avec succès');
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour du partenaire');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      // Placeholder: integrate with Django password reset when ready
      toast.info('La réinitialisation sera prochainement disponible.');
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      toast.error('Erreur lors de l\'envoi de l\'email de réinitialisation');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (partnerId: string, message: string, type: string) => {
    setIsLoading(true);
    try {
      await apiClient.post(`partners/profiles/${partnerId}/send_message/`, {
        message,
        type,
      });
      toast.success('Message envoyé avec succès');
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error);
      toast.error('Erreur lors de l\'envoi du message');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSubscription = useCallback(async (partnerId: string, subscriptionType: string) => {
    setIsLoading(true);
    try {
      await apiClient.post(`partners/profiles/${partnerId}/update_subscription/`, {
        subscription_type: subscriptionType,
      });
      toast.success('Abonnement mis à jour avec succès');
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour de l\'abonnement:', error);
      toast.error('Erreur lors de la mise à jour de l\'abonnement');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPartnerAnalytics = useCallback(async (partnerId: string): Promise<PartnerAnalytics> => {
    try {
      const analytics = await apiClient.get<PartnerAnalytics>(`partners/${partnerId}/analytics/`);
      return analytics;
    } catch (error: any) {
      console.error('Erreur lors de la récupération des analytics:', error);
      throw error;
    }
  }, []);

  const bulkUpdatePOIs = useCallback(async (poiIds: string[], status: string) => {
    setIsLoading(true);
    try {
      await apiClient.post('partners/bulk-poi-status/', {
        poi_ids: poiIds,
        status,
      });
      toast.success(`${poiIds.length} POI(s) mis à jour avec succès`);
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour en masse:', error);
      toast.error('Erreur lors de la mise à jour en masse des POIs');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    validatePartner,
    updatePartner,
    resetPassword,
    sendMessage,
    updateSubscription,
    getPartnerAnalytics,
    bulkUpdatePOIs
  };
};
