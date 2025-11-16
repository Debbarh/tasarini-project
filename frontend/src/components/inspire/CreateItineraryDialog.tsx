import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { MapPin, Clock, Route, Trash2 } from 'lucide-react';
import { POI } from '@/services/poiService';
import { discoveryService } from '@/services/discoveryService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CreateItineraryDialogProps {
  selectedPOIs: POI[];
  onPOIRemove: (poiId: string) => void;
  onItineraryCreated: () => void;
  children: React.ReactNode;
}

export const CreateItineraryDialog: React.FC<CreateItineraryDialogProps> = ({
  selectedPOIs,
  onPOIRemove,
  onItineraryCreated,
  children
}) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    estimatedDuration: 4,
    difficultyLevel: 'easy' as 'easy' | 'medium' | 'hard',
    isPublic: false
  });

  const calculateDistance = (pois: POI[]) => {
    if (pois.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 0; i < pois.length - 1; i++) {
      const poi1 = pois[i];
      const poi2 = pois[i + 1];
      
      if (poi1.latitude && poi1.longitude && poi2.latitude && poi2.longitude) {
        const R = 6371; // Rayon de la Terre en km
        const dLat = (poi2.latitude - poi1.latitude) * Math.PI / 180;
        const dLon = (poi2.longitude - poi1.longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(poi1.latitude * Math.PI / 180) * Math.cos(poi2.latitude * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        totalDistance += R * c;
      }
    }
    
    return Math.round(totalDistance * 100) / 100;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Vous devez être connecté pour créer un itinéraire');
      return;
    }

    if (selectedPOIs.length === 0) {
      toast.error('Ajoutez au moins un point d\'intérêt à votre itinéraire');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Le titre est requis');
      return;
    }

    setLoading(true);

    try {
      const poiIds = selectedPOIs.map(poi => poi.id);
      const totalDistance = calculateDistance(selectedPOIs);

      await discoveryService.create({
        title: formData.title.trim(),
        description: formData.description.trim(),
        poi_ids: poiIds,
        estimated_duration_hours: formData.estimatedDuration,
        total_distance_km: totalDistance,
        difficulty_level: formData.difficultyLevel,
        is_public: formData.isPublic
      });

      toast.success('Itinéraire créé avec succès !');

      // Reset form
      setFormData({
        title: '',
        description: '',
        estimatedDuration: 4,
        difficultyLevel: 'easy',
        isPublic: false
      });

      setOpen(false);
      onItineraryCreated();

    } catch (error: any) {
      console.error('Erreur lors de la création de l\'itinéraire:', error);
      toast.error('Erreur lors de la création de l\'itinéraire');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyLabel = (level: string) => {
    switch (level) {
      case 'easy': return 'Facile';
      case 'medium': return 'Modéré';
      case 'hard': return 'Difficile';
      default: return 'Facile';
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-green-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un itinéraire de découverte</DialogTitle>
          <DialogDescription>
            Transformez vos points d'intérêt sélectionnés en itinéraire personnalisé
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulaire */}
          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre de l'itinéraire *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                  placeholder="Ma découverte parisienne..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                  placeholder="Décrivez votre itinéraire..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Durée estimée (heures)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    max="24"
                    value={formData.estimatedDuration}
                    onChange={(e) => setFormData(prev => ({...prev, estimatedDuration: parseInt(e.target.value) || 4}))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Niveau de difficulté</Label>
                  <Select 
                    value={formData.difficultyLevel} 
                    onValueChange={(value) => setFormData(prev => ({...prev, difficultyLevel: value as any}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Facile</SelectItem>
                      <SelectItem value="medium">Modéré</SelectItem>
                      <SelectItem value="hard">Difficile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="public"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData(prev => ({...prev, isPublic: checked}))}
                />
                <Label htmlFor="public">Rendre cet itinéraire public</Label>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Création...' : 'Créer l\'itinéraire'}
                </Button>
              </div>
            </form>
          </div>

          {/* Aperçu de l'itinéraire */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="w-5 h-5" />
                  Aperçu de l'itinéraire
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedPOIs.length} points d'intérêt</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{formData.estimatedDuration}h estimées</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className={getDifficultyColor(formData.difficultyLevel)}>
                    {getDifficultyLabel(formData.difficultyLevel)}
                  </Badge>
                  {formData.isPublic && (
                    <Badge variant="outline">Public</Badge>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  Distance totale: ~{calculateDistance(selectedPOIs)} km
                </div>
              </CardContent>
            </Card>

            {/* Liste des POIs sélectionnés */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Points d'intérêt sélectionnés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedPOIs.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Aucun point d'intérêt sélectionné. Cliquez sur les points d'intérêt de la carte pour les ajouter.
                    </p>
                  ) : (
                    selectedPOIs.map((poi, index) => (
                      <div key={poi.id} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium text-sm">{poi.name}</p>
                            <p className="text-xs text-muted-foreground">{poi.address}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPOIRemove(poi.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};