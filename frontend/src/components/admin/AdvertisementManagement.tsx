import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Link, VideoIcon } from 'lucide-react';
import {
  advertisementService,
  AdvertisementSetting,
  AdvertisementVideoType,
} from '@/services/advertisementService';
import { uploadMediaFile } from '@/services/mediaStorageService';
import { useAuth } from '@/contexts/AuthContext';

type AdvertisementFormState = {
  id?: number;
  video_type: AdvertisementVideoType;
  video_url?: string | null;
  is_enabled: boolean;
  title?: string;
  description?: string;
  duration_seconds: number;
};

const DEFAULT_SETTINGS: AdvertisementFormState = {
  video_type: 'link',
  video_url: '',
  is_enabled: false,
  title: '',
  description: '',
  duration_seconds: 30,
};

const AdvertisementManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState<AdvertisementFormState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const latest = await advertisementService.getLatest();
      if (latest) {
        setForm(mapSettingToForm(latest));
      } else {
        setForm(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les paramètres',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const mapSettingToForm = (setting: AdvertisementSetting): AdvertisementFormState => ({
    id: setting.id,
    video_type: setting.video_type,
    video_url: setting.video_url ?? '',
    is_enabled: setting.is_enabled,
    title: setting.title ?? '',
    description: setting.description ?? '',
    duration_seconds: setting.duration_seconds,
  });

  const saveSettings = async () => {
    try {
      setSaving(true);
      const payload = {
        video_type: form.video_type,
        video_url: form.video_url || null,
        is_enabled: form.is_enabled,
        title: form.title,
        description: form.description,
        duration_seconds: form.duration_seconds,
      };

      let result: AdvertisementSetting;
      if (form.id) {
        result = await advertisementService.update(form.id, payload);
      } else {
        result = await advertisementService.create(payload);
      }

      setForm(mapSettingToForm(result));
      toast({ title: 'Succès', description: 'Paramètres sauvegardés avec succès' });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: 'Erreur',
        description: "Impossible de sauvegarder les paramètres",
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const userId = user?.id ? String(user.id) : 'admin';
      const result = await uploadMediaFile(file, 'video', userId, { maxSizeBytes: 100 * 1024 * 1024 });
      if (!result.success || !result.url) {
        toast({
          title: 'Erreur',
          description: result.error || "Impossible d'uploader la vidéo",
          variant: 'destructive',
        });
        return;
      }

      setForm((prev) => ({
        ...prev,
        video_url: result.url,
        video_type: 'upload',
      }));
      toast({ title: 'Succès', description: 'Vidéo uploadée avec succès' });
    } catch (error) {
      console.error('Erreur upload:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'uploader la vidéo",
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const removeVideo = () => {
    setForm((prev) => ({
      ...prev,
      video_url: '',
    }));
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <VideoIcon className="w-5 h-5" />
          Gestion des Publicités Vidéo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="enable-ads" className="text-base font-medium">
              Activer les publicités
            </Label>
            <p className="text-sm text-muted-foreground">
              Affiche une vidéo publicitaire pendant la génération d&apos;itinéraire
            </p>
          </div>
          <Switch
            id="enable-ads"
            checked={form.is_enabled}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_enabled: checked }))}
          />
        </div>

        {form.is_enabled && (
          <>
            <Tabs
              value={form.video_type}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  video_type: value as AdvertisementVideoType,
                  video_url: '',
                }))
              }
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="link" className="flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Lien vidéo
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload vidéo
                </TabsTrigger>
              </TabsList>

              <TabsContent value="link" className="space-y-4">
                <div>
                  <Label htmlFor="video-url">URL de la vidéo</Label>
                  <Input
                    id="video-url"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={form.video_url ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, video_url: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Formats supportés: YouTube ou URLs directes (MP4, WebM, OGV)
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <div>
                  <Label>Fichier vidéo</Label>
                  {!form.video_url ? (
                    <div className="relative border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                      <div className="flex flex-col items-center gap-2 pointer-events-none">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                        <div className="text-center">
                          <p className="text-sm font-medium">Cliquez pour sélectionner une vidéo</p>
                          <p className="text-xs text-muted-foreground">MP4, WebM, OGV jusqu&apos;à 100MB</p>
                        </div>
                      </div>
                      <Input
                        type="file"
                        accept="video/*"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <VideoIcon className="w-4 h-4" />
                          <span className="text-sm">Vidéo uploadée</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={removeVideo}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <video src={form.video_url ?? undefined} controls className="w-full max-w-md rounded-lg" />
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {form.video_type === 'link' && form.video_url && (
              <div>
                <Label>Aperçu</Label>
                {form.video_url.includes('youtube.com') || form.video_url.includes('youtu.be') ? (
                  <div className="text-sm text-muted-foreground p-4 border rounded-lg">
                    <p>Aperçu YouTube disponible lors de la diffusion</p>
                    <p className="text-xs mt-1 break-all">{form.video_url}</p>
                  </div>
                ) : (
                  <video src={form.video_url} controls className="w-full max-w-md rounded-lg" />
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ad-title">Titre (optionnel)</Label>
                <Input
                  id="ad-title"
                  placeholder="Titre de la publicité"
                  value={form.title ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="duration">Durée d&apos;affichage (secondes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={5}
                  max={300}
                  value={form.duration_seconds}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      duration_seconds: Number(e.target.value) || DEFAULT_SETTINGS.duration_seconds,
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="ad-description">Description (optionnelle)</Label>
              <Textarea
                id="ad-description"
                placeholder="Description de la publicité"
                value={form.description ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </>
        )}

        <div className="flex gap-2">
          <Button onClick={saveSettings} disabled={saving || uploading}>
            {saving ? 'Sauvegarde...' : uploading ? 'Upload en cours...' : 'Sauvegarder'}
          </Button>
          <Button variant="outline" onClick={loadSettings} disabled={loading}>
            Annuler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvertisementManagement;
