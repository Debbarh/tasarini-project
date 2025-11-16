import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle, AlertTriangle, Calendar, Euro } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { partnerService, PartnerNotificationDTO } from '@/services/partnerService';

interface PartnerNotificationSystemProps {
  className?: string;
}

export const PartnerNotificationSystem: React.FC<PartnerNotificationSystemProps> = ({
  className = ''
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<PartnerNotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await partnerService.listNotifications({ limit: 20 });
      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Impossible de charger les notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await partnerService.markNotificationRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === Number(notificationId) ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.is_read);
      await Promise.all(unread.map((notif) => partnerService.markNotificationRead(notif.id)));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('Toutes les notifications ont été marquées comme lues');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_received':
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'booking_confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'booking_cancelled':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'commission_ready':
        return <Euro className="w-4 h-4 text-yellow-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'booking_received':
        return 'border-l-blue-500';
      case 'booking_confirmed':
        return 'border-l-green-500';
      case 'booking_cancelled':
        return 'border-l-red-500';
      case 'commission_ready':
        return 'border-l-yellow-500';
      default:
        return 'border-l-gray-500';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
            >
              Tout marquer lu
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">
            Chargement des notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucune notification pour le moment</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`
                  p-3 border-l-4 rounded-r-lg cursor-pointer transition-colors
                  ${getNotificationColor(notification.category)}
                  ${notification.is_read ? 'bg-muted/30' : 'bg-background border shadow-sm'}
                  hover:bg-muted/50
                `}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1">
                    {getNotificationIcon(notification.category)}
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium text-sm ${!notification.is_read ? 'font-semibold' : ''}`}>
                        {notification.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.body}
                      </p>
                      
                      {notification.metadata && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {notification.metadata.booking_reference && (
                            <Badge variant="outline" className="text-xs">
                              Réf: {notification.metadata.booking_reference}
                            </Badge>
                          )}
                          {notification.metadata.amount && (
                            <Badge variant="outline" className="text-xs">
                              {notification.metadata.amount}€
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                
                {!notification.is_read && (
                  <div className="w-2 h-2 bg-primary rounded-full absolute top-2 right-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
