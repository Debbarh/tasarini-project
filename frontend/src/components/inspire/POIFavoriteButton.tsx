import React from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavoritePOIs } from '@/hooks/useFavoritePOIs';
import { useAuth } from '@/contexts/AuthContext';

interface POIFavoriteButtonProps {
  touristPointId: string;
  size?: 'sm' | 'default';
  variant?: 'default' | 'outline' | 'ghost';
}

export const POIFavoriteButton: React.FC<POIFavoriteButtonProps> = ({
  touristPointId,
  size = 'sm',
  variant = 'ghost'
}) => {
  const { user } = useAuth();
  const { toggleFavorite, isFavorite } = useFavoritePOIs();

  if (!user) return null;

  const favorite = isFavorite(touristPointId);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(touristPointId);
      }}
      className={`hover-scale ${favorite ? 'text-red-500' : 'text-muted-foreground'}`}
    >
      <Heart 
        className={`w-4 h-4 ${favorite ? 'fill-current' : ''}`} 
      />
    </Button>
  );
};