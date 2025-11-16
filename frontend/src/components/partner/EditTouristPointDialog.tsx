import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { updateTouristPoint } from '@/services/poiService';
import { toast } from 'sonner';
import { MapPin, Phone, Mail, Globe, X } from 'lucide-react';

interface TouristPoint {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  review_count: number;
  is_active: boolean;
  is_verified: boolean;
  is_partner_point: boolean;
  partner_featured: boolean;
  tags: string[];
  amenities: string[];
  price_range: string;
  contact_phone: string;
  contact_email: string;
  website_url: string;
  media_images: string[];
  opening_hours: any;
  created_at: string;
}

interface EditTouristPointDialogProps {
  point: TouristPoint | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPoint: TouristPoint) => void;
}

const EditTouristPointDialog: React.FC<EditTouristPointDialogProps> = ({
  point,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<TouristPoint>>({});
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (point) {
      setFormData({ ...point });
    }
  }, [point]);

  const handleInputChange = (field: keyof TouristPoint, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (newTag.trim() && formData.tags) {
      const updatedTags = [...formData.tags, newTag.trim()];
      setFormData(prev => ({ ...prev, tags: updatedTags }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (formData.tags) {
      const updatedTags = formData.tags.filter(tag => tag !== tagToRemove);
      setFormData(prev => ({ ...prev, tags: updatedTags }));
    }
  };

  const handleSave = async () => {
    if (!point || !formData.name || !formData.description) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      await updateTouristPoint(point.id, {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        amenities: formData.amenities || [],
        price_range: formData.price_range,
        contact_phone: formData.contact_phone,
        contact_email: formData.contact_email,
        website_url: formData.website_url,
        metadata: {
          opening_hours: formData.opening_hours
        }
      });

      onSave({ ...point, ...formData } as TouristPoint);
      toast.success('Point d\'intérêt mis à jour avec succès');
      onClose();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour du point d\'intérêt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le point d'intérêt</DialogTitle>
          <DialogDescription>
            Modifiez les informations de votre point d'intérêt
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations de base */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations de base</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nom du point d'intérêt *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nom de votre établissement"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Décrivez votre établissement"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <div className="flex">
                <MapPin className="w-4 h-4 mr-2 mt-3 text-muted-foreground" />
                <Input
                  id="address"
                  value={formData.address || ''}
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
                  value={formData.latitude || ''}
                  onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value))}
                  placeholder="Ex: 48.8566"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude || ''}
                  onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value))}
                  placeholder="Ex: 2.3522"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_range">Gamme de prix</Label>
              <select
                id="price_range"
                value={formData.price_range || ''}
                onChange={(e) => handleInputChange('price_range', e.target.value)}
                className="w-full p-2 border border-input rounded-md bg-background"
              >
                <option value="">Sélectionner une gamme</option>
                <option value="€">€ - Économique</option>
                <option value="€€">€€ - Modéré</option>
                <option value="€€€">€€€ - Cher</option>
                <option value="€€€€">€€€€ - Très cher</option>
              </select>
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
                  value={formData.contact_phone || ''}
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
                  value={formData.contact_email || ''}
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
                  value={formData.website_url || ''}
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
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button type="button" onClick={addTag}>
                  Ajouter
                </Button>
              </div>
            </div>

            {formData.tags && formData.tags.length > 0 && (
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
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditTouristPointDialog;