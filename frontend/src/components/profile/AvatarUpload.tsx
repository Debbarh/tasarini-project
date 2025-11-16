import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authTokenStorage } from '@/integrations/api/client';

interface AvatarUploadProps {
  currentAvatar?: string;
  userName: string;
  onAvatarChange: (newUrl: string) => void;
}

export const AvatarUpload = ({ currentAvatar, userName, onAvatarChange }: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image doit faire moins de 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Le fichier doit être une image');
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const accessToken = authTokenStorage.getAccessToken();
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('http://localhost:8000/api/v1/accounts/upload-avatar/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      onAvatarChange(data.avatar_url);
      toast.success('Photo de profil mise à jour!');
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error(error.message || 'Erreur lors de l\'upload');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Supprimer votre photo de profil?')) return;

    try {
      const accessToken = authTokenStorage.getAccessToken();
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('http://localhost:8000/api/v1/accounts/profiles/me/', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ avatar_url: '' })
      });

      if (!response.ok) {
        throw new Error('Failed to remove avatar');
      }

      onAvatarChange('');
      setPreview(null);
      toast.success('Photo de profil supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getInitials = () => {
    return userName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className="h-32 w-32 border-4 border-background shadow-lg transition-transform group-hover:scale-105">
          <AvatarImage src={preview || currentAvatar} alt={userName} />
          <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-primary-glow text-white">
            {getInitials()}
          </AvatarFallback>
        </Avatar>

        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-0 right-0 rounded-full shadow-md hover:shadow-lg transition-shadow"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Upload...' : 'Changer'}
        </Button>

        {(currentAvatar || preview) && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        JPG, PNG, GIF ou WebP. Max 5MB.
      </p>
    </div>
  );
};
