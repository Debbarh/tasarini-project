import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, CreditCard, Clock, MapPin } from 'lucide-react';
import { BookingItem, BookingRequest, BookingResult, BookingType } from '@/types/booking';
import { bookingRouterService } from '@/services/bookingRouterService';
import { PartnerBookingAdapter } from '@/services/partnerBookingAdapter';
import { useToast } from '@/hooks/use-toast';

interface UnifiedBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: BookingItem | null;
  bookingType: BookingType;
  defaultDates?: {
    start?: string;
    end?: string;
    time?: string;
  };
}

export const UnifiedBookingDialog: React.FC<UnifiedBookingDialogProps> = ({
  isOpen,
  onClose,
  item,
  bookingType,
  defaultDates
}) => {
  const [loading, setLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [dates, setDates] = useState({
    start: defaultDates?.start || '',
    end: defaultDates?.end || '',
    time: defaultDates?.time || ''
  });
  const [participants, setParticipants] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [partnerInfo, setPartnerInfo] = useState<any>(null);
  const { toast } = useToast();

  // Check for partner booking on item change
  useEffect(() => {
    const checkPartnerBooking = async () => {
      if (item?.id) {
        const partnerBookingInfo = await PartnerBookingAdapter.checkPartnerBooking(item.id);
        setPartnerInfo(partnerBookingInfo);
      }
    };
    
    checkPartnerBooking();
  }, [item]);

  const handleBooking = async () => {
    if (!item || !customerInfo.name || !customerInfo.email) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const request: BookingRequest = {
        item,
        bookingType,
        customerInfo,
        dates: dates.start || dates.end || dates.time ? dates : undefined,
        participants,
        specialRequests: specialRequests || undefined
      };

      const result: BookingResult = await bookingRouterService.routeBooking(request);

      if (result.success) {
        if (result.redirectUrl) {
          // External booking - redirect to provider
          toast({
            title: "Redirection en cours",
            description: "Vous allez être redirigé vers notre partenaire pour finaliser la réservation"
          });
          
          setTimeout(() => {
            window.open(result.redirectUrl, '_blank');
            onClose();
          }, 1500);
        } else {
          // Internal booking - show success
          toast({
            title: "Réservation initiée",
            description: "Votre réservation a été enregistrée avec succès"
          });
          onClose();
        }
      } else {
        throw new Error(result.error || 'Erreur de réservation');
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: "Erreur de réservation",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  const isExternal = item.sourceType === 'external';
  const hasPartnerBooking = !!partnerInfo;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Réserver {item.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item Summary */}
          <div className="bg-accent/50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{item.name}</h4>
              <div className="flex gap-2">
                <Badge variant={isExternal ? "secondary" : "default"}>
                  {isExternal ? 'Externe' : 'Interne'}
                </Badge>
                {hasPartnerBooking && (
                  <Badge variant="outline" className="text-xs">
                    <ExternalLink className="w-2 h-2 mr-1" />
                    Partenaire
                  </Badge>
                )}
              </div>
            </div>
            
            {item.description && (
              <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-primary">
                {item.price.amount}€
              </span>
              <span className="text-xs text-muted-foreground">
                Par {bookingType === 'hotel' ? 'nuit' : bookingType === 'flight' ? 'personne' : 'réservation'}
              </span>
            </div>
          </div>

          <Separator />

          {/* Customer Information */}
          <div className="space-y-3">
            <h5 className="font-medium text-sm">Informations client</h5>
            
            <div className="grid gap-3">
              <div>
                <Label htmlFor="name" className="text-xs">Nom complet *</Label>
                <Input
                  id="name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Votre nom complet"
                  className="h-8"
                />
              </div>
              
              <div>
                <Label htmlFor="email" className="text-xs">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="votre@email.com"
                  className="h-8"
                />
              </div>
              
              <div>
                <Label htmlFor="phone" className="text-xs">Téléphone</Label>
                <Input
                  id="phone"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+33 6 12 34 56 78"
                  className="h-8"
                />
              </div>
            </div>
          </div>

          {/* Dates & Details */}
          {(bookingType === 'hotel' || bookingType === 'restaurant' || bookingType === 'activity') && (
            <>
              <Separator />
              <div className="space-y-3">
                <h5 className="font-medium text-sm flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Dates et détails
                </h5>
                
                <div className="grid gap-3">
                  {bookingType === 'hotel' && (
                    <>
                      <div>
                        <Label htmlFor="checkin" className="text-xs">Arrivée</Label>
                        <Input
                          id="checkin"
                          type="date"
                          value={dates.start}
                          onChange={(e) => setDates(prev => ({ ...prev, start: e.target.value }))}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label htmlFor="checkout" className="text-xs">Départ</Label>
                        <Input
                          id="checkout"
                          type="date"
                          value={dates.end}
                          onChange={(e) => setDates(prev => ({ ...prev, end: e.target.value }))}
                          className="h-8"
                        />
                      </div>
                    </>
                  )}
                  
                  {(bookingType === 'restaurant' || bookingType === 'activity') && (
                    <>
                      <div>
                        <Label htmlFor="date" className="text-xs">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={dates.start}
                          onChange={(e) => setDates(prev => ({ ...prev, start: e.target.value }))}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label htmlFor="time" className="text-xs">Heure</Label>
                        <Input
                          id="time"
                          type="time"
                          value={dates.time}
                          onChange={(e) => setDates(prev => ({ ...prev, time: e.target.value }))}
                          className="h-8"
                        />
                      </div>
                    </>
                  )}
                  
                  <div>
                    <Label htmlFor="participants" className="text-xs">
                      {bookingType === 'hotel' ? 'Personnes' : 'Participants'}
                    </Label>
                    <Input
                      id="participants"
                      type="number"
                      min="1"
                      max="20"
                      value={participants}
                      onChange={(e) => setParticipants(parseInt(e.target.value) || 1)}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Special Requests */}
          <div>
            <Label htmlFor="requests" className="text-xs">Demandes spéciales</Label>
            <Textarea
              id="requests"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Allergies, accessibilité, préférences..."
              className="resize-none h-16 text-sm"
            />
          </div>

          {/* Booking Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            
            <Button 
              onClick={handleBooking} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : isExternal ? (
                <ExternalLink className="h-4 w-4 mr-2" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Traitement...' : isExternal ? 'Continuer' : 'Réserver'}
            </Button>
          </div>

          {(isExternal || hasPartnerBooking) && (
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>Vous serez redirigé vers notre partenaire pour finaliser la réservation</p>
              {partnerInfo?.config?.booking_instructions && (
                <p className="text-blue-600">{partnerInfo.config.booking_instructions}</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};