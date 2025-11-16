import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Users, Clock, Euro } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { accommodationService, AccommodationRoom } from "@/services/accommodationService";

interface AccommodationBookingProps {
  isOpen: boolean;
  onClose: () => void;
  touristPointId: string;
  touristPointName: string;
}

interface BookingData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  check_in_date: Date | undefined;
  check_out_date: Date | undefined;
  number_of_guests: number;
  special_requests: string;
  room_id: string;
}

export const AccommodationBooking = ({ 
  isOpen, 
  onClose, 
  touristPointId, 
  touristPointName 
}: AccommodationBookingProps) => {
  const [rooms, setRooms] = useState<AccommodationRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    check_in_date: undefined,
    check_out_date: undefined,
    number_of_guests: 1,
    special_requests: '',
    room_id: ''
  });
  const [totalPrice, setTotalPrice] = useState(0);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  useEffect(() => {
    if (isOpen && touristPointId) {
      loadRooms();
    }
  }, [isOpen, touristPointId]);

  useEffect(() => {
    if (bookingData.room_id && bookingData.check_in_date && bookingData.check_out_date) {
      calculatePrice();
    }
  }, [bookingData.room_id, bookingData.check_in_date, bookingData.check_out_date]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const roomsData = await accommodationService.getRoomsByTouristPoint(touristPointId);
      setRooms(roomsData.filter(room => room.is_available));
    } catch (error) {
      console.error('Erreur lors du chargement des chambres:', error);
      toast.error('Erreur lors du chargement des chambres');
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = async () => {
    if (!bookingData.room_id || !bookingData.check_in_date || !bookingData.check_out_date) {
      return;
    }

    try {
      const price = await accommodationService.calculateTotalPrice(
        touristPointId,
        bookingData.room_id,
        format(bookingData.check_in_date, 'yyyy-MM-dd'),
        format(bookingData.check_out_date, 'yyyy-MM-dd')
      );
      setTotalPrice(price);
    } catch (error) {
      console.error('Erreur lors du calcul du prix:', error);
    }
  };

  const checkAvailability = async () => {
    if (!bookingData.room_id || !bookingData.check_in_date || !bookingData.check_out_date) {
      return false;
    }

    setIsCheckingAvailability(true);
    try {
      const isAvailable = await accommodationService.checkAvailability(
        touristPointId,
        bookingData.room_id,
        format(bookingData.check_in_date, 'yyyy-MM-dd'),
        format(bookingData.check_out_date, 'yyyy-MM-dd')
      );
      
      if (!isAvailable) {
        toast.error('Ces dates ne sont pas disponibles pour cette chambre');
      }
      
      return isAvailable;
    } catch (error) {
      console.error('Erreur lors de la vérification de disponibilité:', error);
      toast.error('Erreur lors de la vérification de disponibilité');
      return false;
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bookingData.check_in_date || !bookingData.check_out_date) {
      toast.error('Veuillez sélectionner les dates d\'arrivée et de départ');
      return;
    }

    if (!bookingData.room_id) {
      toast.error('Veuillez sélectionner une chambre');
      return;
    }

    const isAvailable = await checkAvailability();
    if (!isAvailable) {
      return;
    }

    setLoading(true);
    try {
      const totalNights = differenceInDays(bookingData.check_out_date, bookingData.check_in_date);
      
      await accommodationService.createBooking(touristPointId, {
        room_id: bookingData.room_id,
        customer_name: bookingData.customer_name,
        customer_email: bookingData.customer_email,
        customer_phone: bookingData.customer_phone,
        check_in_date: format(bookingData.check_in_date, 'yyyy-MM-dd'),
        check_out_date: format(bookingData.check_out_date, 'yyyy-MM-dd'),
        number_of_guests: bookingData.number_of_guests,
        total_nights: totalNights,
        total_amount: totalPrice,
        booking_status: 'confirmed',
        special_requests: bookingData.special_requests
      });

      toast.success('Réservation confirmée !');
      onClose();
      resetForm();
    } catch (error) {
      console.error('Erreur lors de la réservation:', error);
      toast.error('Erreur lors de la réservation');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setBookingData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      check_in_date: undefined,
      check_out_date: undefined,
      number_of_guests: 1,
      special_requests: '',
      room_id: ''
    });
    setTotalPrice(0);
  };

  const selectedRoom = rooms.find(room => room.id === bookingData.room_id);
  const totalNights = bookingData.check_in_date && bookingData.check_out_date
    ? differenceInDays(bookingData.check_out_date, bookingData.check_in_date)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Réserver un hébergement - {touristPointName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Room Selection */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Sélectionner une chambre</Label>
            <div className="grid md:grid-cols-2 gap-4">
              {loading ? (
                <div>Chargement des chambres...</div>
              ) : rooms.length === 0 ? (
                <div>Aucune chambre disponible</div>
              ) : (
                rooms.map((room) => (
                  <Card 
                    key={room.id} 
                    className={`cursor-pointer transition-all ${
                      bookingData.room_id === room.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setBookingData(prev => ({ ...prev, room_id: room.id }))}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{room.room_name}</CardTitle>
                      <CardDescription>{room.room_type}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>Jusqu'à {room.capacity} personnes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Euro className="h-4 w-4" />
                          <span>{room.base_price_per_night}€ par nuit</span>
                        </div>
                        {room.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {room.amenities.slice(0, 3).map((amenity, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {amenity}
                              </Badge>
                            ))}
                            {room.amenities.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{room.amenities.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Dates Selection */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date d'arrivée *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {bookingData.check_in_date ? (
                      format(bookingData.check_in_date, "dd MMMM yyyy", { locale: fr })
                    ) : (
                      <span>Sélectionner une date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={bookingData.check_in_date}
                    onSelect={(date) => {
                      setBookingData(prev => ({ 
                        ...prev, 
                        check_in_date: date,
                        check_out_date: date ? addDays(date, 1) : undefined
                      }));
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Date de départ *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {bookingData.check_out_date ? (
                      format(bookingData.check_out_date, "dd MMMM yyyy", { locale: fr })
                    ) : (
                      <span>Sélectionner une date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={bookingData.check_out_date}
                    onSelect={(date) => setBookingData(prev => ({ ...prev, check_out_date: date }))}
                    disabled={(date) => 
                      date < new Date() || 
                      (bookingData.check_in_date && date <= bookingData.check_in_date)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Guest Information */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guests">Nombre de personnes *</Label>
              <Select 
                value={bookingData.number_of_guests.toString()} 
                onValueChange={(value) => setBookingData(prev => ({ ...prev, number_of_guests: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8].map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? 'personne' : 'personnes'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations du client</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet *</Label>
                <Input
                  id="name"
                  value={bookingData.customer_name}
                  onChange={(e) => setBookingData(prev => ({ ...prev, customer_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={bookingData.customer_email}
                  onChange={(e) => setBookingData(prev => ({ ...prev, customer_email: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={bookingData.customer_phone}
                onChange={(e) => setBookingData(prev => ({ ...prev, customer_phone: e.target.value }))}
              />
            </div>
          </div>

          {/* Special Requests */}
          <div className="space-y-2">
            <Label htmlFor="requests">Demandes spéciales</Label>
            <Textarea
              id="requests"
              value={bookingData.special_requests}
              onChange={(e) => setBookingData(prev => ({ ...prev, special_requests: e.target.value }))}
              placeholder="Toute demande particulière..."
              rows={3}
            />
          </div>

          {/* Booking Summary */}
          {selectedRoom && totalNights > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Résumé de la réservation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Chambre:</span>
                  <span>{selectedRoom.room_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Durée du séjour:</span>
                  <span>{totalNights} {totalNights === 1 ? 'nuit' : 'nuits'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nombre de personnes:</span>
                  <span>{bookingData.number_of_guests}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{totalPrice}€</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={loading || isCheckingAvailability || !bookingData.room_id || !bookingData.check_in_date || !bookingData.check_out_date}
            >
              {loading ? 'Réservation en cours...' : 'Confirmer la réservation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
