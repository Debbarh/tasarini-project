import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Calendar as CalendarIcon, Plus, X, Link, Upload, Sparkles, BookOpen, Activity, MapIcon, ImageIcon, Tag } from "lucide-react";
import { MediaUploader } from "@/components/media/MediaUploader";
import LocationPicker from "@/components/LocationPicker";
import { useActivitySettings } from "@/hooks/useActivitySettings";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { storyService } from "@/services/storyService";
import { savedItineraryService } from "@/services/savedItineraryService";
import { apiClient } from "@/integrations/api/client";
import { storyGenerationService } from "@/services/storyGenerationService";

interface CreateSocialStoryDialogProps {
  onStoryCreated: () => void;
  onCancel: () => void;
  prefilledData?: {
    title?: string;
    content?: string;
    linkedItineraryId?: string;
    linkedPOIId?: string;
    tags?: string[];
    location?: string;
  };
}

interface StoryFormData {
  title: string;
  content: string;
  tags: string[];
  activity_categories: string[];
  intensity_level: string;
  location_name: string;
  location_lat?: number;
  location_lon?: number;
  trip_date?: Date;
  is_public: boolean;
  story_type: 'user' | 'ai_generated';
  media_images: string[];
  media_videos: string[];
  ai_generated_from?: string;
}

interface LinkedEntity {
  type: 'tourist_point' | 'itinerary' | 'activity';
  id: string;
  name: string;
}

interface ItineraryData {
  id: string;
  title: string;
  itinerary_data: any;
  created_at: string;
}

