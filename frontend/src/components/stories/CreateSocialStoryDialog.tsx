import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { TaxonomyIcon } from "@/lib/taxonomyIcon";
import { getLocalizedLabel } from "@/utils/multilingualHelpers";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { storyService } from "@/services/storyService";
import { savedItineraryService } from "@/services/savedItineraryService";
import { apiClient, extractArrayFromResponse } from "@/integrations/api/client";
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
  const { t, i18n } = useTranslation();
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
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
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
      setUserItineraries(extractArrayFromResponse(data));
    } catch (error) {
      console.error('Error fetching user itineraries:', error);
    }
  };

  const generateStoryFromItinerary = async () => {
    if (!selectedItinerary) {
      toast.error(t('travelStories.createDialog.aiItinerary.selectPlaceholder'));
      return;
    }

    setAiGenerating(true);
    try {
      const itinerary = userItineraries.find(i => i.id === selectedItinerary);
      if (!itinerary) throw new Error(t('travelStories.createDialog.itineraryNotFound', 'Itinéraire non trouvé'));

      const data = await storyGenerationService.generateFromItinerary({
        title: itinerary.title,
        itinerary_data: itinerary.itinerary_data,
      });

      // Pre-fill form with AI-generated content
      setFormData(prev => ({
        ...prev,
        title: data.title || t('travelStories.createDialog.defaultTitle', 'Mon voyage : {{title}}', { title: itinerary.title }),
        content: data.content || '',
        tags: data.tags || [],
        location_name: data.location || '',
        story_type: 'ai_generated',
        ai_generated_from: selectedItinerary
      }));

      setActiveTab('manual'); // Switch to manual tab to allow editing
      toast.success(t('travelStories.createDialog.toast.aiGenerated'));

    } catch (error: any) {
      console.error('Error generating story:', error);
      toast.error(t('travelStories.createDialog.toast.generationError'));
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
      toast.success(t('travelStories.createDialog.toast.instantGenerated'));

    } catch (error: any) {
      console.error('Error generating instant story:', error);
      toast.error(t('travelStories.createDialog.toast.generationError'));
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
      const points = await apiClient.get<any>('poi/tourist-points/', {
        search: searchTerm,
        is_active: true,
        limit: 5,
      });
      data = extractArrayFromResponse(points).slice(0, 5).map(p => ({ ...p, type: 'tourist_point' }));
    } else if (searchType === 'itinerary') {
      const itineraries = await savedItineraryService.list({ search: searchTerm, limit: 5 });
      data = extractArrayFromResponse(itineraries).map((i: any) => ({ id: i.id, name: i.title, type: 'itinerary' }));
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
      toast.error(t('travelStories.createDialog.toast.loginRequired'));
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error(t('travelStories.createDialog.toast.fieldsRequired'));
      return;
    }

    setLoading(true);

    try {
      // Create the story
      const lat = Number(formData.location_lat);
      const lon = Number(formData.location_lon);
      const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);

      const storyData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        tags: formData.tags,
        location_name: formData.location_name.trim() || '',
        location_lat: hasCoords ? lat : null,
        location_lon: hasCoords ? lon : null,
        trip_date: formData.trip_date ? format(formData.trip_date, 'yyyy-MM-dd') : null,
        is_public: formData.is_public,
        story_type: formData.story_type,
        ai_generated_from: formData.ai_generated_from ? String(formData.ai_generated_from) : '',
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
      const detail = error?.payload?.detail || error?.message;
      console.error('Erreur lors de la création de la story:', error?.payload || error);
      toast.error(detail || t('travelStories.createDialog.toast.createError'));
    } finally {
      setLoading(false);
    }
  };

  // Itinéraire sélectionné + ses activités (aplaties depuis days[].activities[])
  const selectedItineraryObj = userItineraries.find(i => i.id === selectedItinerary);
  const itineraryActivities: { id: string; title: string; day: number }[] = (() => {
    const days = (selectedItineraryObj?.itinerary_data?.days) || [];
    const out: { id: string; title: string; day: number }[] = [];
    days.forEach((d: any, di: number) => (d?.activities || []).forEach((a: any, ai: number) => {
      if (a?.title) out.push({ id: a.id || `${di}:${ai}`, title: a.title, day: d.dayNumber ?? di + 1 });
    }));
    return out;
  })();

  const toggleActivity = (id: string) => {
    setSelectedActivities(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Lie l'itinéraire + les activités choisies à la story, puis bascule en saisie manuelle.
  const applyItineraryLink = () => {
    if (!selectedItineraryObj) return;
    const entities: LinkedEntity[] = [
      { type: 'itinerary', id: selectedItineraryObj.id, name: selectedItineraryObj.title },
      ...selectedActivities
        .map(aid => itineraryActivities.find(a => a.id === aid))
        .filter(Boolean)
        .map(a => ({ type: 'activity' as const, id: a!.id, name: a!.title })),
    ];
    setLinkedEntities(prev => {
      const seen = new Set(prev.map(e => `${e.type}:${e.id}`));
      return [...prev, ...entities.filter(e => !seen.has(`${e.type}:${e.id}`))];
    });
    setFormData(prev => ({
      ...prev,
      title: prev.title || selectedItineraryObj.title,
      ai_generated_from: selectedItineraryObj.id,
    }));
    setActiveTab('manual');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ai-itinerary" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            {t('travelStories.createDialog.tabs.aiItinerary')}
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            {t('travelStories.createDialog.tabs.manual')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-itinerary" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                {t('travelStories.createDialog.aiItinerary.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('travelStories.createDialog.aiItinerary.selectLabel')}</Label>
                <Select value={selectedItinerary} onValueChange={(v) => { setSelectedItinerary(v); setSelectedActivities([]); }}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('travelStories.createDialog.aiItinerary.selectPlaceholder')} />
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

              {!selectedItinerary ? (
                <p className="text-sm text-muted-foreground">
                  {t('travelStories.createDialog.aiItinerary.selectFirst', "Sélectionnez d'abord un itinéraire pour choisir ses activités.")}
                </p>
              ) : itineraryActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('travelStories.createDialog.aiItinerary.noActivities', "Cet itinéraire n'a pas d'activités détaillées.")}
                </p>
              ) : (
                <div className="space-y-2">
                  <Label>{t('travelStories.createDialog.aiItinerary.chooseActivities', 'Choisissez une ou plusieurs activités à lier à votre story')}</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-auto pr-1">
                    {itineraryActivities.map((act) => (
                      <Button
                        key={act.id}
                        type="button"
                        variant={selectedActivities.includes(act.id) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleActivity(act.id)}
                        className="justify-start text-left h-auto py-2 px-3 whitespace-normal"
                      >
                        <Badge variant="secondary" className="mr-2 shrink-0">
                          {t('travelStories.createDialog.aiItinerary.dayShort', 'J{{day}}', { day: act.day })}
                        </Badge>
                        <span className="text-xs">{act.title}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={applyItineraryLink}
                disabled={!selectedItinerary}
                className="w-full"
              >
                <Link className="w-4 h-4 mr-2" />
                {t('travelStories.createDialog.aiItinerary.linkButton', 'Lier et rédiger ma story')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="mt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">{t('travelStories.createDialog.form.title')}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder={t('travelStories.createDialog.form.titlePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">{t('travelStories.createDialog.form.content')}</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder={t('travelStories.createDialog.form.contentPlaceholder')}
                rows={8}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                {t('travelStories.createDialog.form.media')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('travelStories.createDialog.form.mediaHelper')}
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
                {t('travelStories.createDialog.form.activities')}
              </Label>
              {activityLoading ? (
                <div className="text-sm text-muted-foreground">{t('travelStories.createDialog.form.activitiesLoading')}</div>
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
                      <TaxonomyIcon iconName={category.icon_name} code={category.code} className="h-4 w-4 mr-2" fallback="Activity" />
                      <span className="text-xs">{getLocalizedLabel(category, i18n.language) || category.code}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Niveau d'intensité */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                {t('travelStories.createDialog.form.intensity')}
              </Label>
              {activityLoading ? (
                <div className="text-sm text-muted-foreground">{t('travelStories.createDialog.form.intensityLoading')}</div>
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
                      <TaxonomyIcon iconName={level.icon_name} code={level.code} className="h-5 w-5" fallback="Activity" />
                      <span className="text-xs">{getLocalizedLabel(level, i18n.language) || level.code}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('travelStories.createDialog.form.date')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.trip_date ? format(formData.trip_date, "PPP", { locale: fr }) : t('travelStories.createDialog.form.datePlaceholder')}
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
                {t('travelStories.createDialog.form.location')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('travelStories.createDialog.form.locationHelper')}
              </p>
              <div className="h-64 sm:h-72 lg:h-80 w-full rounded-lg border overflow-hidden">
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
                {t('travelStories.createDialog.form.tags')}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder={t('travelStories.createDialog.form.tagsPlaceholder')}
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
                {formData.is_public ? t('travelStories.createDialog.form.public') : t('travelStories.createDialog.form.private')}
              </Label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                {t('travelStories.createDialog.form.cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t('travelStories.createDialog.form.creating') : t('travelStories.createDialog.form.create')}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
};
