import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Calendar as CalendarIcon, Plus, X, Link, Upload } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { storyService } from "@/services/storyService";
import { apiClient } from "@/integrations/api/client";
import { savedItineraryService } from "@/services/savedItineraryService";

interface CreateStoryDialogProps {
  onStoryCreated: () => void;
  onCancel: () => void;
}

interface StoryFormData {
  title: string;
  content: string;
  tags: string[];
  location_name: string;
  location_lat?: number;
  location_lon?: number;
  trip_date?: Date;
  is_public: boolean;
  media_images: string[];
  media_videos: string[];
}

interface LinkedEntity {
  type: 'tourist_point' | 'itinerary' | 'activity';
  id: string;
  name: string;
}

export const CreateStoryDialog = ({ onStoryCreated, onCancel }: CreateStoryDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [linkedEntities, setLinkedEntities] = useState<LinkedEntity[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'tourist_point' | 'itinerary' | 'activity'>('tourist_point');
  
  const [formData, setFormData] = useState<StoryFormData>({
    title: '',
    content: '',
    tags: [],
    location_name: '',
    trip_date: undefined,
    is_public: true,
    media_images: [],
    media_videos: []
  });

  const handleInputChange = (field: keyof StoryFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      handleInputChange('tags', [...formData.tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  const searchEntities = async () => {
    if (!searchTerm.trim()) return;

    try {
      let data = [];

      if (searchType === 'tourist_point') {
        const points = await apiClient.get<any[]>('poi/tourist-points/', {
          search: searchTerm,
          is_active: true,
          limit: 5,
        });
        data = (points || []).slice(0, 5).map(p => ({ id: p.id, name: p.name, type: 'tourist_point' }));
      } else if (searchType === 'itinerary') {
        const itineraries = await savedItineraryService.list({ search: searchTerm, limit: 5 });
        data = (itineraries || []).map(i => ({ id: i.id, name: i.title, type: 'itinerary' }));
      }

      setSearchResults(data);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
    }
  };

  const addLinkedEntity = (entity: any) => {
    const newEntity: LinkedEntity = {
      type: searchType,
      id: entity.id,
      name: entity.name
    };

    if (!linkedEntities.find(e => e.id === entity.id && e.type === entity.type)) {
      setLinkedEntities(prev => [...prev, newEntity]);
    }

    setSearchTerm('');
    setSearchResults([]);
  };

  const removeLinkedEntity = (entityId: string, entityType: string) => {
    setLinkedEntities(prev => prev.filter(e => !(e.id === entityId && e.type === entityType)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Vous devez être connecté pour créer une story');
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Le titre et le contenu sont requis');
      return;
    }

    setLoading(true);

    try {
      // Create the story
      const storyData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        tags: formData.tags,
        location_name: formData.location_name.trim() || null,
        location_lat: formData.location_lat || null,
        location_lon: formData.location_lon || null,
        trip_date: formData.trip_date ? format(formData.trip_date, 'yyyy-MM-dd') : null,
        is_public: formData.is_public,
        media_images: formData.media_images,
        media_videos: formData.media_videos
      };

      await storyService.createStory({
        ...storyData,
        linked_entities: linkedEntities.map(entity => ({
          linked_type: entity.type,
          linked_id: entity.id
        })),
      });

      onStoryCreated();
      
    } catch (error: any) {
      console.error('Erreur lors de la création de la story:', error);
      toast.error(`Erreur lors de la création: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Titre de votre story *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Un titre accrocheur pour votre expérience..."
          required
        />
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="content">Votre histoire *</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => handleInputChange('content', e.target.value)}
          placeholder="Racontez votre expérience, vos émotions, vos découvertes..."
          rows={6}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location">Lieu</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="location"
              value={formData.location_name}
              onChange={(e) => handleInputChange('location_name', e.target.value)}
              placeholder="Paris, France"
              className="pl-10"
            />
          </div>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label>Date du voyage</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.trip_date ? format(formData.trip_date, "PPP", { locale: fr }) : "Choisir une date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.trip_date}
                onSelect={(date) => handleInputChange('trip_date', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Ajouter un tag..."
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          />
          <Button type="button" onClick={addTag} size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="pr-1">
              {tag}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeTag(tag)}
                className="ml-1 h-auto p-0 w-4 h-4"
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Linked Entities */}
      <div className="space-y-4">
        <Label>Lier à des éléments de l'application</Label>
        
        <div className="flex gap-2">
          <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tourist_point">Point d'intérêt</SelectItem>
              <SelectItem value="itinerary">Itinéraire</SelectItem>
              <SelectItem value="activity">Activité</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex-1 relative">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), searchEntities())}
            />
            <Button
              type="button"
              onClick={searchEntities}
              size="sm"
              className="absolute right-1 top-1 h-8"
            >
              <Link className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <Card>
            <CardContent className="p-3">
              <div className="space-y-2">
                {searchResults.map((entity) => (
                  <div
                    key={entity.id}
                    className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => addLinkedEntity(entity)}
                  >
                    <span className="text-sm">{entity.name}</span>
                    <Plus className="w-4 h-4" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Linked Entities */}
        {linkedEntities.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm">Éléments liés:</Label>
            <div className="flex flex-wrap gap-2">
              {linkedEntities.map((entity, index) => (
                <Badge key={index} variant="outline" className="pr-1">
                  {entity.name} ({entity.type})
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLinkedEntity(entity.id, entity.type)}
                    className="ml-1 h-auto p-0 w-4 h-4"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Public/Private */}
      <div className="flex items-center space-x-2">
        <Switch
          id="is_public"
          checked={formData.is_public}
          onCheckedChange={(checked) => handleInputChange('is_public', checked)}
        />
        <Label htmlFor="is_public">
          {formData.is_public ? 'Story publique' : 'Story privée'}
        </Label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Création...' : 'Créer la story'}
        </Button>
      </div>
    </form>
  );
};
