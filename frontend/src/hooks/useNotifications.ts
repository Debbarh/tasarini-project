import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService, NotificationDTO, NotificationPreferenceDTO } from '@/services/notificationService';
import { partnerService, PartnerNotificationDTO } from '@/services/partnerService';
import { adminPoiService } from '@/services/adminPoiService';
import type { AdminPoi } from '@/services/adminPoiService';

interface Notification extends Omit<NotificationDTO, 'id' | 'user'> {
  id: string;
  metadata?: Record<string, unknown>;
  source?: 'user' | 'partner' | 'poi';
}

export const useNotifications = () => {
  const { user, hasRole } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [partnerNotifications, setPartnerNotifications] = useState<PartnerNotificationDTO[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferenceDTO | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const userNotifications = await notificationService.list({ limit: 100 });

      let adminPartnerData: PartnerNotificationDTO[] = [];
      let recentPois: AdminPoi[] = [];

      if (hasRole('admin')) {
        [adminPartnerData, recentPois] = await Promise.all([
          partnerService.listNotifications({ limit: 50 }),
          adminPoiService.list({ ordering: '-created_at', page_size: 25 }),
        ]);
      }

      const adminPartnerNotifications = adminPartnerData.map((pn) => ({
        id: String(pn.id),
        itinerary_id: null,
        activity_id: null,
        type: 'new_partner' as const,
        title: pn.title,
          message: pn.body ?? pn.message ?? '',
          scheduled_for: pn.created_at,
          is_read: pn.is_read,
          is_sent: true,
          created_at: pn.created_at,
          source: 'partner' as const,
        })) || [];

      setPartnerNotifications(adminPartnerData);

      const adminPoiNotifications = recentPois.map((poi) => ({
        id: `poi_${poi.id}`,
        itinerary_id: null,
        activity_id: null,
        type: 'new_poi' as const,
        title: 'Nouveau point d’intérêt soumis',
        message: `"${poi.name}" - Statut: ${poi.status_enum}`,
        scheduled_for: poi.created_at,
        is_read: false,
        is_sent: true,
        created_at: poi.created_at,
        source: 'poi' as const,
      }));

      const formattedUserNotifications: Notification[] = userNotifications.map((notif) => ({
        ...notif,
        id: String(notif.id),
        source: 'user' as const,
      }));

      const allNotifications = [
        ...formattedUserNotifications,
        ...adminPartnerNotifications,
        ...adminPoiNotifications,
      ];
      allNotifications.sort((a, b) => new Date(b.scheduled_for).getTime() - new Date(a.scheduled_for).getTime());
      
      setNotifications(allNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Erreur lors du chargement des notifications');
    }
  };

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      const data = await notificationService.getPreferences();
      setPreferences(data);
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await notificationService.updatePreferences(newPreferences);
      setPreferences(data);
      toast.success('Préférences mises à jour');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Find if it's a partner notification
      const isPartnerNotification = partnerNotifications.find(pn => String(pn.id) === notificationId);
      
      if (isPartnerNotification) {
        await partnerService.markNotificationRead(isPartnerNotification.id);
        setPartnerNotifications(prev =>
          prev.map(pn =>
            String(pn.id) === notificationId ? { ...pn, is_read: true } : pn
          )
        );
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId ? { ...notif, is_read: true } : notif
          )
        );
      } else {
        await notificationService.markRead(notificationId);
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId ? { ...notif, is_read: true } : notif
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      await notificationService.markAllRead();

      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true }))
      );

      toast.success('Toutes les notifications marquées comme lues');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const isPartnerNotification = partnerNotifications.find(pn => String(pn.id) === notificationId);
      if (isPartnerNotification) {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        toast.success('Notification supprimée');
        return;
      }
      if (notificationId.startsWith('poi_')) {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        toast.success('Notification supprimée');
        return;
      }
      await notificationService.delete(notificationId);
      setNotifications(prev =>
        prev.filter(notif => notif.id !== notificationId)
      );
      toast.success('Notification supprimée');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getUnreadCount = () => {
    return notifications.filter(n => !n.is_read).length;
  };

  const getUpcomingNotifications = () => {
    const now = new Date();
    const upcoming = notifications.filter(n => {
      const scheduledTime = new Date(n.scheduled_for);
      return scheduledTime > now && !n.is_sent;
    });
    return upcoming.slice(0, 5);
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchPreferences();

      // Set up real-time subscription for admin users to receive partner notifications
      const interval = setInterval(fetchNotifications, 60000);
      return () => {
        clearInterval(interval);
      };
    }
  }, [user, hasRole]);

  return {
    notifications,
    preferences,
    loading,
    fetchNotifications,
    updatePreferences,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
    getUpcomingNotifications
  };
};
