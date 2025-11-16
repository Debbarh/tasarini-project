import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Image as ImageIcon, Video, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { UnifiedPOIFormData } from '@/types/poi-form';
import { useAuth } from '@/contexts/AuthContext';
import { 
  uploadMultipleMediaFiles, 
  removeMediaFile, 
  handleMediaUploadResults 
} from '@/services/mediaStorageService';

interface MediaSectionProps {
  formData: UnifiedPOIFormData;
  updateField: <K extends keyof UnifiedPOIFormData>(field: K, value: UnifiedPOIFormData[K]) => void;
  warnings: Record<string, string>;
}

export const MediaSection: React.FC<MediaSectionProps> = ({
  formData,
  updateField,
  warnings
}) => {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user?.id) return;

    setUploading(true);

    try {
      const { successes, errors } = await uploadMultipleMediaFiles(
        files,
        type,
        user.id,
        {
          compress: true,
          quality: 0.8,
          maxWidth: 1920,
          maxHeight: 1080
        }
      );

      // Mettre à jour les données du formulaire
      if (type === 'image') {
        updateField('media_images', [...formData.media_images, ...successes]);
      } else {
        updateField('media_videos', [...formData.media_videos, ...successes]);
      }

      // Afficher les résultats
      handleMediaUploadResults(successes, errors, type);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Erreur lors de l'upload: ${error.message}`);
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const removeMedia = async (url: string, type: 'image' | 'video') => {
    try {
      const result = await removeMediaFile(url, type);
      
      if (result.success) {
        if (type === 'image') {
          updateField('media_images', formData.media_images.filter(img => img !== url));
        } else {
          updateField('media_videos', formData.media_videos.filter(vid => vid !== url));
        }
        toast.success('Fichier supprimé');
      } else {
        toast.error(result.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error removing media:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Médias
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Images */}
        <div>
          <Label className="text-base font-medium">Images</Label>
          <div className="mt-2">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileUpload(e, 'image')}
              style={{ display: 'none' }}
              id="image-upload"
              disabled={uploading}
            />
            <Button 
              type="button"
              variant="outline" 
              onClick={() => document.getElementById('image-upload')?.click()}
              disabled={uploading}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Upload en cours...' : 'Ajouter des images'}
            </Button>
          </div>

          {formData.media_images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              {formData.media_images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Image ${index + 1}`}
                    className="w-full h-32 object-cover rounded-md"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeMedia(image, 'image')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Videos */}
        <div>
          <Label className="text-base font-medium">Vidéos</Label>
          <div className="mt-2">
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={(e) => handleFileUpload(e, 'video')}
              style={{ display: 'none' }}
              id="video-upload"
              disabled={uploading}
            />
            <Button 
              type="button"
              variant="outline" 
              onClick={() => document.getElementById('video-upload')?.click()}
              disabled={uploading}
              className="w-full"
            >
              <Video className="h-4 w-4 mr-2" />
              {uploading ? 'Upload en cours...' : 'Ajouter des vidéos'}
            </Button>
          </div>

          {formData.media_videos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {formData.media_videos.map((video, index) => (
                <div key={index} className="relative group">
                  <video
                    src={video}
                    controls
                    className="w-full h-32 object-cover rounded-md"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeMedia(video, 'video')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {warnings.media && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">{warnings.media}</p>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p>• Images: JPG, PNG, WebP (max 5MB par image)</p>
          <p>• Vidéos: MP4, WebM, MOV (max 50MB par vidéo)</p>
          <p>• Les images seront automatiquement compressées pour optimiser les performances</p>
        </div>
      </CardContent>
    </Card>
  );
};