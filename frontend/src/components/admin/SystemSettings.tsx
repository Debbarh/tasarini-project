import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Database, Shield, Globe, Zap, Loader2 } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import CountriesCitiesManagement from "./CountriesCitiesManagement";
import TravelGroupManagement from "./TravelGroupManagement";
import BudgetManagement from "./BudgetManagement";
import { CulinaryManagement } from "./CulinaryManagement";
import { AccommodationManagement } from "./AccommodationManagement";
import { ActivityManagement } from "./ActivityManagement";

const SystemSettings = () => {
  const {
    settings,
    loading,
    saving,
    handleSettingChange,
    saveSettings,
    resetToDefaults
  } = useSystemSettings();

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Paramètres système
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Paramètres système
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="security">Sécurité</TabsTrigger>
              <TabsTrigger value="technical">Technique</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-8">
          {/* Paramètres généraux */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4" />
              <h3 className="font-semibold">Paramètres généraux</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">Nom du site</Label>
                <Input
                  id="siteName"
                  value={settings.siteName}
                  onChange={(e) => handleSettingChange('siteName', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="defaultLanguage">Langue par défaut</Label>
                <Input
                  id="defaultLanguage"
                  value={settings.defaultLanguage}
                  onChange={(e) => handleSettingChange('defaultLanguage', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency">Devise</Label>
                <Input
                  id="currency"
                  value={settings.currency}
                  onChange={(e) => handleSettingChange('currency', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timeZone">Fuseau horaire</Label>
                <Input
                  id="timeZone"
                  value={settings.timeZone}
                  onChange={(e) => handleSettingChange('timeZone', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteDescription">Description du site</Label>
              <Input
                id="siteDescription"
                value={settings.siteDescription}
                onChange={(e) => handleSettingChange('siteDescription', e.target.value)}
              />
            </div>
          </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-8">
          <Separator />

          {/* Paramètres de sécurité */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4" />
              <h3 className="font-semibold">Sécurité et accès</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mode maintenance</Label>
                  <p className="text-sm text-muted-foreground">
                    Désactive l'accès au site pour tous les utilisateurs sauf les admins
                  </p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => handleSettingChange('maintenanceMode', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Inscription ouverte</Label>
                  <p className="text-sm text-muted-foreground">
                    Permet aux nouveaux utilisateurs de s'inscrire
                  </p>
                </div>
                <Switch
                  checked={settings.registrationEnabled}
                  onCheckedChange={(checked) => handleSettingChange('registrationEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Inscription partenaires</Label>
                  <p className="text-sm text-muted-foreground">
                    Permet aux entreprises de devenir partenaires
                  </p>
                </div>
                <Switch
                  checked={settings.partnerRegistration}
                  onCheckedChange={(checked) => handleSettingChange('partnerRegistration', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Vérification automatique</Label>
                  <p className="text-sm text-muted-foreground">
                    Vérifie automatiquement les nouveaux points d'intérêt
                  </p>
                </div>
                <Switch
                  checked={settings.automaticVerification}
                  onCheckedChange={(checked) => handleSettingChange('automaticVerification', checked)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Timeout session (heures)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => handleSettingChange('sessionTimeout', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="apiRateLimit">Limite API (req/h)</Label>
                <Input
                  id="apiRateLimit"
                  type="number"
                  value={settings.apiRateLimit}
                  onChange={(e) => handleSettingChange('apiRateLimit', e.target.value)}
                />
              </div>
            </div>
          </div>
            </TabsContent>

            <TabsContent value="technical" className="space-y-8">
          <Separator />

          {/* Paramètres techniques */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4" />
              <h3 className="font-semibold">Paramètres techniques</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Analytics activés</Label>
                  <p className="text-sm text-muted-foreground">
                    Collecte des données d'utilisation
                  </p>
                </div>
                <Switch
                  checked={settings.enableAnalytics}
                  onCheckedChange={(checked) => handleSettingChange('enableAnalytics', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Géolocalisation</Label>
                  <p className="text-sm text-muted-foreground">
                    Permet la localisation automatique des utilisateurs
                  </p>
                </div>
                <Switch
                  checked={settings.enableGeolocation}
                  onCheckedChange={(checked) => handleSettingChange('enableGeolocation', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notifications email</Label>
                  <p className="text-sm text-muted-foreground">
                    Envoie des emails de notification
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxFileSize">Taille max fichiers (MB)</Label>
              <Input
                id="maxFileSize"
                type="number"
                value={settings.maxFileSize}
                onChange={(e) => handleSettingChange('maxFileSize', e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={saveSettings} 
              className="flex-1"
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sauvegarder les paramètres
            </Button>
            <Button 
              variant="outline" 
              onClick={resetToDefaults} 
              className="flex-1"
              disabled={saving}
            >
              Réinitialiser aux valeurs par défaut
            </Button>
          </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Informations système */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Informations système
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Version de l'application</Label>
              <p className="text-sm font-mono bg-muted p-2 rounded">v1.0.0</p>
            </div>
            <div className="space-y-2">
              <Label>Base de données</Label>
              <p className="text-sm font-mono bg-muted p-2 rounded">PostgreSQL 15</p>
            </div>
            <div className="space-y-2">
              <Label>Dernière sauvegarde</Label>
              <p className="text-sm font-mono bg-muted p-2 rounded">11/08/2024 21:30</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSettings;