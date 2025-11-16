import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { systemSettingsService, SystemSetting } from '@/services/systemSettingsService';

export interface SystemSettingsState {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  emailNotifications: boolean;
  partnerRegistration: boolean;
  automaticVerification: boolean;
  maxFileSize: string;
  sessionTimeout: string;
  apiRateLimit: string;
  enableAnalytics: boolean;
  enableGeolocation: boolean;
  defaultLanguage: string;
  currency: string;
  timeZone: string;
}

const mapSettingsToState = (settings: SystemSetting[]): SystemSettingsState => {
  const settingsMap = settings.reduce((acc, setting) => {
    let value: any = setting.setting_value;
    
    if (setting.setting_type === 'boolean') {
      value = setting.setting_value === 'true';
    } else if (setting.setting_type === 'number') {
      value = setting.setting_value;
    }
    
    acc[setting.setting_key] = value;
    return acc;
  }, {} as any);

  return {
    siteName: settingsMap.site_name || 'Voyage AI',
    siteDescription: settingsMap.site_description || 'Plateforme de recommandations touristiques',
    maintenanceMode: settingsMap.maintenance_mode || false,
    registrationEnabled: settingsMap.registration_enabled || true,
    emailNotifications: settingsMap.email_notifications || true,
    partnerRegistration: settingsMap.partner_registration || true,
    automaticVerification: settingsMap.automatic_verification || false,
    maxFileSize: settingsMap.max_file_size || '10',
    sessionTimeout: settingsMap.session_timeout || '24',
    apiRateLimit: settingsMap.api_rate_limit || '1000',
    enableAnalytics: settingsMap.enable_analytics || true,
    enableGeolocation: settingsMap.enable_geolocation || true,
    defaultLanguage: settingsMap.default_language || 'fr',
    currency: settingsMap.currency || 'EUR',
    timeZone: settingsMap.time_zone || 'Europe/Paris'
  };
};

export const useSystemSettings = () => {
  const [settings, setSettings] = useState<SystemSettingsState>({
    siteName: 'Voyage AI',
    siteDescription: 'Plateforme de recommandations touristiques',
    maintenanceMode: false,
    registrationEnabled: true,
    emailNotifications: true,
    partnerRegistration: true,
    automaticVerification: false,
    maxFileSize: '10',
    sessionTimeout: '24',
    apiRateLimit: '1000',
    enableAnalytics: true,
    enableGeolocation: true,
    defaultLanguage: 'fr',
    currency: 'EUR',
    timeZone: 'Europe/Paris'
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await systemSettingsService.list();
      if (data) {
        const mappedSettings = mapSettingsToState(data);
        setSettings(mappedSettings);
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string | boolean | number) => {
    const settingKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    const stringValue = String(value);

    try {
      await systemSettingsService.update(settingKey, { setting_value: stringValue });
    } catch (error) {
      console.error('Error updating setting:', error);
      throw error;
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const settingsToUpdate = [
        { key: 'site_name', value: settings.siteName },
        { key: 'site_description', value: settings.siteDescription },
        { key: 'maintenance_mode', value: settings.maintenanceMode },
        { key: 'registration_enabled', value: settings.registrationEnabled },
        { key: 'email_notifications', value: settings.emailNotifications },
        { key: 'partner_registration', value: settings.partnerRegistration },
        { key: 'automatic_verification', value: settings.automaticVerification },
        { key: 'max_file_size', value: settings.maxFileSize },
        { key: 'session_timeout', value: settings.sessionTimeout },
        { key: 'api_rate_limit', value: settings.apiRateLimit },
        { key: 'enable_analytics', value: settings.enableAnalytics },
        { key: 'enable_geolocation', value: settings.enableGeolocation },
        { key: 'default_language', value: settings.defaultLanguage },
        { key: 'currency', value: settings.currency },
        { key: 'time_zone', value: settings.timeZone }
      ];

      await Promise.all(settingsToUpdate.map((setting) => updateSetting(setting.key, setting.value)));

      toast.success('Paramètres sauvegardés avec succès');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetToDefaults = async () => {
    const defaultSettings = {
      siteName: 'Voyage AI',
      siteDescription: 'Plateforme de recommandations touristiques',
      maintenanceMode: false,
      registrationEnabled: true,
      emailNotifications: true,
      partnerRegistration: true,
      automaticVerification: false,
      maxFileSize: '10',
      sessionTimeout: '24',
      apiRateLimit: '1000',
      enableAnalytics: true,
      enableGeolocation: true,
      defaultLanguage: 'fr',
      currency: 'EUR',
      timeZone: 'Europe/Paris'
    };

    setSettings(defaultSettings);
    toast.success('Paramètres réinitialisés aux valeurs par défaut');
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    saving,
    handleSettingChange,
    saveSettings,
    resetToDefaults,
    refetch: fetchSettings
  };
};
