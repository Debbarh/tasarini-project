import React from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavoritePOIs } from '@/hooks/useFavoritePOIs';
import { useAuth } from '@/contexts/AuthContext';

interface POIFavoriteButtonProps {
  touristPointId: string;
  size?: 'sm' | 'default';
  variant?: 'default' | 'outline' | 'ghost';
  // POI externe non encore importé : on l'importe à la demande et on renvoie l'UUID réel.
  onActivate?: () => Promise<string | null>;
}

export const POIFavoriteButton: React.FC<POIFavoriteButtonProps> = ({
  touristPointId,
  size = 'sm',
  variant = 'ghost',
  onActivate
}) => {
  const { user } = useAuth();
  const { toggleFavorite, isFavorite } = useFavoritePOIs();

  if (!user) return null;

  const favorite = isFavorite(touristPointId);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    let id = touristPointId;
    if (id.startsWith('ext:') && onActivate) {
      const resolved = await onActivate();
      if (!resolved) return; // import échoué / non connecté
      id = resolved;
    }
    toggleFavorite(id);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={`hover-scale ${favorite ? 'text-red-500' : 'text-muted-foreground'}`}
    >
      <Heart 
        className={`w-4 h-4 ${favorite ? 'fill-current' : ''}`} 
      />
    </Button>
  );
};