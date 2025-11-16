import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Bell, 
  Clock, 
  MapPin, 
  Calendar, 
  CheckCircle, 
  Trash2, 
  CheckCircle2,
  Building2,
  Map
} from 'lucide-react';

interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'activity_reminder':
      return <Clock className="w-4 h-4" />;
    case 'trip_start':
      return <MapPin className="w-4 h-4" />;
    case 'trip_end':
      return <Calendar className="w-4 h-4" />;
    case 'new_partner':
      return <Building2 className="w-4 h-4" />;
    case 'new_poi':
      return <Map className="w-4 h-4" />;
    default:
      return <Bell className="w-4 h-4" />;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'activity_reminder':
      return 'bg-blue-500';
    case 'trip_start':
      return 'bg-green-500';
    case 'trip_end':
      return 'bg-orange-500';
    case 'new_partner':
      return 'bg-purple-500';
    case 'new_poi':
      return 'bg-emerald-500';
    default:
      return 'bg-gray-500';
  }
};

export const NotificationDialog: React.FC<NotificationDialogProps> = ({
  open,
  onOpenChange
}) => {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount
  } = useNotifications();

  const unreadCount = getUnreadCount();

  const formatScheduledTime = (scheduledFor: string) => {
    const date = new Date(scheduledFor);
    const now = new Date();
    
    if (date > now) {
      return `Dans ${formatDistanceToNow(date, { locale: fr })}`;
    } else {
      return formatDistanceToNow(date, { locale: fr, addSuffix: true });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Tout marquer comme lu
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[500px]">
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune notification</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border rounded-lg transition-colors ${
                    notification.is_read 
                      ? 'bg-background border-border' 
                      : 'bg-muted/30 border-primary/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${getNotificationColor(notification.type)} text-white`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm truncate">
                          {notification.title}
                        </h4>
                        <div className="flex items-center gap-1">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="h-6 w-6 p-0"
                              title="Marquer comme lu"
                            >
                              <CheckCircle className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {formatScheduledTime(notification.scheduled_for)}
                        </Badge>
                        {notification.is_sent && (
                          <Badge variant="secondary" className="text-xs">
                            Envoyé
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};