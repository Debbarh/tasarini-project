import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import LocationPicker from '@/components/LocationPicker';
import { uploadMediaFile, removeMediaFile } from '@/services/mediaStorageService';
import { useAuth } from '@/contexts/AuthContext';

interface TouristPointFormData {
  name: string;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  tags: string;
  contact_phone: string;
  contact_email: string;
  website_url: string;
  opening_hours: string;
  price_range: string;
  amenities: string;
  media_images?: string[] | null;
  media_videos?: string[] | null;
}

interface TouristPointFormProps {
  formData: TouristPointFormData;
  onFormDataChange: (data: TouristPointFormData) => void;
  selectedLocation: {lat: number, lng: number, address: string} | null;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  onSubmit: (e: React.FormEvent, mediaImages: string[], mediaVideos: string[]) => void;
  onCancel: () => void;
  loading: boolean;
  isEditing: boolean;
}

const availableTags = [
  'Restaurant',
  'Hôtel',
  'Musée',
  'Monument',
  'Parc',
  'Plage',
  'Montagne',
  'Shopping',
  'Divertissement',
  'Sport',
  'Culture',
  'Nature'
];

const priceRanges = [
  { value: '€', label: '€ - Budget' },
  { value: '€€', label: '€€ - Modéré' },
  { value: '€€€', label: '€€€ - Élevé' },
  { value: '€€€€', label: '€€€€ - Luxe' }
];

