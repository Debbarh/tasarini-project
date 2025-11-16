import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Shield, Eye, EyeOff, Lock, Users, MessageCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/integrations/api/client';

interface PrivacySettingsProps {
  profile: any;
  onUpdate: () => void;
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({ profile, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    is_public: true,
    profile_visibility: 'public',
    show_stories: true,
    show_bookings: false,
    show_itineraries: true,
    show_followers: true,
    allow_messages: true,
    allow_profile_search: true,
  });

  useEffect(() => {
    if (profile) {
      setSettings({
        is_public: profile.is_public ?? true,
        profile_visibility: profile.profile_visibility || 'public',
        show_stories: profile.show_stories ?? true,
        show_bookings: profile.show_bookings ?? false,
        show_itineraries: profile.show_itineraries ?? true,
        show_followers: profile.show_followers ?? true,
        allow_messages: profile.allow_messages ?? true,
        allow_profile_search: profile.allow_profile_search ?? true,
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await apiClient.patch('accounts/profiles/me/', settings);
      toast.success('Paramètres de confidentialité mis à jour');
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Paramètres de Confidentialité
            </CardTitle>
            <CardDescription>
              Contrôlez qui peut voir vos informations et votre contenu
            </CardDescription>
          </div>
          {!isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Lock className="w-4 h-4 mr-2" />
              Modifier
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Visibility */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4" />
              Visibilité du profil
            </h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile_visibility">Qui peut voir mon profil ?</Label>
            <Select
              value={settings.profile_visibility}
              onValueChange={(value) => setSettings({ ...settings, profile_visibility: value })}
              disabled={!isEditing}
            >
              <SelectTrigger id="profile_visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Public</div>
                      <div className="text-xs text-muted-foreground">Tout le monde peut voir</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="friends_only">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Abonnés uniquement</div>
                      <div className="text-xs text-muted-foreground">Seulement mes abonnés</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Privé</div>
                      <div className="text-xs text-muted-foreground">Personne ne peut voir</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="is_public">Profil public</Label>
              <div className="text-sm text-muted-foreground">
                Votre profil apparaît dans les recherches publiques
              </div>
            </div>
            <Switch
              id="is_public"
              checked={settings.is_public}
              onCheckedChange={(checked) => setSettings({ ...settings, is_public: checked })}
              disabled={!isEditing}
            />
          </div>
        </div>

        <Separator />

        {/* Content Visibility */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
              <EyeOff className="w-4 h-4" />
              Visibilité du contenu
            </h3>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="show_stories">Afficher mes récits de voyage</Label>
              <div className="text-sm text-muted-foreground">
                Les autres peuvent voir vos récits sur votre profil
              </div>
            </div>
            <Switch
              id="show_stories"
              checked={settings.show_stories}
              onCheckedChange={(checked) => setSettings({ ...settings, show_stories: checked })}
              disabled={!isEditing}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="show_itineraries">Afficher mes itinéraires</Label>
              <div className="text-sm text-muted-foreground">
                Les autres peuvent voir vos itinéraires publics
              </div>
            </div>
            <Switch
              id="show_itineraries"
              checked={settings.show_itineraries}
              onCheckedChange={(checked) => setSettings({ ...settings, show_itineraries: checked })}
              disabled={!isEditing}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="show_bookings">Afficher mes réservations</Label>
              <div className="text-sm text-muted-foreground">
                Les autres peuvent voir votre historique de réservations
              </div>
            </div>
            <Switch
              id="show_bookings"
              checked={settings.show_bookings}
              onCheckedChange={(checked) => setSettings({ ...settings, show_bookings: checked })}
              disabled={!isEditing}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="show_followers">Afficher mes abonnés</Label>
              <div className="text-sm text-muted-foreground">
                Les autres peuvent voir vos abonnés et abonnements
              </div>
            </div>
            <Switch
              id="show_followers"
              checked={settings.show_followers}
              onCheckedChange={(checked) => setSettings({ ...settings, show_followers: checked })}
              disabled={!isEditing}
            />
          </div>
        </div>

        <Separator />

        {/* Communication Settings */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4" />
              Communication
            </h3>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="allow_messages">Autoriser les messages</Label>
              <div className="text-sm text-muted-foreground">
                Les autres utilisateurs peuvent vous envoyer des messages
              </div>
            </div>
            <Switch
              id="allow_messages"
              checked={settings.allow_messages}
              onCheckedChange={(checked) => setSettings({ ...settings, allow_messages: checked })}
              disabled={!isEditing}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="allow_profile_search">Visible dans la recherche</Label>
              <div className="text-sm text-muted-foreground">
                Votre profil apparaît dans les résultats de recherche
              </div>
            </div>
            <Switch
              id="allow_profile_search"
              checked={settings.allow_profile_search}
              onCheckedChange={(checked) => setSettings({ ...settings, allow_profile_search: checked })}
              disabled={!isEditing}
            />
          </div>
        </div>

        {isEditing && (
          <>
            <Separator />
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  // Reset to original values
                  if (profile) {
                    setSettings({
                      is_public: profile.is_public ?? true,
                      profile_visibility: profile.profile_visibility || 'public',
                      show_stories: profile.show_stories ?? true,
                      show_bookings: profile.show_bookings ?? false,
                      show_itineraries: profile.show_itineraries ?? true,
                      show_followers: profile.show_followers ?? true,
                      allow_messages: profile.allow_messages ?? true,
                      allow_profile_search: profile.allow_profile_search ?? true,
                    });
                  }
                }}
              >
                Annuler
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
