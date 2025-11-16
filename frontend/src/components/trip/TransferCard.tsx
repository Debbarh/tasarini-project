import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  Plane, 
  Train, 
  Bus, 
  MapPin, 
  Clock, 
  Users,
  Luggage,
  CheckCircle
} from 'lucide-react';
import { TransferOption } from '@/services/transfersService';

interface TransferCardProps {
  transfer: TransferOption;
  onBook?: (transfer: TransferOption) => void;
  showDay?: boolean;
  dayNumber?: number;
}

const getTransferIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'airport':
      return Plane;
    case 'train':
      return Train;
    case 'bus':
      return Bus;
    default:
      return Car;
  }
};

const formatDuration = (duration: string) => {
  // Convert various duration formats to readable format
  const match = duration.match(/(\d+)/);
  const minutes = match ? parseInt(match[1]) : 0;
  
  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  }
};

export const TransferCard: React.FC<TransferCardProps> = ({
  transfer,
  onBook,
  showDay = false,
  dayNumber
}) => {
  const IconComponent = getTransferIcon(transfer.type);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <IconComponent className="h-4 w-4 text-primary" />
              <h4 className="font-medium text-sm">{transfer.name}</h4>
              {showDay && dayNumber && (
                <Badge variant="secondary" className="text-xs">
                  Jour {dayNumber}
                </Badge>
              )}
              {transfer.type === 'airport' && (
                <Badge variant="outline" className="text-xs">
                  Aéroport
                </Badge>
              )}
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3" />
                <span>{transfer.from.name} → {transfer.to.name}</span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDuration(transfer.duration)}</span>
                </div>
                
                {transfer.vehicle && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{transfer.vehicle.capacity} pers.</span>
                  </div>
                )}
              </div>

              {transfer.vehicle?.features && transfer.vehicle.features.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {transfer.vehicle.features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span className="text-xs">{feature}</span>
                    </div>
                  ))}
                </div>
              )}

              {transfer.includedServices && transfer.includedServices.length > 0 && (
                <div className="flex items-center gap-1">
                  <Luggage className="h-3 w-3" />
                  <span className="text-xs">
                    {transfer.includedServices.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="text-right ml-4">
            <div className="font-semibold text-sm">
              {transfer.price.amount}€
            </div>
            <div className="text-xs text-muted-foreground">
              {transfer.vehicle?.type || 'Transfer'}
            </div>
            {onBook && (
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-2"
                onClick={() => onBook(transfer)}
              >
                Réserver
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};