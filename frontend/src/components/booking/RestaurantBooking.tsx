import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { RestaurantManagementService, RestaurantTable } from '@/services/restaurantManagementService';
import { CalendarIcon, Clock, Users, Phone, Mail, MessageSquare } from 'lucide-react';

interface RestaurantBookingProps {
  restaurantId: string;
  restaurantName: string;
  onBookingComplete?: (reservationId: string) => void;
}

interface BookingForm {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  reservationDate: Date | undefined;
  reservationTime: string;
  partySize: number;
  specialRequests: string;
  tablePreferences: string;
}

export const RestaurantBooking: React.FC<RestaurantBookingProps> = ({
  restaurantId,
  restaurantName,
  onBookingComplete
}) => {
  const [availableTables, setAvailableTables] = useState<RestaurantTable[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const [bookingForm, setBookingForm] = useState<BookingForm>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    reservationDate: undefined,
    reservationTime: '',
    partySize: 2,
    specialRequests: '',
    tablePreferences: ''
  });

  // Generate time slots from 11:00 to 22:00 in 30-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 11; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  useEffect(() => {
    setTimeSlots(generateTimeSlots());
  }, []);

  const checkAvailability = async () => {
    if (!bookingForm.reservationDate || !bookingForm.reservationTime || !bookingForm.partySize) {
      return;
    }

    setCheckingAvailability(true);
    try {
      const dateString = bookingForm.reservationDate.toISOString().split('T')[0];
      const availability = await RestaurantManagementService.checkAvailability(
        restaurantId,
        dateString,
        bookingForm.reservationTime,
        bookingForm.partySize
      );

      setAvailableTables(availability.availableTables);

      if (!availability.available) {
        toast({
          title: "Indisponible",
          description: "Aucune table disponible pour ce créneau",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de vérifier la disponibilité",
        variant: "destructive"
      });
    } finally {
      setCheckingAvailability(false);
    }
  };

  useEffect(() => {
    if (bookingForm.reservationDate && bookingForm.reservationTime && bookingForm.partySize) {
      checkAvailability();
    }
  }, [bookingForm.reservationDate, bookingForm.reservationTime, bookingForm.partySize]);

  const handleSubmitReservation = async () => {
    if (!bookingForm.customerName || !bookingForm.customerEmail || !bookingForm.reservationDate || !bookingForm.reservationTime) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const reservation = await RestaurantManagementService.createReservation({
        restaurant_id: restaurantId,
        customer_name: bookingForm.customerName,
        customer_email: bookingForm.customerEmail,
        customer_phone: bookingForm.customerPhone,
        reservation_date: bookingForm.reservationDate.toISOString().split('T')[0],
        reservation_time: bookingForm.reservationTime,
        party_size: bookingForm.partySize,
        status: 'pending',
        special_requests: bookingForm.specialRequests,
        table_preferences: bookingForm.tablePreferences
      });

      toast({
        title: "Réservation confirmée",
        description: "Votre demande de réservation a été envoyée au restaurant"
      });

      // Reset form
      setBookingForm({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        reservationDate: undefined,
        reservationTime: '',
        partySize: 2,
        specialRequests: '',
        tablePreferences: ''
      });

      onBookingComplete?.(reservation.id);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la création de la réservation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field: keyof BookingForm, value: any) => {
    setBookingForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Réserver une table chez {restaurantName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date and Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Date de réservation *</Label>
              <Calendar
                mode="single"
                selected={bookingForm.reservationDate}
                onSelect={(date) => updateForm('reservationDate', date)}
                disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                className="rounded-md border"
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="reservation-time">Heure de réservation *</Label>
                <Select 
                  value={bookingForm.reservationTime} 
                  onValueChange={(value) => updateForm('reservationTime', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une heure" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {slot}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="party-size">Nombre de personnes *</Label>
                <Select 
                  value={bookingForm.partySize.toString()} 
                  onValueChange={(value) => updateForm('partySize', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nombre de personnes" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {size} personne{size > 1 ? 's' : ''}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Availability Display */}
              {checkingAvailability && (
                <div className="text-sm text-muted-foreground">
                  Vérification de la disponibilité...
                </div>
              )}

              {availableTables.length > 0 && !checkingAvailability && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 font-medium">
                    ✓ Tables disponibles pour ce créneau
                  </p>
                  <div className="flex gap-2 mt-2">
                    {availableTables.slice(0, 3).map((table) => (
                      <Badge key={table.id} variant="outline" className="text-green-700 border-green-300">
                        {table.table_number} ({table.capacity}p)
                      </Badge>
                    ))}
                    {availableTables.length > 3 && (
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        +{availableTables.length - 3} autres
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Vos informations</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer-name">Nom complet *</Label>
                <Input
                  id="customer-name"
                  value={bookingForm.customerName}
                  onChange={(e) => updateForm('customerName', e.target.value)}
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <Label htmlFor="customer-email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="customer-email"
                    type="email"
                    className="pl-10"
                    value={bookingForm.customerEmail}
                    onChange={(e) => updateForm('customerEmail', e.target.value)}
                    placeholder="jean.dupont@email.com"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="customer-phone">Téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="customer-phone"
                  type="tel"
                  className="pl-10"
                  value={bookingForm.customerPhone}
                  onChange={(e) => updateForm('customerPhone', e.target.value)}
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>
          </div>

          {/* Preferences and Special Requests */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Préférences</h3>
            
            <div>
              <Label htmlFor="table-preferences">Préférences de table</Label>
              <Select 
                value={bookingForm.tablePreferences} 
                onValueChange={(value) => updateForm('tablePreferences', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucune préférence particulière" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucune préférence</SelectItem>
                  <SelectItem value="terrasse">Terrasse</SelectItem>
                  <SelectItem value="interieur">Intérieur</SelectItem>
                  <SelectItem value="fenetre">Près d'une fenêtre</SelectItem>
                  <SelectItem value="calme">Zone calme</SelectItem>
                  <SelectItem value="acces_facile">Accès facile</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="special-requests">Demandes spéciales</Label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 text-muted-foreground h-4 w-4" />
                <Textarea
                  id="special-requests"
                  className="pl-10"
                  value={bookingForm.specialRequests}
                  onChange={(e) => updateForm('specialRequests', e.target.value)}
                  placeholder="Anniversaire, allergies alimentaires, chaise haute pour bébé..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          {bookingForm.reservationDate && bookingForm.reservationTime && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Récapitulatif de votre réservation</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Date:</strong> {bookingForm.reservationDate.toLocaleDateString('fr-FR')}</p>
                  <p><strong>Heure:</strong> {bookingForm.reservationTime}</p>
                  <p><strong>Nombre de personnes:</strong> {bookingForm.partySize}</p>
                  <p><strong>Restaurant:</strong> {restaurantName}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <Button 
            onClick={handleSubmitReservation} 
            disabled={loading || !availableTables.length || checkingAvailability}
            className="w-full"
            size="lg"
          >
            {loading ? 'Réservation en cours...' : 'Confirmer la réservation'}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            En confirmant votre réservation, vous acceptez que le restaurant vous contacte pour confirmer votre demande.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};