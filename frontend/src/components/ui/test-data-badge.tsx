import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TestTube, FlaskConical, Plane, UtensilsCrossed, Target } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TestDataBadgeProps {
  type?: 'hotel' | 'flight' | 'restaurant' | 'activity';
  variant?: 'default' | 'minimal' | 'warning';
  showTooltip?: boolean;
  className?: string;
}

export const TestDataBadge: React.FC<TestDataBadgeProps> = ({
  type = 'hotel',
  variant = 'default',
  showTooltip = true,
  className
}) => {
  const typeLabels = {
    hotel: <><FlaskConical className="h-3 w-3 mr-1" />Hôtel de test</>,
    flight: <><Plane className="h-3 w-3 mr-1" />Vol de test</>,
    restaurant: <><UtensilsCrossed className="h-3 w-3 mr-1" />Restaurant de test</>,
    activity: <><Target className="h-3 w-3 mr-1" />Activité de test</>
  };

  const tooltipMessages = {
    hotel: 'Ces données proviennent des APIs de test Amadeus. En production, des informations plus détaillées seront disponibles.',
    flight: 'Vol de démonstration utilisant les APIs de test Amadeus.',
    restaurant: 'Restaurant de test - données simulées.',
    activity: 'Activité de test - données simulées.'
  };

  const getBadgeContent = () => {
    switch (variant) {
      case 'minimal':
        return <TestTube className="h-3 w-3" />;
      case 'warning':
        return (
          <>
            <AlertTriangle className="h-3 w-3 mr-1" />
            Test
          </>
        );
      default:
        return typeLabels[type];
    }
  };

  const getBadgeVariant = () => {
    switch (variant) {
      case 'warning':
        return 'destructive' as const;
      case 'minimal':
        return 'outline' as const;
      default:
        return 'secondary' as const;
    }
  };

  const badge = (
    <Badge 
      variant={getBadgeVariant()}
      className={`text-xs ${className}`}
    >
      {getBadgeContent()}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-xs">{tooltipMessages[type]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};