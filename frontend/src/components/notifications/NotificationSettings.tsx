import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotifications } from '@/hooks/useNotifications';
import { Settings, Bell, Clock, Calendar, Mail } from 'lucide-react';

export const NotificationSettings: React.FC = () => {
  const { t } = useTranslation();
  const { preferences, updatePreferences, loading } = useNotifications();

  const handlePreferenceChange = (key: string, value: boolean | number) => {
    updatePreferences({ [key]: value });
  };

  if (!preferences) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-muted-foreground">{t('notifications.settings.loading')}</p>
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
          {t('notifications.settings.title')}
        </CardTitle>
        <CardDescription>
          {t('notifications.settings.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Types de notifications */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Bell className="w-4 h-4" />
            {t('notifications.settings.types.title')}
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-normal">{t('notifications.settings.types.activityReminders')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('notifications.settings.types.activityRemindersDesc')}
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
                <Label className="text-sm font-normal">{t('notifications.settings.types.tripStart')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('notifications.settings.types.tripStartDesc')}
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
                <Label className="text-sm font-normal">{t('notifications.settings.types.tripEnd')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('notifications.settings.types.tripEndDesc')}
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
            {t('notifications.settings.timing.title')}
          </h4>
          
          <div className="space-y-2">
            <Label className="text-sm">{t('notifications.settings.timing.before')}</Label>
            <Select
              value={preferences.reminder_hours_before.toString()}
              onValueChange={(value) => handlePreferenceChange('reminder_hours_before', parseInt(value))}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t('notifications.settings.timing.1h')}</SelectItem>
                <SelectItem value="2">{t('notifications.settings.timing.2h')}</SelectItem>
                <SelectItem value="6">{t('notifications.settings.timing.6h')}</SelectItem>
                <SelectItem value="12">{t('notifications.settings.timing.12h')}</SelectItem>
                <SelectItem value="24">{t('notifications.settings.timing.24h')}</SelectItem>
                <SelectItem value="48">{t('notifications.settings.timing.48h')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Canaux de notification */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Mail className="w-4 h-4" />
            {t('notifications.settings.channels.title')}
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-normal">{t('notifications.settings.channels.inApp')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('notifications.settings.channels.inAppDesc')}
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
                <Label className="text-sm font-normal">{t('notifications.settings.channels.email')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('notifications.settings.channels.emailDesc')}
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