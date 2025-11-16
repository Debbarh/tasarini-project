import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  MapPin, 
  Clock, 
  Euro, 
  ChevronDown, 
  ChevronUp, 
  Navigation,
  Heart,
  Share2,
  Calendar,
  Users,
  Sparkles
} from 'lucide-react';
import { DetailedItinerary } from '@/types/trip';
import { BookingEnrichmentPanel } from './BookingEnrichmentPanel';
import { EnrichmentOptions } from '@/services/tripEnrichmentService';
import { TransferCard } from './TransferCard';
import SaveItineraryDialog from '@/components/itinerary/SaveItineraryDialog';

interface SmartItineraryPreviewProps {
  itinerary: DetailedItinerary;
  onSave?: () => void;
  onShare?: () => void;
  showActions?: boolean;
  enrichmentData?: EnrichmentOptions | null;
  isEnriching?: boolean;
}

interface FixedSaveDialogProps {
  itinerary: DetailedItinerary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export const SmartItineraryPreview: React.FC<SmartItineraryPreviewProps> = ({
  itinerary,
  onSave,
  onShare,
  showActions = true,
  enrichmentData,
  isEnriching = false
}) => {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const toggleDay = (dayNumber: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dayNumber)) {
      newExpanded.delete(dayNumber);
    } else {
      newExpanded.add(dayNumber);
    }
    setExpandedDays(newExpanded);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'restaurant': return '🍽️';
      case 'activity': return '🎯';
      case 'transport': return '🚗';
      case 'accommodation': return '🏨';
      default: return '📍';
    }
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                {itinerary.title}
              </CardTitle>
              <p className="text-muted-foreground mt-2">{itinerary.description}</p>
            </div>
            
            {showActions && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveDialog(true)}
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Sauvegarder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onShare}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Partager
                </Button>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap gap-4 mt-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {itinerary.days?.length || 0} jours
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Euro className="w-3 h-3" />
              Budget: {formatBudget(itinerary.totalBudget || 0)}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {itinerary.days?.reduce((acc, day) => acc + (day.activities?.length || 0), 0)} activités
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Budget Breakdown */}
      {itinerary.budgetBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Répartition du budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(itinerary.budgetBreakdown).map(([category, amount]) => (
                <div key={category} className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {formatBudget(amount as number)}
                  </div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {category === 'accommodation' ? 'Hébergement' :
                     category === 'food' ? 'Nourriture' :
                     category === 'activities' ? 'Activités' :
                     category === 'transport' ? 'Transport' : category}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Days */}
      <div className="space-y-4">
        {itinerary.days?.map((day, index) => (
          <div key={day.dayNumber}>
            <Card className="overflow-hidden">
              <Collapsible 
                open={expandedDays.has(day.dayNumber)}
                onOpenChange={() => toggleDay(day.dayNumber)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                            {day.dayNumber}
                          </span>
                          Jour {day.dayNumber} - {day.theme}
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(day.date).toLocaleDateString('fr-FR')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {day.activities?.length || 0} activités
                          </span>
                          <span className="flex items-center gap-1">
                            <Euro className="w-4 h-4" />
                            {formatBudget(day.dailyBudget || 0)}
                          </span>
                        </div>
                      </div>
                      
                      {expandedDays.has(day.dayNumber) ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {/* Activities Timeline */}
                    <div className="space-y-4">
                      {day.activities?.map((activity, activityIndex) => (
                        <div key={activity.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                              {getActivityIcon(activity.type)}
                            </div>
                            {activityIndex < (day.activities?.length || 0) - 1 && (
                              <div className="w-px h-12 bg-border mt-2" />
                            )}
                          </div>
                          
                          <div className="flex-1 pb-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {activity.time}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {activity.duration}
                                  </Badge>
                                  {activity.cost > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      {formatBudget(activity.cost)}
                                    </Badge>
                                  )}
                                </div>
                                
                                <h4 className="font-semibold">{activity.title}</h4>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {activity.description}
                                </p>
                                
                                {activity.location && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                    <MapPin className="w-3 h-3" />
                                    {typeof activity.location === 'string' ? (
                                      <span>{activity.location}</span>
                                    ) : (
                                      <>
                                        <span>{activity.location.name}</span>
                                        {activity.location.address && (
                                          <span>• {activity.location.address}</span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                                
                                {activity.tips && (
                                  <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                                    <p className="text-xs text-blue-800">
                                      <strong>💡 Conseil:</strong> {activity.tips}
                                    </p>
                                  </div>
                                )}
                                
                                {activity.bookingAdvice && (
                                  <div className="bg-amber-50 border border-amber-200 rounded p-2">
                                    <p className="text-xs text-amber-800">
                                      <strong>📝 Réservation:</strong> {activity.bookingAdvice}
                                    </p>
                                  </div>
                                )}
                              </div>
                              
                              <Button variant="ghost" size="sm">
                                <Navigation className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Transportation info */}
                    {day.transportation && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <h5 className="font-medium text-sm mb-1">🚗 Transport du jour</h5>
                        <p className="text-xs text-muted-foreground">{day.transportation}</p>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Transfer section between days */}
            {index < itinerary.days.length - 1 && enrichmentData?.transfers && (
              <div className="my-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px bg-border flex-1" />
                  <div className="text-sm text-muted-foreground bg-background px-3">
                    Transfert vers {itinerary.days[index + 1].destination}
                  </div>
                  <div className="h-px bg-border flex-1" />
                </div>
                
                {enrichmentData.transfers
                  .filter(transfer => transfer.dayNumber === index + 1)
                  .map((transfer, transferIndex) => (
                    <TransferCard
                      key={transferIndex}
                      transfer={transfer}
                      showDay={false}
                    />
                  ))
                }
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Practical Tips */}
      {itinerary.practicalTips && itinerary.practicalTips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conseils pratiques</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {itinerary.practicalTips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-primary">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <SaveItineraryDialog
          open={showSaveDialog}
          onOpenChange={setShowSaveDialog}
          onSave={async (title: string, description?: string) => {
            setShowSaveDialog(false);
            onSave?.();
            return true;
          }}
        />
      )}

      {/* Panel d'enrichissement Amadeus */}
      <BookingEnrichmentPanel 
        enrichmentData={enrichmentData}
        isEnriching={isEnriching}
      />
    </div>
  );
};