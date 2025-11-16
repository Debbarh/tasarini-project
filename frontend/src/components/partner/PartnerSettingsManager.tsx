import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Settings,
  Bell,
  Mail,
  Smartphone,
  Shield,
  CreditCard,
  Globe,
  User,
  Building2,
  Save,
  Eye,
  EyeOff,
  Clock
} from 'lucide-react';

interface PartnerSettings {
  // Profile settings
  company_name: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  website_url: string;
  logo_url: string;
  
  // Notification preferences
  email_notifications: {
    bookings: boolean;
    payments: boolean;
    reviews: boolean;
    marketing: boolean;
  };
  sms_notifications: {
    urgent_only: boolean;
    bookings: boolean;
  };
  
  // Privacy settings
  profile_visibility: 'public' | 'partners_only' | 'private';
  show_contact_info: boolean;
  show_response_time: boolean;
  
  // Business settings
  auto_approve_bookings: boolean;
  allow_reviews: boolean;
  business_hours: {
    [key: string]: { open: string; close: string; closed: boolean };
  };
}

const PartnerSettingsManager: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [settings, setSettings] = useState<PartnerSettings>({
    company_name: 'Mon Entreprise',
    description: 'Description de mon entreprise...',
    contact_email: 'contact@monentreprise.com',
    contact_phone: '+33 1 23 45 67 89',
    website_url: 'https://monentreprise.com',
    logo_url: '',
    email_notifications: {
      bookings: true,
      payments: true,
      reviews: true,
      marketing: false
    },
    sms_notifications: {
      urgent_only: true,
      bookings: false
    },
    profile_visibility: 'public',
    show_contact_info: true,
    show_response_time: true,
    auto_approve_bookings: false,
    allow_reviews: true,
    business_hours: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '10:00', close: '16:00', closed: false },
      sunday: { open: '10:00', close: '16:00', closed: true }
    }
  });

  const saveSettings = async () => {
    try {
      setLoading(true);
      
      // Mock save - in reality, we'd update the database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Paramètres sauvegardés avec succès');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationSetting = (category: 'email' | 'sms', key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [`${category}_notifications`]: {
        ...(prev[`${category}_notifications` as keyof PartnerSettings] as Record<string, boolean>),
        [key]: value
      }
    }));
  };

  const updateBusinessHours = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: {
          ...prev.business_hours[day],
          [field]: value
        }
      }
    }));
  };

  const dayNames = {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche'
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Paramètres Partenaire</h1>
          <p className="text-muted-foreground">Gérez vos préférences et paramètres d'entreprise</p>
        </div>
        <Button onClick={saveSettings} disabled={loading}>
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-8">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Informations d'entreprise
              </CardTitle>
              <CardDescription>
                Gérez les informations publiques de votre entreprise
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Nom de l'entreprise</Label>
                  <Input
                    id="company_name"
                    value={settings.company_name}
                    onChange={(e) => setSettings(prev => ({ ...prev, company_name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email de contact</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={settings.contact_email}
                    onChange={(e) => setSettings(prev => ({ ...prev, contact_email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Téléphone</Label>
                  <Input
                    id="contact_phone"
                    value={settings.contact_phone}
                    onChange={(e) => setSettings(prev => ({ ...prev, contact_phone: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="website_url">Site web</Label>
                  <Input
                    id="website_url"
                    value={settings.website_url}
                    onChange={(e) => setSettings(prev => ({ ...prev, website_url: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={settings.description}
                  onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Choisissez comment vous souhaitez être notifié
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <h4 className="font-medium">Notifications par email</h4>
                </div>
                
                <div className="space-y-3 ml-6">
                  {Object.entries(settings.email_notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm capitalize">
                        {key === 'bookings' && 'Nouvelles réservations'}
                        {key === 'payments' && 'Paiements reçus'}
                        {key === 'reviews' && 'Nouveaux avis'}
                        {key === 'marketing' && 'Offres marketing'}
                      </span>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) => updateNotificationSetting('email', key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* SMS Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  <h4 className="font-medium">Notifications SMS</h4>
                </div>
                
                <div className="space-y-3 ml-6">
                  {Object.entries(settings.sms_notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm">
                        {key === 'urgent_only' && 'Urgent uniquement'}
                        {key === 'bookings' && 'Réservations'}
                      </span>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) => updateNotificationSetting('sms', key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Horaires d'ouverture
              </CardTitle>
              <CardDescription>
                Définissez vos horaires de disponibilité
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(settings.business_hours).map(([day, hours]) => (
                  <div key={day} className="flex items-center gap-4">
                    <div className="w-20 text-sm font-medium">
                      {dayNames[day as keyof typeof dayNames]}
                    </div>
                    
                    <Switch
                      checked={!hours.closed}
                      onCheckedChange={(checked) => updateBusinessHours(day, 'closed', !checked)}
                    />
                    
                    {!hours.closed && (
                      <>
                        <Input
                          type="time"
                          value={hours.open}
                          onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                          className="w-32"
                        />
                        <span className="text-muted-foreground">à</span>
                        <Input
                          type="time"
                          value={hours.close}
                          onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                          className="w-32"
                        />
                      </>
                    )}
                    
                    {hours.closed && (
                      <span className="text-muted-foreground text-sm">Fermé</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-8">
          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Confidentialité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Afficher les infos de contact</span>
                  <Switch
                    checked={settings.show_contact_info}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, show_contact_info: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Temps de réponse visible</span>
                  <Switch
                    checked={settings.show_response_time}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, show_response_time: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Paramètres métier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Approbation automatique</span>
                  <Switch
                    checked={settings.auto_approve_bookings}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_approve_bookings: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Autoriser les avis</span>
                  <Switch
                    checked={settings.allow_reviews}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, allow_reviews: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Access */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Accès API
              </CardTitle>
              <CardDescription>
                Intégrez nos services dans vos applications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Clé API</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value="sk_live_abc123def456..."
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Utilisez cette clé pour accéder à notre API
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input placeholder="https://votre-site.com/webhook" />
                <p className="text-xs text-muted-foreground">
                  Recevez des notifications en temps réel
                </p>
              </div>

              <Button variant="outline" className="w-full">
                Voir la documentation API
              </Button>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle>Statut du compte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Statut partenaire</span>
                <Badge variant="default" className="bg-green-500">Approuvé</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Abonnement</span>
                <Badge variant="outline">Basic</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Prochaine facturation</span>
                <span className="text-sm text-muted-foreground">15 Fév 2024</span>
              </div>

              <Separator />

              <Button variant="outline" className="w-full text-destructive">
                Suspendre le compte
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PartnerSettingsManager;