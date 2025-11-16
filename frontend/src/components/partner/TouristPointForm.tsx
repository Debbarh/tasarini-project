import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MapPin, Phone, Mail, Globe, X, Plus } from 'lucide-react';
import { createTouristPoint } from '@/services/poiService';

interface TouristPointFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TouristPointForm: React.FC<TouristPointFormProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    latitude: '',
    longitude: '',
    price_range: '',
    contact_phone: '',
    contact_email: '',
    website_url: '',
    tags: [] as string[]
  });
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ 
        ...prev, 
        tags: [...prev.tags, newTag.trim()] 
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    if (!user) {
      toast.error('Veuillez vous connecter pour créer un point d\'intérêt');
      return;
    }

    setLoading(true);
    try {
      await createTouristPoint({
        name: formData.name.trim(),
        description: formData.description.trim(),
        address: formData.address || undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        price_range: formData.price_range || undefined,
        contact_phone: formData.contact_phone || undefined,
        contact_email: formData.contact_email || undefined,
        website_url: formData.website_url || undefined,
        metadata: {
          source: 'partner',
          partner_id: user.public_id,
          custom_tags: formData.tags,
        },
        is_active: true,
      });

      toast.success('Point d\'intérêt créé avec succès!');
      setFormData({
        name: '',
        description: '',
        address: '',
        latitude: '',
        longitude: '',
        price_range: '',
        contact_phone: '',
        contact_email: '',
        website_url: '',
        tags: []
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erreur lors de la création:', error);
      const detail = error?.payload?.detail || error?.message || 'Erreur lors de la création du point d\'intérêt';
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un nouveau point d'intérêt</DialogTitle>
          <DialogDescription>
            Ajoutez un nouveau point d'intérêt à votre profil partenaire
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations de base */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations de base</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nom du point d'intérêt *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nom de votre établissement"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Décrivez votre établissement"
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <div className="flex">
                <MapPin className="w-4 h-4 mr-2 mt-3 text-muted-foreground" />
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Adresse complète"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => handleInputChange('latitude', e.target.value)}
                  placeholder="Ex: 48.8566"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => handleInputChange('longitude', e.target.value)}
                  placeholder="Ex: 2.3522"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_range">Gamme de prix</Label>
              <Select
                value={formData.price_range}
                onValueChange={(value) => handleInputChange('price_range', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une gamme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="€">€ - Économique</SelectItem>
                  <SelectItem value="€€">€€ - Modéré</SelectItem>
                  <SelectItem value="€€€">€€€ - Cher</SelectItem>
                  <SelectItem value="€€€€">€€€€ - Très cher</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Informations de contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations de contact</h3>
            
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Téléphone</Label>
              <div className="flex">
                <Phone className="w-4 h-4 mr-2 mt-3 text-muted-foreground" />
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                  placeholder="+33 1 23 45 67 89"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">Email</Label>
              <div className="flex">
                <Mail className="w-4 h-4 mr-2 mt-3 text-muted-foreground" />
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  placeholder="contact@exemple.com"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website_url">Site web</Label>
              <div className="flex">
                <Globe className="w-4 h-4 mr-2 mt-3 text-muted-foreground" />
                <Input
                  id="website_url"
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => handleInputChange('website_url', e.target.value)}
                  placeholder="https://www.exemple.com"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Tags et catégories</h3>
            
            <div className="space-y-2">
              <Label>Ajouter un tag</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Ex: Restaurant, Vue sur mer"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="pr-1">
                    {tag}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Création...' : 'Créer le point d\'intérêt'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TouristPointForm;
