import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { partnerService, PartnerNotificationDTO } from '@/services/partnerService';
import { 
  Bell, 
  Check, 
  Star, 
  TrendingUp, 
  AlertTriangle,
  DollarSign,
  FileText,
  UserCheck,
  MapPin,
  Eye
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

const PartnerNotifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<PartnerNotificationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await partnerService.listNotifications({ limit: 50 });

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
      toast.error('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await partnerService.markNotificationRead(notificationId);

      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erreur lors du marquage:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);

      if (unreadIds.length === 0) return;

      // Mark all as read sequentially
      await Promise.all(unreadIds.map(id => partnerService.markNotificationRead(id)));

      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('Toutes les notifications ont été marquées comme lues');
    } catch (error) {
      console.error('Erreur lors du marquage global:', error);
      toast.error('Erreur lors du marquage des notifications');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'account_approved':
        return <UserCheck className="w-5 h-5 text-green-500" />;
      case 'account_rejected':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'point_verified':
        return <MapPin className="w-5 h-5 text-green-500" />;
      case 'point_rejected':
        return <MapPin className="w-5 h-5 text-red-500" />;
      case 'new_review':
        return <Star className="w-5 h-5 text-yellow-500" />;
      case 'monthly_report':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'subscription_expiring':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'commission_payment':
        return <DollarSign className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'account_approved':
        return <Badge variant="default" className="bg-green-500">Approuvé</Badge>;
      case 'account_rejected':
        return <Badge variant="destructive">Refusé</Badge>;
      case 'point_verified':
        return <Badge variant="default" className="bg-green-500">Vérifié</Badge>;
      case 'point_rejected':
        return <Badge variant="destructive">Refusé</Badge>;
      case 'new_review':
        return <Badge variant="secondary">Avis</Badge>;
      case 'monthly_report':
        return <Badge variant="outline">Rapport</Badge>;
      case 'subscription_expiring':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Expiration</Badge>;
      case 'commission_payment':
        return <Badge variant="default" className="bg-green-500">Paiement</Badge>;
      default:
        return <Badge variant="outline">Info</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 3600);

    if (diffInHours < 1) {
      return 'À l\'instant';
    } else if (diffInHours < 24) {
      return `Il y a ${Math.floor(diffInHours)} h`;
    } else if (diffInHours < 168) { // 7 days
      return `Il y a ${Math.floor(diffInHours / 24)} j`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}` : 'Aucune notification non lue'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline">
            <Check className="w-4 h-4 mr-2" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="text-center p-12">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune notification</h3>
              <p className="text-muted-foreground">
                Vous recevrez ici les notifications importantes concernant votre compte partenaire.
              </p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`transition-all hover:shadow-md ${
                !notification.is_read ? 'border-blue-200 bg-blue-50/30' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">
                          {notification.title}
                        </h3>
                        {getNotificationBadge(notification.type)}
                        {!notification.is_read && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                            Nouveau
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                      {notification.message}
                    </p>

                    {/* Additional data display */}
                    {notification.data && Object.keys(notification.data).length > 0 && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        {notification.data.pointName && (
                          <div>Point d'intérêt: {notification.data.pointName}</div>
                        )}
                        {notification.data.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current text-yellow-500" />
                            Note: {notification.data.rating}/5
                          </div>
                        )}
                        {notification.data.amount && (
                          <div>Montant: {notification.data.amount}€</div>
                        )}
                      </div>
                    )}

                    {!notification.is_read && (
                      <div className="mt-3 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Marquer comme lu
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Load more button if needed */}
      {notifications.length >= 50 && (
        <div className="text-center">
          <Button variant="outline" onClick={fetchNotifications}>
            Charger plus de notifications
          </Button>
        </div>
      )}
    </div>
  );
};

export default PartnerNotifications;