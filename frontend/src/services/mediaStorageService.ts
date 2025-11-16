import { API_BASE_URL, authTokenStorage } from '@/integrations/api/client';
import { toast } from 'sonner';

export interface MediaUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface MediaUploadOptions {
  compress?: boolean;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  maxSizeBytes?: number;
}

// Limite de taille par défaut
const DEFAULT_SIZE_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB
  video: 50 * 1024 * 1024 // 50MB
};

// Compression d'image standardisée
export const compressImage = (
  file: File, 
  options: MediaUploadOptions = {}
): Promise<File> => {
  const {
    quality = 0.8,
    maxWidth = 1920,
    maxHeight = 1080
  } = options;

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      let { width, height } = img;
      
      // Calculer les nouvelles dimensions en gardant le ratio
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        } else {
          resolve(file);
        }
      }, 'image/jpeg', quality);
    };
    
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
};

// Validation de fichier standardisée
export const validateMediaFile = (
  file: File, 
  type: 'image' | 'video',
  options: MediaUploadOptions = {}
): string | null => {
  const maxSize = options.maxSizeBytes || DEFAULT_SIZE_LIMITS[type];
  
  // Vérifier la taille
  if (file.size > maxSize) {
    const sizeMB = Math.round(maxSize / (1024 * 1024));
    return `Le fichier est trop volumineux. Taille maximum: ${sizeMB}MB`;
  }
  
  // Vérifier le type MIME
  if (type === 'image' && !file.type.startsWith('image/')) {
    return 'Veuillez sélectionner un fichier image valide';
  }
  
  if (type === 'video' && !file.type.startsWith('video/')) {
    return 'Veuillez sélectionner un fichier vidéo valide';
  }
  
  return null;
};

// Upload unique de fichier
export const uploadMediaFile = async (
  file: File,
  type: 'image' | 'video',
  userId: string,
  options: MediaUploadOptions = {}
): Promise<MediaUploadResult> => {
  try {
    // Validation
    const validationError = validateMediaFile(file, type, options);
    if (validationError) {
      return { success: false, error: validationError };
    }

    let fileToUpload = file;
    
    // Compression pour les images
    if (type === 'image' && options.compress !== false) {
      fileToUpload = await compressImage(file, options);
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('type', type);

    const uploadEndpoint = buildMediaUrl('upload');
    const token = authTokenStorage.getAccessToken();

    const response = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const detail = payload?.detail || response.statusText;
      return { success: false, error: detail };
    }

    const payload = await response.json();
    return { success: true, url: payload.url };
  } catch (error: any) {
    console.error('Upload error:', error);
    return { success: false, error: error.message || 'Erreur inconnue' };
  }
};

// Upload multiple de fichiers
export const uploadMultipleMediaFiles = async (
  files: FileList | File[],
  type: 'image' | 'video',
  userId: string,
  options: MediaUploadOptions = {}
): Promise<{ successes: string[]; errors: string[] }> => {
  const fileArray = Array.from(files);
  const successes: string[] = [];
  const errors: string[] = [];

  // Traitement en parallèle
  const uploadPromises = fileArray.map(async (file) => {
    const result = await uploadMediaFile(file, type, userId, options);
    
    if (result.success && result.url) {
      successes.push(result.url);
    } else {
      errors.push(result.error || `Erreur avec ${file.name}`);
    }
  });

  await Promise.all(uploadPromises);

  return { successes, errors };
};

// Suppression de fichier
export const removeMediaFile = async (
  url: string,
  type: 'image' | 'video'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const token = authTokenStorage.getAccessToken();
    const response = await fetch(buildMediaUrl('delete'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ url, type }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      return { success: false, error: payload?.detail || response.statusText };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error removing media:', error);
    return { success: false, error: error.message };
  }
};

const buildMediaUrl = (action: 'upload' | 'delete') => {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
  return `${base}media/${action}/`;
};

// Utilitaire pour afficher les messages toast appropriés
export const handleMediaUploadResults = (
  successes: string[],
  errors: string[],
  type: 'image' | 'video'
) => {
  if (successes.length > 0) {
    toast.success(`${successes.length} ${type === 'image' ? 'image(s)' : 'vidéo(s)'} uploadée(s) avec succès`);
  }
  
  if (errors.length > 0) {
    errors.forEach(error => {
      toast.error(error);
    });
  }
};
