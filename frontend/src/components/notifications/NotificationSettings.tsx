import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotifications } from '@/hooks/useNotifications';
import { Settings, Bell, Clock, Calendar, Mail } from 'lucide-react';

export const NotificationSettings: React.FC = () => {
  const { preferences, updatePreferences, loading } = useNotifications();

  const handlePreferenceChange = (key: string, value: boolean | number) => {
    updatePreferences({ [key]: value });
  };

  if (!preferences) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-muted-foreground">Chargement des préférences...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Préférences de Notifications
        </CardTitle>
        <CardDescription>
          Configurez vos notifications pour les activités et voyages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Types de notifications */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Types de notifications
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-normal">Rappels d'activités</Label>
                <p className="text-xs text-muted-foreground">
                  Recevoir des rappels avant vos activités planifiées
                </p>
              </div>
              <Switch
                checked={preferences.activity_reminders}
                onCheckedChange={(checked) => handlePreferenceChange('activity_reminders', checked)}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-normal">Début de voyage</Label>
                <p className="text-xs text-muted-foreground">
                  Notification au début de votre voyage
                </p>
              </div>
              <Switch
                checked={preferences.trip_start_reminders}
                onCheckedChange={(checked) => handlePreferenceChange('trip_start_reminders', checked)}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-normal">Fin de voyage</Label>
                <p className="text-xs text-muted-foreground">
                  Notification à la fin de votre voyage
                </p>
              </div>
              <Switch
                checked={preferences.trip_end_reminders}
                onCheckedChange={(checked) => handlePreferenceChange('trip_end_reminders', checked)}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Timing des rappels */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Timing des rappels
          </h4>
          
          <div className="space-y-2">
            <Label className="text-sm">Rappel avant l'activité</Label>
            <Select
              value={preferences.reminder_hours_before.toString()}
              onValueChange={(value) => handlePreferenceChange('reminder_hours_before', parseInt(value))}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 heure avant</SelectItem>
                <SelectItem value="2">2 heures avant</SelectItem>
                <SelectItem value="6">6 heures avant</SelectItem>
                <SelectItem value="12">12 heures avant</SelectItem>
                <SelectItem value="24">24 heures avant</SelectItem>
                <SelectItem value="48">48 heures avant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Canaux de notification */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Canaux de notification
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-normal">Notifications dans l'app</Label>
                <p className="text-xs text-muted-foreground">
                  Afficher les notifications dans l'application
                </p>
              </div>
              <Switch
                checked={preferences.push_notifications}
                onCheckedChange={(checked) => handlePreferenceChange('push_notifications', checked)}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-normal">Notifications par email</Label>
                <p className="text-xs text-muted-foreground">
                  Recevoir des emails de rappel (bientôt disponible)
                </p>
              </div>
              <Switch
                checked={preferences.email_notifications}
                onCheckedChange={(checked) => handlePreferenceChange('email_notifications', checked)}
                disabled={true} // Désactivé pour le moment
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};