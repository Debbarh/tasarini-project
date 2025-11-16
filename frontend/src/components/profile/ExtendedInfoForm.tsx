import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { apiClient } from '@/integrations/api/client';
import {
  MapPin,
  Globe,
  Briefcase,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Plane,
  Heart,
  Edit,
  Save,
  X
} from 'lucide-react';

interface ExtendedInfoFormProps {
  profile: {
    city?: string;
    country?: string;
    facebook_url?: string;
    instagram_url?: string;
    twitter_url?: string;
    linkedin_url?: string;
    travel_style?: string;
    favorite_destinations?: string;
    travel_interests?: string;
    website_url?: string;
    occupation?: string;
  } | null;
  onUpdate?: () => void;
}

const travelStyles = [
  { value: 'adventure', label: 'Aventure' },
  { value: 'luxury', label: 'Luxe' },
  { value: 'budget', label: 'Budget' },
  { value: 'cultural', label: 'Culturel' },
  { value: 'relaxation', label: 'Détente' },
  { value: 'family', label: 'Famille' },
  { value: 'solo', label: 'Solo' },
  { value: 'group', label: 'Groupe' },
];

export const ExtendedInfoForm: React.FC<ExtendedInfoFormProps> = ({ profile, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    city: profile?.city || '',
    country: profile?.country || '',
    facebook_url: profile?.facebook_url || '',
    instagram_url: profile?.instagram_url || '',
    twitter_url: profile?.twitter_url || '',
    linkedin_url: profile?.linkedin_url || '',
    travel_style: profile?.travel_style || '',
    favorite_destinations: profile?.favorite_destinations || '',
    travel_interests: profile?.travel_interests || '',
    website_url: profile?.website_url || '',
    occupation: profile?.occupation || '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        city: profile.city || '',
        country: profile.country || '',
        facebook_url: profile.facebook_url || '',
        instagram_url: profile.instagram_url || '',
        twitter_url: profile.twitter_url || '',
        linkedin_url: profile.linkedin_url || '',
        travel_style: profile.travel_style || '',
        favorite_destinations: profile.favorite_destinations || '',
        travel_interests: profile.travel_interests || '',
        website_url: profile.website_url || '',
        occupation: profile.occupation || '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiClient.patch('accounts/profiles/me/', formData);
      toast.success('Informations mises à jour avec succès');
      setIsEditing(false);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating extended info:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form to original values
    if (profile) {
      setFormData({
        city: profile.city || '',
        country: profile.country || '',
        facebook_url: profile.facebook_url || '',
        instagram_url: profile.instagram_url || '',
        twitter_url: profile.twitter_url || '',
        linkedin_url: profile.linkedin_url || '',
        travel_style: profile.travel_style || '',
        favorite_destinations: profile.favorite_destinations || '',
        travel_interests: profile.travel_interests || '',
        website_url: profile.website_url || '',
        occupation: profile.occupation || '',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Informations complémentaires</CardTitle>
            <CardDescription>
              Complétez votre profil avec des informations supplémentaires
            </CardDescription>
          </div>
          {!isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Localisation */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Localisation</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="Ex: Paris"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Pays</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="Ex: France"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Informations professionnelles */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Informations professionnelles</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="occupation">Profession</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="Ex: Développeur web"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website_url">Site web</Label>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <Input
                    id="website_url"
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="https://exemple.com"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Réseaux sociaux */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Réseaux sociaux</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facebook_url">Facebook</Label>
                <div className="flex items-center gap-2">
                  <Facebook className="w-4 h-4 text-muted-foreground" />
                  <Input
                    id="facebook_url"
                    type="url"
                    value={formData.facebook_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, facebook_url: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="https://facebook.com/username"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram_url">Instagram</Label>
                <div className="flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-muted-foreground" />
                  <Input
                    id="instagram_url"
                    type="url"
                    value={formData.instagram_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, instagram_url: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="https://instagram.com/username"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter_url">Twitter</Label>
                <div className="flex items-center gap-2">
                  <Twitter className="w-4 h-4 text-muted-foreground" />
                  <Input
                    id="twitter_url"
                    type="url"
                    value={formData.twitter_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, twitter_url: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="https://twitter.com/username"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn</Label>
                <div className="flex items-center gap-2">
                  <Linkedin className="w-4 h-4 text-muted-foreground" />
                  <Input
                    id="linkedin_url"
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Préférences de voyage */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Préférences de voyage</h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="travel_style">Style de voyage</Label>
                <Select
                  value={formData.travel_style}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, travel_style: value }))}
                  disabled={!isEditing}
                >
                  <SelectTrigger id="travel_style">
                    <SelectValue placeholder="Sélectionnez votre style de voyage" />
                  </SelectTrigger>
                  <SelectContent>
                    {travelStyles.map((style) => (
                      <SelectItem key={style.value} value={style.value}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="favorite_destinations">Destinations favorites</Label>
                <Textarea
                  id="favorite_destinations"
                  value={formData.favorite_destinations}
                  onChange={(e: any) => setFormData(prev => ({ ...prev, favorite_destinations: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="Ex: Tokyo, New York, Marrakech (séparées par des virgules)"
                  rows={2}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">Séparez les destinations par des virgules</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="travel_interests">Centres d'intérêt</Label>
                <Textarea
                  id="travel_interests"
                  value={formData.travel_interests}
                  onChange={(e: any) => setFormData(prev => ({ ...prev, travel_interests: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="Ex: plongée, randonnée, gastronomie, photographie"
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">Décrivez vos activités et intérêts de voyage préférés</p>
              </div>
            </div>
          </div>

          {isEditing && (
            <>
              <Separator />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
                <Button type="submit" disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
