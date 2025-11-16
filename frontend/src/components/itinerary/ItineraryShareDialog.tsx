import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/integrations/api/client';
import { toast } from 'sonner';
import { Trash2, Users, Mail, Eye, Edit } from 'lucide-react';

interface ItineraryShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itinerary: any;
}

interface Share {
  id: string;
  shared_with_id: string;
  permission_level: 'view' | 'edit';
  created_at: string;
  profile?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

export const ItineraryShareDialog: React.FC<ItineraryShareDialogProps> = ({
  open,
  onOpenChange,
  itinerary
}) => {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingShares, setFetchingShares] = useState(false);

  useEffect(() => {
    if (open && itinerary) {
      fetchShares();
    }
  }, [open, itinerary]);

  const fetchShares = async () => {
    if (!itinerary) return;
    
    setFetchingShares(true);
    try {
      const { data, error } = await supabase
        .from('itinerary_shares')
        .select(`
          id,
          shared_with_id,
          permission_level,
          created_at
        `)
        .eq('itinerary_id', itinerary.id);

      if (error) throw error;

      // Ensuite récupérer les profils séparément
      const userIds = data?.map(share => share.shared_with_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name')
        .in('user_id', userIds);

      const sharesWithProfiles = data?.map(share => ({
        ...share,
        permission_level: share.permission_level as 'view' | 'edit',
        profile: profiles?.find(p => p.user_id === share.shared_with_id)
      })) || [];

      setShares(sharesWithProfiles);
    } catch (error) {
      console.error('Error fetching shares:', error);
      toast.error('Erreur lors du chargement des partages');
    } finally {
      setFetchingShares(false);
    }
  };

  const handleShare = async () => {
    if (!email.trim() || !itinerary) return;

    setLoading(true);
    try {
      // Trouver l'utilisateur par email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('user_id, email')
        .eq('email', email.trim())
        .maybeSingle();

      if (userError) throw userError;
      
      if (!userData) {
        toast.error('Aucun utilisateur trouvé avec cet email');
        return;
      }

      // Créer le partage
      const { error: shareError } = await supabase
        .from('itinerary_shares')
        .insert({
          itinerary_id: itinerary.id,
          owner_id: itinerary.user_id,
          shared_with_id: userData.user_id,
          permission_level: permission
        });

      if (shareError) {
        if (shareError.code === '23505') {
          toast.error('Cet utilisateur a déjà accès à cet itinéraire');
        } else {
          throw shareError;
        }
        return;
      }

      toast.success(`Itinéraire partagé avec ${email} en mode ${permission === 'edit' ? 'modification' : 'lecture'}`);
      setEmail('');
      setPermission('view');
      fetchShares();
    } catch (error) {
      console.error('Error sharing itinerary:', error);
      toast.error('Erreur lors du partage');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('itinerary_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;

      toast.success('Partage supprimé');
      fetchShares();
    } catch (error) {
      console.error('Error removing share:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleUpdatePermission = async (shareId: string, newPermission: 'view' | 'edit') => {
    try {
      const { error } = await supabase
        .from('itinerary_shares')
        .update({ permission_level: newPermission })
        .eq('id', shareId);

      if (error) throw error;

      toast.success('Permissions mises à jour');
      fetchShares();
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const formatUserName = (profile: any) => {
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return profile?.email || 'Utilisateur inconnu';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Partager l'itinéraire
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formulaire de partage */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email de l'utilisateur</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="permission">Permission</Label>
              <Select value={permission} onValueChange={(value: 'view' | 'edit') => setPermission(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Lecture seule
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="flex items-center gap-2">
                      <Edit className="w-4 h-4" />
                      Modification
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleShare} 
              disabled={loading || !email.trim()}
              className="w-full"
            >
              {loading ? 'Partage...' : 'Partager'}
            </Button>
          </div>

          {/* Liste des partages existants */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Personnes ayant accès</h4>
            
            {fetchingShares ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : shares.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun partage pour le moment</p>
            ) : (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{formatUserName(share.profile)}</p>
                      <p className="text-xs text-muted-foreground">{share.profile?.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={share.permission_level}
                        onValueChange={(value: 'view' | 'edit') => handleUpdatePermission(share.id, value)}
                      >
                        <SelectTrigger className="h-8 w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">
                            <Eye className="w-3 h-3" />
                          </SelectItem>
                          <SelectItem value="edit">
                            <Edit className="w-3 h-3" />
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveShare(share.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};