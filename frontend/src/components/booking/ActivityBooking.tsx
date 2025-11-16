import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  ActivityTimeSlot,
  ActivityEquipment,
  ActivityRequirement,
  getAvailableTimeSlots,
  getActivityEquipment,
  getActivityRequirements,
  calculateBookingPrice,
  validateBookingRequirements,
  createActivityBooking
} from '@/services/activityService';

interface ActivityBookingProps {
  touristPointId: string;
  activityName: string;
  onClose: () => void;
}

export function ActivityBooking({ touristPointId, activityName, onClose }: ActivityBookingProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<ActivityTimeSlot[]>([]);
  const [equipment, setEquipment] = useState<ActivityEquipment[]>([]);
  const [requirements, setRequirements] = useState<ActivityRequirement[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    bookingDate: '',
    timeSlotId: '',
    adultParticipants: 1,
    childParticipants: 0,
    seniorParticipants: 0,
    specialRequests: '',
    equipmentRentals: [] as string[],
    participantDetails: [] as { name: string; age: number; experience?: string; medicalConditions?: string[] }[]
  });

  useEffect(() => {
    fetchActivityData();
  }, [touristPointId]);

  useEffect(() => {
    if (formData.bookingDate) {
      fetchAvailableSlots();
    }
  }, [formData.bookingDate]);

  useEffect(() => {
    if (formData.bookingDate && (formData.adultParticipants || formData.childParticipants || formData.seniorParticipants)) {
      calculatePrice();
    }
  }, [formData.bookingDate, formData.adultParticipants, formData.childParticipants, formData.seniorParticipants, formData.equipmentRentals]);

  const fetchActivityData = async () => {
    try {
      const [equipmentData, requirementsData] = await Promise.all([
        getActivityEquipment(touristPointId),
        getActivityRequirements(touristPointId)
      ]);
      
      setEquipment(equipmentData);
      setRequirements(requirementsData);
    } catch (error) {
      console.error('Error fetching activity data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de l'activité",
        variant: "destructive"
      });
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const slots = await getAvailableTimeSlots(touristPointId, formData.bookingDate);
      setTimeSlots(slots);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les créneaux disponibles",
        variant: "destructive"
      });
    }
  };

  const calculatePrice = async () => {
    try {
      const price = await calculateBookingPrice(
        touristPointId,
        formData.adultParticipants,
        formData.childParticipants,
        formData.seniorParticipants,
        formData.bookingDate,
        formData.equipmentRentals
      );
      setTotalPrice(price);
    } catch (error) {
      console.error('Error calculating price:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate requirements
      const validation = await validateBookingRequirements(touristPointId, formData.participantDetails);
      if (!validation.valid) {
        toast({
          title: "Conditions non remplies",
          description: validation.violations.join(', '),
          variant: "destructive"
        });
        return;
      }

      const selectedSlot = timeSlots.find(slot => slot.id === formData.timeSlotId);
      if (!selectedSlot) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner un créneau horaire",
          variant: "destructive"
        });
        return;
      }

      const booking = {
        tourist_point_id: touristPointId,
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone,
        booking_date: formData.bookingDate,
        time_slot_id: formData.timeSlotId,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        adult_participants: formData.adultParticipants,
        child_participants: formData.childParticipants,
        senior_participants: formData.seniorParticipants,
        total_participants: formData.adultParticipants + formData.childParticipants + formData.seniorParticipants,
        total_amount: totalPrice,
        booking_status: 'confirmed' as const,
        special_requests: formData.specialRequests,
        equipment_rentals: formData.equipmentRentals,
        participant_details: formData.participantDetails
      };

      await createActivityBooking(touristPointId, booking);
      
      toast({
        title: "Réservation confirmée",
        description: "Votre réservation a été enregistrée avec succès"
      });
      
      onClose();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la réservation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleEquipmentRental = (equipmentId: string) => {
    setFormData(prev => ({
      ...prev,
      equipmentRentals: prev.equipmentRentals.includes(equipmentId)
        ? prev.equipmentRentals.filter(id => id !== equipmentId)
        : [...prev.equipmentRentals, equipmentId]
    }));
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return days[dayOfWeek];
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Réserver {activityName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Nom complet *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="customerEmail">Email *</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Téléphone</Label>
                <Input
                  id="customerPhone"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="bookingDate">Date de l'activité *</Label>
                <Input
                  id="bookingDate"
                  type="date"
                  value={formData.bookingDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData(prev => ({ ...prev, bookingDate: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Time Slots */}
            {timeSlots.length > 0 && (
              <div>
                <Label>Créneaux horaires disponibles</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                  {timeSlots.map((slot) => (
                    <Card 
                      key={slot.id} 
                      className={`cursor-pointer transition-colors ${
                        formData.timeSlotId === slot.id 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, timeSlotId: slot.id }))}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">{slot.start_time} - {slot.end_time}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Max {slot.max_participants} participants
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Participants */}
            <div>
              <Label>Nombre de participants</Label>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <Label htmlFor="adults">Adultes</Label>
                  <Input
                    id="adults"
                    type="number"
                    min="0"
                    value={formData.adultParticipants}
                    onChange={(e) => setFormData(prev => ({ ...prev, adultParticipants: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="children">Enfants</Label>
                  <Input
                    id="children"
                    type="number"
                    min="0"
                    value={formData.childParticipants}
                    onChange={(e) => setFormData(prev => ({ ...prev, childParticipants: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="seniors">Seniors</Label>
                  <Input
                    id="seniors"
                    type="number"
                    min="0"
                    value={formData.seniorParticipants}
                    onChange={(e) => setFormData(prev => ({ ...prev, seniorParticipants: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>

            {/* Equipment Rentals */}
            {equipment.filter(e => e.type === 'optional' && e.rental_price && e.rental_price > 0).length > 0 && (
              <div>
                <Label>Équipements en location (optionnel)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {equipment
                    .filter(e => e.type === 'optional' && e.rental_price && e.rental_price > 0)
                    .map((item) => (
                      <Card 
                        key={item.id}
                        className={`cursor-pointer transition-colors ${
                          formData.equipmentRentals.includes(item.id)
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => toggleEquipmentRental(item.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{item.name}</div>
                              {item.description && (
                                <div className="text-sm text-muted-foreground">{item.description}</div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{item.rental_price}€</div>
                              {formData.equipmentRentals.includes(item.id) && (
                                <CheckCircle className="h-4 w-4 text-primary mt-1" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}

            {/* Requirements Display */}
            {requirements.length > 0 && (
              <div>
                <Label>Conditions et prérequis</Label>
                <div className="space-y-2 mt-2">
                  {requirements.map((req) => (
                    <div key={req.id} className="flex items-start gap-2">
                      <AlertTriangle className={`h-4 w-4 mt-0.5 ${req.is_mandatory ? 'text-destructive' : 'text-warning'}`} />
                      <div>
                        <Badge variant={req.is_mandatory ? 'destructive' : 'secondary'} className="mb-1">
                          {req.is_mandatory ? 'Obligatoire' : 'Recommandé'}
                        </Badge>
                        <div className="text-sm">
                          <strong>{req.type.replace(/_/g, ' ').toUpperCase()}:</strong> {req.value}
                          {req.description && <div className="text-muted-foreground mt-1">{req.description}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Equipment Provided/Required */}
            {equipment.filter(e => e.type !== 'optional').length > 0 && (
              <div>
                <Label>Équipements</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-primary">Fourni</h4>
                    {equipment.filter(e => e.type === 'provided').map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        {item.name}
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-destructive">À apporter</h4>
                    {equipment.filter(e => e.type === 'required').map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        {item.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Special Requests */}
            <div>
              <Label htmlFor="specialRequests">Demandes spéciales</Label>
              <Textarea
                id="specialRequests"
                value={formData.specialRequests}
                onChange={(e) => setFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
                placeholder="Informations médicales, allergies, besoins particuliers..."
              />
            </div>

            <Separator />

            {/* Price Summary */}
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total à payer:</span>
                <span className="text-2xl font-bold text-primary">{totalPrice.toFixed(2)}€</span>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Réservation en cours...' : 'Confirmer la réservation'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