export const CreateSocialStoryDialog = ({ onStoryCreated, onCancel, prefilledData }: CreateSocialStoryDialogProps) => {
  const { user } = useAuth();
  const { categories, intensityLevels, loading: activityLoading } = useActivitySettings();
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [linkedEntities, setLinkedEntities] = useState<LinkedEntity[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'tourist_point' | 'itinerary' | 'activity'>('tourist_point');
  const [userItineraries, setUserItineraries] = useState<ItineraryData[]>([]);
  const [selectedItinerary, setSelectedItinerary] = useState<string>('');
  const [activeTab, setActiveTab] = useState('manual');
  
  const [formData, setFormData] = useState<StoryFormData>({
    title: prefilledData?.title || '',
    content: prefilledData?.content || '',
    tags: prefilledData?.tags || [],
    activity_categories: [],
    intensity_level: '',
    location_name: prefilledData?.location || '',
    location_lat: undefined,
    location_lon: undefined,
    trip_date: undefined,
    is_public: true,
    story_type: 'user',
    media_images: [],
    media_videos: [],
    ai_generated_from: prefilledData?.linkedItineraryId || prefilledData?.linkedPOIId
  });

  useEffect(() => {
    if (user) {
      fetchUserItineraries();
    }
  }, [user]);

  const fetchUserItineraries = async () => {
    try {
      const data = await savedItineraryService.list({ limit: 10 });
      setUserItineraries(data || []);
    } catch (error) {
      console.error('Error fetching user itineraries:', error);
    }
  };

  const generateStoryFromItinerary = async () => {
    if (!selectedItinerary) {
      toast.error('Veuillez sélectionner un itinéraire');
      return;
    }

    setAiGenerating(true);
    try {
      const itinerary = userItineraries.find(i => i.id === selectedItinerary);
      if (!itinerary) throw new Error('Itinéraire non trouvé');

      const data = await storyGenerationService.generateFromItinerary({
        title: itinerary.title,
        itinerary_data: itinerary.itinerary_data,
      });

      // Pre-fill form with AI-generated content
      setFormData(prev => ({
        ...prev,
        title: data.title || `Mon voyage: ${itinerary.title}`,
        content: data.content || '',
        tags: data.tags || [],
        location_name: data.location || '',
        story_type: 'ai_generated',
        ai_generated_from: selectedItinerary
      }));

      setActiveTab('manual'); // Switch to manual tab to allow editing
      toast.success('Story générée avec l\'IA ! Vous pouvez maintenant la personnaliser.');

    } catch (error: any) {
      console.error('Error generating story:', error);
      toast.error('Erreur lors de la génération automatique');
    } finally {
      setAiGenerating(false);
    }
  };

  const generateInstantStory = async (prompt: string) => {
    setAiGenerating(true);
    try {
      const data = await storyGenerationService.generateFromPrompt(prompt);

      setFormData(prev => ({
        ...prev,
        title: data.title || '',
        content: data.content || '',
        tags: data.tags || [],
        location_name: data.location || '',
        story_type: 'ai_generated'
      }));

      setActiveTab('manual');
      toast.success('Story générée ! Personnalisez-la selon vos envies.');

    } catch (error: any) {
      console.error('Error generating instant story:', error);
      toast.error('Erreur lors de la génération instantanée');
    } finally {
      setAiGenerating(false);
    }
  };

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
      data = (points || []).slice(0, 5).map(p => ({ ...p, type: 'tourist_point' }));
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
        story_type: formData.story_type,
        ai_generated_from: formData.ai_generated_from || null,
        media_images: formData.media_images,
        media_videos: formData.media_videos,
        is_verified: false,
        is_featured: false
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
    <div className="max-w-4xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ai-itinerary" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Depuis Itinéraire
          </TabsTrigger>
          <TabsTrigger value="ai-instant" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Génération IA
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Manuel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-itinerary" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Générer depuis un itinéraire
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Sélectionnez un itinéraire</Label>
                <Select value={selectedItinerary} onValueChange={setSelectedItinerary}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un itinéraire..." />
                  </SelectTrigger>
                  <SelectContent>
                    {userItineraries.map((itinerary) => (
                      <SelectItem key={itinerary.id} value={itinerary.id}>
                        {itinerary.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={generateStoryFromItinerary}
                disabled={!selectedItinerary || aiGenerating}
                className="w-full"
              >
                {aiGenerating ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Générer la story
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-instant" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Génération instantanée par IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => generateInstantStory("Créer une story sur un voyage romantique à Paris avec visite de monuments historiques")}
                  disabled={aiGenerating}
                  className="h-auto p-4 text-left"
                >
                  <div>
                    <div className="font-medium">🗼 Paris Romantique</div>
                    <div className="text-sm text-muted-foreground">Voyage en amoureux avec monuments</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => generateInstantStory("Créer une story sur une aventure de trekking en montagne avec des paysages époustouflants")}
                  disabled={aiGenerating}
                  className="h-auto p-4 text-left"
                >
                  <div>
                    <div className="font-medium">🏔️ Aventure Montagne</div>
                    <div className="text-sm text-muted-foreground">Trekking et paysages sauvages</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => generateInstantStory("Créer une story sur un road trip côtier avec plages paradisiaques et couchers de soleil")}
                  disabled={aiGenerating}
                  className="h-auto p-4 text-left"
                >
                  <div>
                    <div className="font-medium">🏖️ Road Trip Côtier</div>
                    <div className="text-sm text-muted-foreground">Plages et couchers de soleil</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => generateInstantStory("Créer une story sur une découverte culturelle urbaine avec street art et gastronomie locale")}
                  disabled={aiGenerating}
                  className="h-auto p-4 text-left"
                >
                  <div>
                    <div className="font-medium">🎨 Culture Urbaine</div>
                    <div className="text-sm text-muted-foreground">Art de rue et gastronomie</div>
                  </div>
                </Button>
              </div>
              
              {aiGenerating && (
                <div className="text-center py-4">
                  <Sparkles className="w-6 h-6 mx-auto animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">L'IA prépare votre story...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="mt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="space-y-2">
              <Label htmlFor="content">Votre histoire *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder="Racontez votre expérience, vos émotions, vos découvertes..."
                rows={8}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Images et vidéos
              </Label>
              <p className="text-sm text-muted-foreground">
                Ajoutez des photos et vidéos pour enrichir votre récit
              </p>
              <MediaUploader
                onMediaChange={(images, videos) => {
                  setFormData(prev => ({
                    ...prev,
                    media_images: images,
                    media_videos: videos
                  }));
                }}
                initialImages={formData.media_images}
                initialVideos={formData.media_videos}
                maxFiles={8}
                maxSizeMB={25}
              />
            </div>

            {/* Catégories d'activités */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Catégories d'activités
              </Label>
              {activityLoading ? (
                <div className="text-sm text-muted-foreground">Chargement des catégories...</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {categories.filter(cat => cat.is_active).map((category) => (
                    <Button
                      key={category.id}
                      type="button"
                      variant={formData.activity_categories.includes(category.code) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const newCategories = formData.activity_categories.includes(category.code)
                          ? formData.activity_categories.filter(c => c !== category.code)
                          : [...formData.activity_categories, category.code];
                        handleInputChange('activity_categories', newCategories);
                      }}
                      className="justify-start text-left h-auto py-2 px-3"
                    >
                      <span className="mr-2">{category.icon_emoji}</span>
                      <span className="text-xs">{category.label_fr}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Niveau d'intensité */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Niveau d'intensité
              </Label>
              {activityLoading ? (
                <div className="text-sm text-muted-foreground">Chargement des niveaux...</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {intensityLevels.filter(level => level.is_active).map((level) => (
                    <Button
                      key={level.id}
                      type="button"
                      variant={formData.intensity_level === level.code ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleInputChange('intensity_level', level.code)}
                      className="justify-center text-center h-auto py-3 px-2 flex-col gap-1"
                    >
                      <span className="text-lg">{level.icon_emoji}</span>
                      <span className="text-xs">{level.label_fr}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>

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

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapIcon className="h-4 w-4" />
                Lieu de votre voyage
              </Label>
              <p className="text-sm text-muted-foreground">
                Cliquez sur la carte pour sélectionner le lieu ou utilisez votre position actuelle
              </p>
              <div className="h-[400px] w-full rounded-lg border">
                <LocationPicker
                  latitude={formData.location_lat}
                  longitude={formData.location_lon}
                  onLocationSelect={(lat, lng, address) => {
                    setFormData(prev => ({
                      ...prev,
                      location_lat: lat,
                      location_lon: lng,
                      location_name: address
                    }));
                  }}
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* Tags personnalisés */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags personnalisés (optionnel)
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Ajouter un tag personnalisé..."
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
        </TabsContent>
      </Tabs>
    </div>
  );
};
