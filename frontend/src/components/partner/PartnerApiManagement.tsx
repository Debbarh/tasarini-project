import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Code2,
  Key,
  Webhook,
  Globe,
  Activity,
  Settings,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  created_at: string;
  last_used: string | null;
  is_active: boolean;
}

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  created_at: string;
  last_triggered: string | null;
  success_count: number;
  failure_count: number;
}

interface WebhookLog {
  id: string;
  webhook_id: string;
  event_type: string;
  status: 'success' | 'failed' | 'pending';
  response_code: number;
  created_at: string;
  payload: any;
}

interface ExternalSystem {
  id: string;
  name: string;
  type: 'booking' | 'crm' | 'analytics' | 'payment';
  status: 'connected' | 'disconnected' | 'error';
  last_sync: string | null;
  config: any;
}

const PartnerApiManagement: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhookEndpoints, setWebhookEndpoints] = useState<WebhookEndpoint[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [externalSystems, setExternalSystems] = useState<ExternalSystem[]>([]);
  
  // Form states
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState({
    name: '',
    permissions: [] as string[]
  });
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[]
  });
  const [showApiKeys, setShowApiKeys] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    if (user) {
      fetchApiKeys();
      fetchWebhookEndpoints();
      fetchWebhookLogs();
      fetchExternalSystems();
    }
  }, [user]);

  const fetchApiKeys = async () => {
    try {
      // Mock data for demonstration
      const mockApiKeys: ApiKey[] = [
        {
          id: '1',
          name: 'API Principale',
          key: 'pk_live_51234567890abcdef',
          permissions: ['read:tourist_points', 'write:bookings', 'read:analytics'],
          created_at: '2024-01-15T10:00:00Z',
          last_used: '2024-01-20T14:30:00Z',
          is_active: true
        },
        {
          id: '2',
          name: 'API Mobile App',
          key: 'pk_test_98765432109876543',
          permissions: ['read:tourist_points', 'write:bookings'],
          created_at: '2024-01-10T08:00:00Z',
          last_used: null,
          is_active: false
        }
      ];
      
      setApiKeys(mockApiKeys);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWebhookEndpoints = async () => {
    try {
      const mockWebhooks: WebhookEndpoint[] = [
        {
          id: '1',
          name: 'Système de réservation',
          url: 'https://example.com/webhooks/bookings',
          events: ['booking.created', 'booking.cancelled', 'payment.completed'],
          secret: 'whsec_1234567890abcdef',
          is_active: true,
          created_at: '2024-01-15T10:00:00Z',
          last_triggered: '2024-01-20T16:45:00Z',
          success_count: 145,
          failure_count: 3
        },
        {
          id: '2',
          name: 'CRM Integration',
          url: 'https://crm.example.com/api/webhooks',
          events: ['customer.created', 'booking.created'],
          secret: 'whsec_abcdef1234567890',
          is_active: false,
          created_at: '2024-01-12T14:00:00Z',
          last_triggered: '2024-01-18T11:20:00Z',
          success_count: 67,
          failure_count: 12
        }
      ];
      
      setWebhookEndpoints(mockWebhooks);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
    }
  };

  const fetchWebhookLogs = async () => {
    try {
      const mockLogs: WebhookLog[] = Array.from({ length: 20 }, (_, i) => ({
        id: `log-${i}`,
        webhook_id: Math.random() > 0.5 ? '1' : '2',
        event_type: ['booking.created', 'booking.cancelled', 'payment.completed'][Math.floor(Math.random() * 3)],
        status: ['success', 'failed', 'pending'][Math.floor(Math.random() * 3)] as any,
        response_code: Math.random() > 0.2 ? 200 : 500,
        created_at: new Date(Date.now() - i * 2 * 60 * 60 * 1000).toISOString(),
        payload: { booking_id: `booking_${i}`, amount: Math.floor(Math.random() * 500) + 50 }
      }));
      
      setWebhookLogs(mockLogs);
    } catch (error) {
      console.error('Error fetching webhook logs:', error);
    }
  };

  const fetchExternalSystems = async () => {
    try {
      const mockSystems: ExternalSystem[] = [
        {
          id: '1',
          name: 'Booking.com API',
          type: 'booking',
          status: 'connected',
          last_sync: '2024-01-20T15:30:00Z',
          config: { api_key: 'booking_****', sync_interval: '1h' }
        },
        {
          id: '2',
          name: 'Salesforce CRM',
          type: 'crm',
          status: 'error',
          last_sync: '2024-01-19T12:15:00Z',
          config: { instance_url: 'https://company.salesforce.com', sync_contacts: true }
        },
        {
          id: '3',
          name: 'Google Analytics',
          type: 'analytics',
          status: 'connected',
          last_sync: '2024-01-20T18:00:00Z',
          config: { property_id: 'GA4-123456789', track_events: true }
        }
      ];
      
      setExternalSystems(mockSystems);
    } catch (error) {
      console.error('Error fetching external systems:', error);
    }
  };

  const generateApiKey = async () => {
    if (!newApiKey.name || newApiKey.permissions.length === 0) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    try {
      const generatedKey = `pk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const apiKey: ApiKey = {
        id: `key-${Date.now()}`,
        name: newApiKey.name,
        key: generatedKey,
        permissions: newApiKey.permissions,
        created_at: new Date().toISOString(),
        last_used: null,
        is_active: true
      };

      setApiKeys(prev => [...prev, apiKey]);
      setIsApiKeyDialogOpen(false);
      setNewApiKey({ name: '', permissions: [] });
      toast.success('Clé API générée avec succès');
    } catch (error) {
      toast.error('Erreur lors de la génération de la clé API');
    }
  };

  const createWebhook = async () => {
    if (!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    try {
      const webhook: WebhookEndpoint = {
        id: `webhook-${Date.now()}`,
        name: newWebhook.name,
        url: newWebhook.url,
        events: newWebhook.events,
        secret: `whsec_${Math.random().toString(36).substr(2, 16)}`,
        is_active: true,
        created_at: new Date().toISOString(),
        last_triggered: null,
        success_count: 0,
        failure_count: 0
      };

      setWebhookEndpoints(prev => [...prev, webhook]);
      setIsWebhookDialogOpen(false);
      setNewWebhook({ name: '', url: '', events: [] });
      toast.success('Webhook créé avec succès');
    } catch (error) {
      toast.error('Erreur lors de la création du webhook');
    }
  };

  const toggleApiKey = async (keyId: string) => {
    setApiKeys(prev => 
      prev.map(key => 
        key.id === keyId ? { ...key, is_active: !key.is_active } : key
      )
    );
  };

  const toggleWebhook = async (webhookId: string) => {
    setWebhookEndpoints(prev => 
      prev.map(webhook => 
        webhook.id === webhookId ? { ...webhook, is_active: !webhook.is_active } : webhook
      )
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié dans le presse-papiers');
  };

  const testWebhook = async (webhookId: string) => {
    try {
      // Mock webhook test
      toast.success('Test du webhook envoyé avec succès');
    } catch (error) {
      toast.error('Erreur lors du test du webhook');
    }
  };

  const syncExternalSystem = async (systemId: string) => {
    try {
      setExternalSystems(prev => 
        prev.map(system => 
          system.id === systemId ? { ...system, last_sync: new Date().toISOString() } : system
        )
      );
      toast.success('Synchronisation lancée');
    } catch (error) {
      toast.error('Erreur lors de la synchronisation');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Connecté</Badge>;
      case 'disconnected':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Déconnecté</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Erreur</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Succès</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Échec</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  const availablePermissions = [
    'read:tourist_points',
    'write:tourist_points', 
    'read:bookings',
    'write:bookings',
    'read:analytics',
    'read:customers',
    'write:customers'
  ];

  const availableEvents = [
    'booking.created',
    'booking.updated',
    'booking.cancelled',
    'payment.completed',
    'payment.failed',
    'customer.created',
    'review.created'
  ];

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
        <div>
          <h1 className="text-3xl font-bold">API & Intégrations</h1>
          <p className="text-muted-foreground">Gérez vos clés API, webhooks et intégrations externes</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Code2 className="w-4 h-4 mr-2" />
            Documentation API
          </Button>
        </div>
      </div>

      <Tabs defaultValue="api-keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="api-keys">Clés API</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="integrations">Intégrations</TabsTrigger>
          <TabsTrigger value="logs">Logs & Activité</TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Clés API</CardTitle>
                  <CardDescription>Gérez vos clés d'accès à l'API</CardDescription>
                </div>
                <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Générer une clé
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Générer une nouvelle clé API</DialogTitle>
                      <DialogDescription>
                        Créez une clé API avec des permissions spécifiques
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="keyName">Nom de la clé</Label>
                        <Input
                          id="keyName"
                          placeholder="Ex: API Mobile App"
                          value={newApiKey.name}
                          onChange={(e) => setNewApiKey(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Permissions</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {availablePermissions.map((permission) => (
                            <div key={permission} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={permission}
                                checked={newApiKey.permissions.includes(permission)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewApiKey(prev => ({
                                      ...prev,
                                      permissions: [...prev.permissions, permission]
                                    }));
                                  } else {
                                    setNewApiKey(prev => ({
                                      ...prev,
                                      permissions: prev.permissions.filter(p => p !== permission)
                                    }));
                                  }
                                }}
                              />
                              <Label htmlFor={permission} className="text-sm">{permission}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsApiKeyDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button onClick={generateApiKey}>
                        Générer la clé
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiKeys.map((apiKey) => (
                  <div key={apiKey.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{apiKey.name}</h4>
                        <Badge variant={apiKey.is_active ? "default" : "secondary"}>
                          {apiKey.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {showApiKeys[apiKey.id] ? apiKey.key : `${apiKey.key.slice(0, 12)}...`}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowApiKeys(prev => ({ ...prev, [apiKey.id]: !prev[apiKey.id] }))}
                        >
                          {showApiKeys[apiKey.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(apiKey.key)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {apiKey.permissions.map((permission) => (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Créée le {new Date(apiKey.created_at).toLocaleDateString('fr-FR')}
                        {apiKey.last_used && (
                          <span> • Dernière utilisation: {new Date(apiKey.last_used).toLocaleDateString('fr-FR')}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={apiKey.is_active}
                        onCheckedChange={() => toggleApiKey(apiKey.id)}
                      />
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Endpoints Webhook</CardTitle>
                  <CardDescription>Configurez les webhooks pour recevoir des notifications en temps réel</CardDescription>
                </div>
                <Dialog open={isWebhookDialogOpen} onOpenChange={setIsWebhookDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Créer un webhook
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Créer un nouveau webhook</DialogTitle>
                      <DialogDescription>
                        Configurez un endpoint pour recevoir des notifications automatiques
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="webhookName">Nom du webhook</Label>
                        <Input
                          id="webhookName"
                          placeholder="Ex: Système de réservation"
                          value={newWebhook.name}
                          onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="webhookUrl">URL de destination</Label>
                        <Input
                          id="webhookUrl"
                          placeholder="https://votre-domaine.com/webhook"
                          value={newWebhook.url}
                          onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Événements à surveiller</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {availableEvents.map((event) => (
                            <div key={event} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={event}
                                checked={newWebhook.events.includes(event)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewWebhook(prev => ({
                                      ...prev,
                                      events: [...prev.events, event]
                                    }));
                                  } else {
                                    setNewWebhook(prev => ({
                                      ...prev,
                                      events: prev.events.filter(e => e !== event)
                                    }));
                                  }
                                }}
                              />
                              <Label htmlFor={event} className="text-sm">{event}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsWebhookDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button onClick={createWebhook}>
                        Créer le webhook
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {webhookEndpoints.map((webhook) => (
                  <div key={webhook.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">{webhook.name}</h4>
                        <Badge variant={webhook.is_active ? "default" : "secondary"}>
                          {webhook.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => testWebhook(webhook.id)}>
                          <Activity className="w-4 h-4 mr-1" />
                          Test
                        </Button>
                        <Switch
                          checked={webhook.is_active}
                          onCheckedChange={() => toggleWebhook(webhook.id)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm"><strong>URL:</strong> {webhook.url}</p>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-sm font-medium mr-2">Événements:</span>
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Succès: {webhook.success_count}</span>
                        <span>Échecs: {webhook.failure_count}</span>
                        {webhook.last_triggered && (
                          <span>Dernier déclenchement: {new Date(webhook.last_triggered).toLocaleDateString('fr-FR')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Systèmes externes</CardTitle>
              <CardDescription>Gérez vos intégrations avec des services tiers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {externalSystems.map((system) => (
                  <div key={system.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        <Globe className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{system.name}</h4>
                          {getStatusBadge(system.status)}
                        </div>
                        <p className="text-sm text-muted-foreground capitalize">
                          Type: {system.type}
                        </p>
                        {system.last_sync && (
                          <p className="text-sm text-muted-foreground">
                            Dernière sync: {new Date(system.last_sync).toLocaleString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => syncExternalSystem(system.id)}
                        disabled={system.status === 'error'}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Synchroniser
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logs des webhooks</CardTitle>
              <CardDescription>Historique des appels webhooks et leurs réponses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {webhookLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(log.status)}
                      <div>
                        <p className="font-medium text-sm">{log.event_type}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {log.response_code}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PartnerApiManagement;