const TouristPointForm: React.FC<TouristPointFormProps> = ({
  formData,
  onFormDataChange,
  selectedLocation,
  onLocationSelect,
  onSubmit,
  onCancel,
  loading,
  isEditing
}) => {
  const { user } = useAuth();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Initialize selected tags from form data
  useEffect(() => {
    if (formData.tags) {
      setSelectedTags(formData.tags.split(',').map(tag => tag.trim()).filter(Boolean));
    }
  }, [formData.tags]);

  // Initialize uploaded images and videos when editing
  useEffect(() => {
    if (isEditing && formData.media_images) {
      // Use media_images array directly
      const mediaImages = formData.media_images || [];
      setUploadedImages(mediaImages);
    }
  }, [isEditing, formData.media_images]);

  useEffect(() => {
    if (isEditing && formData.media_videos) {
      // Use media_videos array directly
      const mediaVideos = formData.media_videos || [];
      setUploadedVideos(mediaVideos);
    }
  }, [isEditing, formData.media_videos]);

  const updateFormData = (field: keyof TouristPointFormData, value: string) => {
    onFormDataChange({
      ...formData,
      [field]: value
    });
  };

  const handleTagToggle = (tag: string) => {
    
    const updatedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    setSelectedTags(updatedTags);
    updateFormData('tags', updatedTags.join(', '));
    
    if (tag === 'Restaurant') {
    }
  };

  const removeTag = (tagToRemove: string) => {
    const updatedTags = selectedTags.filter(tag => tag !== tagToRemove);
    setSelectedTags(updatedTags);
    updateFormData('tags', updatedTags.join(', '));
  };

  // Fonction de compression d'image optimisée pour le web
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');

      img.onload = () => {
        // Dimensions maximales pour les photos de points d'intérêt
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 800;
        
        let { width, height } = img;

        // Calculer les nouvelles dimensions en gardant le ratio
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = (width * MAX_HEIGHT) / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Dessiner l'image avec une qualité optimisée
        ctx!.imageSmoothingEnabled = true;
        ctx!.imageSmoothingQuality = 'high';
        ctx!.drawImage(img, 0, 0, width, height);

        // Convertir en blob avec compression optimale pour le web
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Créer un nouveau fichier avec le blob compressé
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg', // JPEG pour meilleur compression des photos
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file); // Fallback au fichier original
            }
          },
          'image/jpeg',
          0.85 // Qualité 85% - optimal pour photos web
        );
      };

      img.onerror = () => resolve(file); // Fallback au fichier original
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (file: File, type: 'image' | 'video') => {
    if (!file || !user) return;

    // Validation de la taille des fichiers
    const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB pour images
    const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB pour vidéos

    if (type === 'image' && file.size > MAX_IMAGE_SIZE) {
      toast.error('L\'image est trop volumineuse. Taille maximum : 50MB');
      return;
    }

    if (type === 'video' && file.size > MAX_VIDEO_SIZE) {
      toast.error('La vidéo est trop volumineuse. Taille maximum : 100MB');
      return;
    }

    // Validation des formats
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/webm'];

    if (type === 'image' && !allowedImageTypes.includes(file.type)) {
      toast.error('Format d\'image non supporté. Utilisez JPG, PNG, WebP ou GIF');
      return;
    }

    if (type === 'video' && !allowedVideoTypes.includes(file.type)) {
      toast.error('Format de vidéo non supporté. Utilisez MP4 ou WebM uniquement');
      return;
    }

    setUploading(true);
    try {
      // Compression des images avant upload
      let fileToUpload = file;
      if (type === 'image' && file.type.startsWith('image/')) {
        fileToUpload = await compressImage(file);
      }

      // Upload via Django API using mediaStorageService
      const result = await uploadMediaFile(fileToUpload, type, String(user.id), {
        compress: type === 'image',
        maxSizeBytes: type === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE
      });

      if (!result.success || !result.url) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update state
      if (type === 'image') {
        setUploadedImages(prev => [...prev, result.url!]);
      } else {
        setUploadedVideos(prev => [...prev, result.url!]);
      }

      toast.success(`${type === 'image' ? 'Image' : 'Vidéo'} uploadée avec succès !`);
    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error);
      toast.error(`Erreur lors de l'upload de ${type === 'image' ? "l'image" : 'la vidéo'}: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = async (url: string, type: 'image' | 'video') => {
    try {
      // Delete via Django API using mediaStorageService
      const result = await removeMediaFile(url, type);

      if (!result.success) {
        throw new Error(result.error || 'Delete failed');
      }

      // Update state
      if (type === 'image') {
        setUploadedImages(prev => prev.filter(img => img !== url));
      } else {
        setUploadedVideos(prev => prev.filter(vid => vid !== url));
      }

      toast.success(`${type === 'image' ? 'Image' : 'Vidéo'} supprimée avec succès !`);
    } catch (error: any) {
      console.error('Error removing file:', error);
      toast.error(`Erreur lors de la suppression: ${error.message}`);
    }
  };

  return (
    <form onSubmit={(e) => onSubmit(e, uploadedImages, uploadedVideos)} className="space-y-6 pb-8">
      {/* Nom et Tags */}
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="point_name">Nom *</Label>
          <Input
            id="point_name"
            value={formData.name}
            onChange={(e) => updateFormData('name', e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label>Tags / Catégories</Label>
          <div className="space-y-3">
            {/* Tags sélectionnés */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <Badge key={tag} variant="default" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:bg-red-500 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Tags disponibles */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-input'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateFormData('description', e.target.value)}
          rows={3}
          placeholder="Décrivez votre point d'intérêt..."
        />
      </div>

      {/* Contact : Téléphone et Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact_phone">Téléphone</Label>
          <Input
            id="contact_phone"
            value={formData.contact_phone}
            onChange={(e) => updateFormData('contact_phone', e.target.value)}
            placeholder="+33 1 23 45 67 89"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_email">Email</Label>
          <Input
            id="contact_email"
            type="email"
            value={formData.contact_email}
            onChange={(e) => updateFormData('contact_email', e.target.value)}
            placeholder="contact@exemple.com"
          />
        </div>
      </div>

      {/* Gamme de prix */}
      <div className="space-y-2">
        <Label htmlFor="price_range">Gamme de prix</Label>
        <Select 
          value={formData.price_range} 
          onValueChange={(value) => updateFormData('price_range', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner" />
          </SelectTrigger>
          <SelectContent>
            {priceRanges.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Site web */}
      <div className="space-y-2">
        <Label htmlFor="website_url">Site web</Label>
        <Input
          id="website_url"
          type="url"
          value={formData.website_url}
          onChange={(e) => updateFormData('website_url', e.target.value)}
          placeholder="https://www.exemple.com"
        />
      </div>

      {/* Horaires d'ouverture */}
      <div className="space-y-2">
        <Label htmlFor="opening_hours">Horaires d'ouverture</Label>
        <Textarea
          id="opening_hours"
          value={formData.opening_hours}
          onChange={(e) => updateFormData('opening_hours', e.target.value)}
          rows={3}
          placeholder='Lun-Ven: 9h-18h, Sam: 10h-16h ou JSON: {"lundi": "9h-18h", "mardi": "9h-18h"}'
        />
        <p className="text-xs text-muted-foreground">
          Vous pouvez saisir du texte libre ou du JSON structuré
        </p>
      </div>

      {/* Équipements */}
      <div className="space-y-2">
        <Label htmlFor="amenities">Équipements (séparés par des virgules)</Label>
        <Input
          id="amenities"
          value={formData.amenities}
          onChange={(e) => updateFormData('amenities', e.target.value)}
          placeholder="WiFi, Parking, Climatisation, Terrasse..."
        />
      </div>

      {/* Section Médias - Photos et Vidéos */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Photos et Vidéos</Label>
        
        {/* Upload de photos */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4" />
            <Label htmlFor="image-upload">Photos</Label>
          </div>
          
          <div className="flex items-center gap-3">
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach(file => handleFileUpload(file, 'image'));
              }}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('image-upload')?.click()}
              disabled={uploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Upload...' : 'Ajouter des photos'}
            </Button>
            <span className="text-sm text-muted-foreground">
              Formats acceptés: JPG, PNG, WebP, GIF (compressées automatiquement)
            </span>
          </div>

          {/* Affichage des images uploadées */}
          {uploadedImages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {uploadedImages.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={imageUrl}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => removeMedia(imageUrl, 'image')}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload de vidéos */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            <Label htmlFor="video-upload">Vidéos</Label>
          </div>
          
          <div className="flex items-center gap-3">
            <input
              id="video-upload"
              type="file"
              accept="video/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach(file => handleFileUpload(file, 'video'));
              }}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('video-upload')?.click()}
              disabled={uploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Upload...' : 'Ajouter des vidéos'}
            </Button>
            <span className="text-sm text-muted-foreground">
              Formats acceptés: MP4, WebM (max 100MB)
            </span>
          </div>

          {/* Affichage des vidéos uploadées */}
          {uploadedVideos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {uploadedVideos.map((videoUrl, index) => (
                <div key={index} className="relative group">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => removeMedia(videoUrl, 'video')}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Localisation avec carte */}
      <div className="space-y-2">
        <Label>Localisation</Label>
        <div className="relative z-0">
          <LocationPicker
            latitude={selectedLocation?.lat || 48.8566}
            longitude={selectedLocation?.lng || 2.3522}
            onLocationSelect={onLocationSelect}
          />
        </div>
        {selectedLocation && (
          <div className="text-sm bg-muted p-2 rounded">
            <strong>Adresse sélectionnée:</strong> {selectedLocation.address}
          </div>
        )}
      </div>


      {/* Adresse manuelle */}
      <div className="space-y-2">
        <Label htmlFor="address">Adresse manuelle (optionnel)</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => updateFormData('address', e.target.value)}
          placeholder="Saisir une adresse manuellement"
        />
      </div>

      
      {/* Boutons d'action */}
      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border mt-6">
        <Button 
          type="submit" 
          disabled={loading || uploading}
          className="flex-1 sm:flex-none sm:min-w-[120px] h-11"
        >
          {loading || uploading ? 'Sauvegarde...' : isEditing ? 'Mettre à jour' : 'Créer'}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="flex-1 sm:flex-none sm:min-w-[120px] h-11"
        >
          Annuler
        </Button>
      </div>

    </form>
  );
};

export default TouristPointForm;
