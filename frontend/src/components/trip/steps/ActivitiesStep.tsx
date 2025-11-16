import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Activity, Mountain, Camera, Utensils, Music, Palette, BookOpen, Zap } from "lucide-react";
import { TripFormData, ActivityPreferences } from "@/types/trip";
import { useActivitySettings } from "@/hooks/useActivitySettings";
import * as LucideIcons from "lucide-react";

interface ActivitiesStepProps {
  data: Partial<TripFormData>;
  onUpdate: (data: Partial<TripFormData>) => void;
  onValidate: (isValid: boolean) => void;
}

const ACTIVITY_CATEGORIES = [
  { value: 'culture', label: 'Culture & Histoire', icon: BookOpen, color: 'bg-purple-100 text-purple-700' },
  { value: 'adventure', label: 'Aventure & Sport', icon: Mountain, color: 'bg-green-100 text-green-700' },
  { value: 'relaxation', label: 'Détente & Bien-être', icon: Activity, isEmoji: true, emoji: '🧘', color: 'bg-blue-100 text-blue-700' },
  { value: 'gastronomy', label: 'Gastronomie', icon: Utensils, color: 'bg-orange-100 text-orange-700' },
  { value: 'nature', label: 'Nature & Paysages', icon: Activity, isEmoji: true, emoji: '🌿', color: 'bg-green-100 text-green-700' },
  { value: 'nightlife', label: 'Vie nocturne', icon: Music, color: 'bg-pink-100 text-pink-700' },
  { value: 'art', label: 'Art & Créativité', icon: Palette, color: 'bg-indigo-100 text-indigo-700' },
  { value: 'photography', label: 'Photographie', icon: Camera, color: 'bg-gray-100 text-gray-700' },
  { value: 'shopping', label: 'Shopping', icon: Activity, isEmoji: true, emoji: '🛍️', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'local', label: 'Expériences locales', icon: Activity, isEmoji: true, emoji: '🏘️', color: 'bg-teal-100 text-teal-700' },
];

const INTERESTS = [
  'Musées', 'Monuments historiques', 'Architecture', 'Art contemporain',
  'Randonnée', 'Sports nautiques', 'Escalade', 'Cyclisme', 'Ski',
  'Spas', 'Yoga', 'Méditation', 'Plages',
  'Restaurants étoilés', 'Street food', 'Marchés locaux', 'Cours de cuisine',
  'Parcs nationaux', 'Jardins', 'Faune sauvage', 'Volcans',
  'Bars', 'Clubs', 'Concerts', 'Spectacles',
  'Galeries', 'Ateliers d\'artistes', 'Festivals',
  'Tours photo', 'Paysages', 'Architecture urbaine',
  'Boutiques locales', 'Marchés artisanaux', 'Centres commerciaux',
  'Rencontres locales', 'Traditions', 'Festivals culturels'
];

const AVOIDANCES = [
  'Hauteurs', 'Foules importantes', 'Activités physiques intenses',
  'Lieux fermés', 'Animaux sauvages', 'Sports extrêmes',
  'Lieux bruyants', 'Activités nocturnes tardives',
  'Marche excessive', 'Transports en commun bondés'
];

