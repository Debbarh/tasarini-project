import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown, Star, Building2 } from 'lucide-react';

interface PartnerBadgeProps {
  isPartner?: boolean;
  partnerBadgeText?: string;
  isFeatured?: boolean;
  variant?: 'small' | 'medium' | 'large';
  className?: string;
}

const PartnerBadge: React.FC<PartnerBadgeProps> = ({
  isPartner = false,
  partnerBadgeText,
  isFeatured = false,
  variant = 'medium',
  className = ''
}) => {
  if (!isPartner) return null;

  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'text-sm px-3 py-1.5',
    large: 'text-base px-4 py-2'
  };

  const iconSizes = {
    small: 'w-3 h-3',
    medium: 'w-4 h-4',
    large: 'w-5 h-5'
  };

  if (isFeatured) {
    return (
      <Badge 
        variant="default" 
        className={`bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 ${sizeClasses[variant]} ${className}`}
      >
        <Crown className={`${iconSizes[variant]} mr-1`} />
        {partnerBadgeText || 'Partenaire Premium'}
      </Badge>
    );
  }

  return (
    <Badge 
      variant="default" 
      className={`bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 ${sizeClasses[variant]} ${className}`}
    >
      <Building2 className={`${iconSizes[variant]} mr-1`} />
      {partnerBadgeText || 'Partenaire'}
    </Badge>
  );
};

export default PartnerBadge;