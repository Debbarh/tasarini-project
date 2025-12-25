import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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

export const ExtendedInfoForm: React.FC<ExtendedInfoFormProps> = ({ profile, onUpdate }) => {
  const { t } = useTranslation();
  
  const travelStyles = [
    { value: 'adventure', label: t('profile.extendedInfo.travelStyles.adventure') },
    { value: 'luxury', label: t('profile.extendedInfo.travelStyles.luxury') },
    { value: 'budget', label: t('profile.extendedInfo.travelStyles.budget') },
    { value: 'cultural', label: t('profile.extendedInfo.travelStyles.cultural') },
    { value: 'relaxation', label: t('profile.extendedInfo.travelStyles.relaxation') },
    { value: 'family', label: t('profile.extendedInfo.travelStyles.family') },
    { value: 'solo', label: t('profile.extendedInfo.travelStyles.solo') },
    { value: 'group', label: t('profile.extendedInfo.travelStyles.group') },
  ];
  
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
      toast.success(t('profile.extendedInfo.toast.updateSuccess'));
      setIsEditing(false);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating extended info:', error);
      toast.error(t('profile.extendedInfo.toast.updateError'));
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
            <CardTitle>{t('profile.extendedInfo.title')}</CardTitle>
            <CardDescription>
              {t('profile.extendedInfo.description')}
            </CardDescription>
          </div>
          {!isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              {t('profile.edit')}
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
              <h3 className="text-lg font-semibold">{t('profile.extendedInfo.location')}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">{t('profile.extendedInfo.city')}</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  disabled={!isEditing}
                  placeholder={t('profile.extendedInfo.cityPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">{t('profile.extendedInfo.country')}</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  disabled={!isEditing}
                  placeholder={t('profile.extendedInfo.countryPlaceholder')}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Informations professionnelles */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">{t('profile.extendedInfo.professionalInfo')}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="occupation">{t('profile.extendedInfo.occupation')}</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                  disabled={!isEditing}
                  placeholder={t('profile.extendedInfo.occupationPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website_url">{t('profile.extendedInfo.website')}</Label>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <Input
                    id="website_url"
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                    disabled={!isEditing}
                    placeholder={t('profile.extendedInfo.websitePlaceholder')}
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
              <h3 className="text-lg font-semibold">{t('profile.extendedInfo.socialNetworks')}</h3>
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
                    placeholder={t('profile.extendedInfo.facebookPlaceholder')}
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
                    placeholder={t('profile.extendedInfo.instagramPlaceholder')}
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
                    placeholder={t('profile.extendedInfo.twitterPlaceholder')}
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
                    placeholder={t('profile.extendedInfo.linkedinPlaceholder')}
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
              <h3 className="text-lg font-semibold">{t('profile.extendedInfo.travelPreferences')}</h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="travel_style">{t('profile.extendedInfo.travelStyle')}</Label>
                <Select
                  value={formData.travel_style}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, travel_style: value }))}
                  disabled={!isEditing}
                >
                  <SelectTrigger id="travel_style">
                    <SelectValue placeholder={t('profile.extendedInfo.selectTravelStyle')} />
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
                <Label htmlFor="favorite_destinations">{t('profile.extendedInfo.favoriteDestinations')}</Label>
                <Textarea
                  id="favorite_destinations"
                  value={formData.favorite_destinations}
                  onChange={(e: any) => setFormData(prev => ({ ...prev, favorite_destinations: e.target.value }))}
                  disabled={!isEditing}
                  placeholder={t('profile.extendedInfo.favoriteDestinationsPlaceholder')}
                  rows={2}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">{t('profile.extendedInfo.favoriteDestinationsHelp')}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="travel_interests">{t('profile.extendedInfo.travelInterests')}</Label>
                <Textarea
                  id="travel_interests"
                  value={formData.travel_interests}
                  onChange={(e: any) => setFormData(prev => ({ ...prev, travel_interests: e.target.value }))}
                  disabled={!isEditing}
                  placeholder={t('profile.extendedInfo.travelInterestsPlaceholder')}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">{t('profile.extendedInfo.travelInterestsHelp')}</p>
              </div>
            </div>
          </div>

          {isEditing && (
            <>
              <Separator />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
                  <X className="w-4 h-4 mr-2" />
                  {t('profile.cancel')}
                </Button>
                <Button type="submit" disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? t('profile.saving') : t('profile.save')}
                </Button>
              </div>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
