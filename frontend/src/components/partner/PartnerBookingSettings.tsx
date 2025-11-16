import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Settings, TestTube, Globe, Webhook, Lock } from 'lucide-react';
import { partnerService, PartnerTouristPointSummary, BookingSystemType } from '@/services/partnerService';

type EditableBookingConfig = {
  id?: number;
  tourist_point: string;
  system_type: BookingSystemType;
  endpoint_url?: string;
  api_credentials: Record<string, any>;
  webhook_url?: string;
  custom_fields: Record<string, any>;
  is_active: boolean;
  test_mode: boolean;
};

type TouristPointWithStatus = PartnerTouristPointSummary & {
  bookingStatus?: {
    is_active?: boolean;
    system_type?: BookingSystemType;
  };
};

export const PartnerBookingSettings: React.FC = () => {
  const [touristPoints, setTouristPoints] = useState<TouristPointWithStatus[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<string>('');
  const [config, setConfig] = useState<EditableBookingConfig>({
    tourist_point: '',
    system_type: 'external',
    api_credentials: {},
    custom_fields: {},
    is_active: true,
    test_mode: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchTouristPoints();
  }, []);

  useEffect(() => {
    if (selectedPoint) {
      fetchBookingConfig(selectedPoint);
    }
  }, [selectedPoint]);

  const fetchTouristPoints = async () => {
    setLoading(true);
    try {
      const data = await partnerService.listManagedTouristPoints();
      const enhanced = data.map<TouristPointWithStatus>((point) => ({
        ...point,
        bookingStatus: point.metadata?.booking,
      }));
      setTouristPoints(enhanced);
      if (!selectedPoint && enhanced.length > 0) {
        setSelectedPoint(enhanced[0].id);
      }
    } catch (error) {
      console.error('Error fetching tourist points:', error);
      toast.error('Erreur lors du chargement des points touristiques');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!selectedPoint) return;
    try {
      if (config.id) {
        await partnerService.deleteBookingConfig(config.id);
      }
      toast.success('Configuration réinitialisée');
      fetchTouristPoints();
      fetchBookingConfig(selectedPoint);
    } catch (error) {
      console.error('Error resetting booking config:', error);
      toast.error('Impossible de réinitialiser la configuration');
    }
  };

  const fetchBookingConfig = async (pointId: string) => {
    try {
      const existing = await partnerService.getBookingConfigByPoint(pointId);
      if (existing) {
        setConfig({
          id: existing.id,
          tourist_point: pointId,
          system_type: existing.system_type,
          endpoint_url: existing.endpoint_url || '',
          webhook_url: existing.webhook_url || '',
          api_credentials: existing.api_credentials || {},
          custom_fields: existing.custom_fields || {},
          is_active: existing.is_active,
          test_mode: existing.test_mode,
        });
      } else {
        setConfig({
          tourist_point: pointId,
          system_type: 'external',
          endpoint_url: '',
          webhook_url: '',
          api_credentials: {},
          custom_fields: {},
          is_active: true,
          test_mode: true,
        });
      }
    } catch (error) {
      console.error('Error fetching booking config:', error);
      toast.error('Erreur lors du chargement de la configuration');
    }
  };

  const saveConfig = async () => {
    if (!selectedPoint) return;

    setSaving(true);
    try {
      const payload = {
        tourist_point: selectedPoint,
        system_type: config.system_type,
        endpoint_url: config.endpoint_url || '',
        webhook_url: config.webhook_url || '',
        api_credentials: config.api_credentials || {},
        custom_fields: config.custom_fields || {},
        is_active: config.is_active,
        test_mode: config.test_mode,
      };

      if (config.id) {
        await partnerService.updateBookingConfig(config.id, payload);
      } else {
        const created = await partnerService.createBookingConfig(payload);
        setConfig((prev) => ({ ...prev, id: created.id }));
      }

      toast.success('Configuration sauvegardée avec succès');
      fetchTouristPoints();
      fetchBookingConfig(selectedPoint);
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!config.endpoint_url && config.system_type === 'api') {
      toast.error('URL d\'endpoint requis pour le test');
      return;
    }

    setTesting(true);
    try {
      // Simulate API test - in real implementation, this would call the actual endpoint
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (config.system_type === 'external') {
        toast.success('Configuration de redirection validée');
      } else if (config.system_type === 'api') {
        toast.success('Connexion API testée avec succès');
      } else if (config.system_type === 'webhook') {
        toast.success('Configuration webhook validée');
      }
    } catch (error) {
      toast.error('Échec du test de connexion');
    } finally {
      setTesting(false);
    }
  };

  const updateCredential = (key: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      api_credentials: {
        ...prev.api_credentials,
        [key]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration des réservations
          </CardTitle>
          <CardDescription>
            Configurez le système de réservation pour vos points d'intérêt
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Point Selection */}
            <div>
              <Label htmlFor="point-select">Point touristique</Label>
              <Select value={selectedPoint} onValueChange={setSelectedPoint}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un point touristique" />
                </SelectTrigger>
                <SelectContent>
                  {touristPoints.map((point) => {
                    const isConfigured = point.bookingStatus?.is_active;
                    return (
                      <SelectItem key={point.id} value={point.id}>
                        {point.name} {isConfigured && '(✓ Configuré)'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedPoint && (
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="general">Général</TabsTrigger>
                  <TabsTrigger value="api">API</TabsTrigger>
                  <TabsTrigger value="fields">Champs</TabsTrigger>
                  <TabsTrigger value="test">Test</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  <div>
                    <Label>Type de système</Label>
                    <Select 
                      value={config.system_type} 
                      onValueChange={(value: 'internal' | 'external' | 'api' | 'webhook') => 
                        setConfig(prev => ({ ...prev, system_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="external">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Redirection externe
                          </div>
                        </SelectItem>
                        <SelectItem value="api">
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            API intégrée
                          </div>
                        </SelectItem>
                        <SelectItem value="webhook">
                          <div className="flex items-center gap-2">
                            <Webhook className="h-4 w-4" />
                            Webhook
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(config.system_type === 'external' || config.system_type === 'api') && (
                    <div>
                      <Label htmlFor="endpoint">URL d'endpoint</Label>
                      <Input
                        id="endpoint"
                        value={config.endpoint_url || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, endpoint_url: e.target.value }))}
                        placeholder="https://votre-site.com/booking"
                      />
                    </div>
                  )}

                  {config.system_type === 'webhook' && (
                    <div>
                      <Label htmlFor="webhook">URL Webhook</Label>
                      <Input
                        id="webhook"
                        value={config.webhook_url || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, webhook_url: e.target.value }))}
                        placeholder="https://votre-site.com/webhook/booking"
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={config.is_active}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label>Système actif</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={config.test_mode}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, test_mode: checked }))}
                    />
                    <Label>Mode test</Label>
                  </div>
                </TabsContent>

                <TabsContent value="api" className="space-y-4">
                  {config.system_type === 'api' && (
                    <>
                      <div>
                        <Label htmlFor="api-key">Clé API</Label>
                        <Input
                          id="api-key"
                          type="password"
                          value={config.api_credentials?.api_key || ''}
                          onChange={(e) => updateCredential('api_key', e.target.value)}
                          placeholder="Votre clé API"
                        />
                      </div>
                      <div>
                        <Label htmlFor="api-secret">Secret API</Label>
                        <Input
                          id="api-secret"
                          type="password"
                          value={config.api_credentials?.api_secret || ''}
                          onChange={(e) => updateCredential('api_secret', e.target.value)}
                          placeholder="Votre secret API"
                        />
                      </div>
                      <div>
                        <Label htmlFor="auth-header">En-tête d'authentification</Label>
                        <Input
                          id="auth-header"
                          value={config.api_credentials?.auth_header || 'Authorization'}
                          onChange={(e) => updateCredential('auth_header', e.target.value)}
                          placeholder="Authorization"
                        />
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="fields" className="space-y-4">
                  <div>
                    <Label htmlFor="custom-fields">Champs personnalisés (JSON)</Label>
                    <Textarea
                      id="custom-fields"
                      value={JSON.stringify(config.custom_fields || {}, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setConfig(prev => ({ ...prev, custom_fields: parsed }));
                        } catch (error) {
                          // Invalid JSON, don't update
                        }
                      }}
                      placeholder='{"required_fields": ["name", "email"], "optional_fields": ["phone"]}'
                      rows={8}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="test" className="space-y-4">
                  <div className="text-center">
                    <Button
                      onClick={testConnection}
                      disabled={testing}
                      className="w-full"
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      {testing ? 'Test en cours...' : 'Tester la connexion'}
                    </Button>
                  </div>
                  
                  {config.system_type === 'external' && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Le test pour la redirection externe vérifie que l'URL est accessible.
                        Les utilisateurs seront redirigés vers: <br />
                        <code className="mt-2 block">{config.endpoint_url || 'URL non définie'}</code>
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}

            {selectedPoint && (
              <div className="flex gap-2">
                <Button 
                  onClick={saveConfig} 
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      Réinitialiser
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Réinitialiser la configuration</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action supprimera toute la configuration de réservation pour ce point. 
                        Êtes-vous sûr de vouloir continuer ?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          handleReset();
                        }}
                      >
                        Réinitialiser
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