export const ActivitiesStep = ({ data, onUpdate, onValidate }: ActivitiesStepProps) => {
  const { categories, intensityLevels, interests, avoidances, loading } = useActivitySettings();
  const [preferences, setPreferences] = useState<ActivityPreferences>(
    data.activityPreferences || {
      categories: [],
      intensity: 'moderate',
      interests: [],
      avoidances: []
    }
  );
  const [specialRequests, setSpecialRequests] = useState(data.specialRequests || "");

  useEffect(() => {
    const isValid = preferences.categories.length > 0;
    onValidate(isValid);
    
    if (isValid) {
      onUpdate({ activityPreferences: preferences, specialRequests });
    }
  }, [preferences, specialRequests, onUpdate, onValidate]);

  const updatePreferences = (updates: Partial<ActivityPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  };

  const toggleArrayItem = <T extends keyof ActivityPreferences>(
    field: T,
    item: string
  ) => {
    const current = preferences[field] as string[];
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];
    updatePreferences({ [field]: updated } as Partial<ActivityPreferences>);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Chargement des données...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Activités et expériences</h3>
        <p className="text-muted-foreground">
          Sélectionnez vos centres d'intérêt pour personnaliser votre itinéraire
        </p>
      </div>

      {/* Activity Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Catégories d'activités préférées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {categories.map((category) => {
              const IconComponent = category.icon_name ? (LucideIcons as any)[category.icon_name] : null;
              return (
                <Button
                  key={category.code}
                  variant={preferences.categories.includes(category.code) ? "default" : "outline"}
                  className="h-auto flex-col gap-2 p-4"
                  onClick={() => toggleArrayItem('categories', category.code)}
                >
                  {category.icon_emoji ? (
                    <span className="text-xl">{category.icon_emoji}</span>
                  ) : IconComponent ? (
                    <IconComponent className="h-5 w-5" />
                  ) : (
                    <Activity className="h-5 w-5" />
                  )}
                  <span className="text-xs text-center">{category.label_fr}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Activity Intensity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" />
            Intensité des activités
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {intensityLevels.map((level) => (
              <Button
                key={level.code}
                variant={preferences.intensity === level.code ? "default" : "outline"}
                className="h-auto flex-col gap-2 p-4"
                onClick={() => updatePreferences({ intensity: level.code as ActivityPreferences['intensity'] })}
              >
                <span className="text-2xl">{level.icon_emoji}</span>
                <div className="text-center">
                  <div className="font-medium text-sm">{level.label_fr}</div>
                  <div className="text-xs text-muted-foreground">{level.description_fr}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Specific Interests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Centres d'intérêt spécifiques</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {interests.map((interest) => (
              <div key={interest.code} className="flex items-center space-x-2">
                <Checkbox
                  id={`interest-${interest.code}`}
                  checked={preferences.interests.includes(interest.code)}
                  onCheckedChange={() => toggleArrayItem('interests', interest.code)}
                />
                <Label htmlFor={`interest-${interest.code}`} className="text-sm">
                  {interest.label_fr}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Avoidances */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">À éviter</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sélectionnez ce que vous préférez éviter pendant votre voyage
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {avoidances.map((avoidance) => (
              <div key={avoidance.code} className="flex items-center space-x-2">
                <Checkbox
                  id={`avoidance-${avoidance.code}`}
                  checked={preferences.avoidances.includes(avoidance.code)}
                  onCheckedChange={() => toggleArrayItem('avoidances', avoidance.code)}
                />
                <Label htmlFor={`avoidance-${avoidance.code}`} className="text-sm">
                  {avoidance.label_fr}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Special Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Demandes spéciales</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ajoutez toute information particulière pour votre voyage
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Anniversaire à célébrer, contraintes médicales, occasions spéciales, demandes particulières..."
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-secondary/50">
        <CardContent className="p-4">
          <div className="space-y-2">
            <h4 className="font-medium">Résumé de vos préférences d'activités</h4>
            <div className="space-y-2">
              {preferences.categories.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-sm font-medium">Catégories :</span>
                  {preferences.categories.map(categoryCode => {
                    const category = categories.find(c => c.code === categoryCode);
                    return category ? (
                      <Badge key={categoryCode} variant="outline" className="text-xs">
                        {category.label_fr}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Intensité :</span>
                <Badge variant="outline" className="text-xs">
                  {intensityLevels.find(level => level.code === preferences.intensity)?.label_fr || 'Modéré'}
                </Badge>
              </div>

              {preferences.interests.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-sm font-medium">Intérêts :</span>
                  {preferences.interests.slice(0, 5).map(interestCode => {
                    const interest = interests.find(i => i.code === interestCode);
                    return interest ? (
                      <Badge key={interestCode} variant="outline" className="text-xs">
                        {interest.label_fr}
                      </Badge>
                    ) : null;
                  })}
                  {preferences.interests.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{preferences.interests.length - 5} autres
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};