import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Phone, 
  Mail, 
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Plus,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { bookingService, Reservation } from '@/services/bookingService';

interface Booking {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  check_in: string;
  check_out: string;
  guests: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  created_at: string;
  updated_at: string;
  tourist_point_name?: string;
}

interface TimeSlot {
  id: string;
  tourist_point_id: string;
  time: string;
  max_capacity: number;
  available_days: string[];
  is_active: boolean;
}

const BookingManagement: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    fetchBookings();
    fetchTimeSlots();
  }, []);

  const mapReservationToBooking = (reservation: Reservation): Booking => ({
    id: reservation.id,
    customer_name: reservation.user_detail?.display_name || reservation.user_detail?.profile?.first_name || 'Client',
    customer_email: reservation.user_detail?.email || 'Email inconnu',
    customer_phone: reservation.user_detail?.profile?.phone_number,
    check_in: reservation.check_in,
    check_out: reservation.check_out,
    guests: reservation.guests,
    status: reservation.status,
    notes: reservation.special_requests || '',
    created_at: reservation.created_at,
    updated_at: reservation.updated_at,
    tourist_point_name: reservation.room_detail?.tourist_point_detail?.name || reservation.room_detail?.name,
  });

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const reservations = await bookingService.listReservations({ scope: 'partner' });
      setBookings(reservations.map(mapReservationToBooking));
    } catch (error) {
      console.error('Erreur lors du chargement des réservations:', error);
      toast.error('Erreur lors du chargement des réservations');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeSlots = async () => {
    try {
      // Simulation de créneaux horaires
      const mockTimeSlots: TimeSlot[] = [
        {
          id: '1',
          tourist_point_id: 'point-1',
          time: '09:00',
          max_capacity: 8,
          available_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          is_active: true
        },
        {
          id: '2',
          tourist_point_id: 'point-1',
          time: '11:00',
          max_capacity: 10,
          available_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
          is_active: true
        },
        {
          id: '3',
          tourist_point_id: 'point-1',
          time: '14:00',
          max_capacity: 12,
          available_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
          is_active: true
        },
        {
          id: '4',
          tourist_point_id: 'point-1',
          time: '16:30',
          max_capacity: 8,
          available_days: ['saturday', 'sunday'],
          is_active: true
        }
      ];
      setTimeSlots(mockTimeSlots);
    } catch (error) {
      console.error('Erreur lors du chargement des créneaux:', error);
    }
  };

  const updateBookingStatus = async (bookingId: number, newStatus: Booking['status']) => {
    try {
      await bookingService.updateReservation(bookingId, { status: newStatus });
      toast.success(`Réservation ${getStatusText(newStatus)}`);
      fetchBookings();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500 text-white">Confirmée</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500 text-white">En attente</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500 text-white">Annulée</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500 text-white">Terminée</Badge>;
      default:
        return <Badge variant="outline">Inconnue</Badge>;
    }
  };

  const getStatusIcon = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed': return 'confirmée';
      case 'pending': return 'en attente';
      case 'cancelled': return 'annulée';
      case 'completed': return 'terminée';
      default: return 'mise à jour';
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (selectedStatus === 'all') return true;
    return booking.status === selectedStatus;
  });

  const getStatsData = () => {
    const total = bookings.length;
    const confirmed = bookings.filter(b => b.status === 'confirmed').length;
    const pending = bookings.filter(b => b.status === 'pending').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;
    const totalPeople = bookings.reduce((sum, b) => sum + b.guests, 0);
    
    return { total, confirmed, pending, cancelled, totalPeople };
  };

  const stats = getStatsData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Réservations</h1>
          <p className="text-muted-foreground">
            Gérez toutes vos réservations en ligne et créneaux horaires
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Paramètres
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle réservation
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total réservations</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
            <div className="text-sm text-muted-foreground">Confirmées</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">En attente</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <div className="text-sm text-muted-foreground">Annulées</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.totalPeople}</div>
            <div className="text-sm text-muted-foreground">Visiteurs total</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm font-medium">Statut</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="confirmed">Confirmées</SelectItem>
                  <SelectItem value="cancelled">Annulées</SelectItem>
                  <SelectItem value="completed">Terminées</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {format(selectedDate, 'dd/MM/yyyy', { locale: fr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des réservations */}
      <div className="space-y-4">
        {filteredBookings.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    {getStatusIcon(booking.status)}
                    <h3 className="text-lg font-semibold">{booking.customer_name}</h3>
                    {getStatusBadge(booking.status)}
                  </div>
                  {booking.tourist_point_name && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {booking.tourist_point_name}
                    </p>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      <span>
                        Arrivée: {format(new Date(booking.check_in), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>
                        Départ: {format(new Date(booking.check_out), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{booking.guests} personne(s)</span>
                    </div>
                    <div className="text-muted-foreground">
                      Créée le {format(new Date(booking.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{booking.customer_email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{booking.customer_phone || 'Non renseigné'}</span>
                    </div>
                  </div>

                  {booking.notes && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm">
                        <strong>Notes:</strong> {booking.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  {booking.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirmer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Annuler
                      </Button>
                    </>
                  )}
                  
                  {booking.status === 'confirmed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateBookingStatus(booking.id, 'completed')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Terminer
                    </Button>
                  )}

                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredBookings.length === 0 && (
          <Card>
            <CardContent className="text-center p-12">
              <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune réservation</h3>
              <p className="text-muted-foreground mb-4">
                {selectedStatus === 'all' 
                  ? "Aucune réservation trouvée"
                  : `Aucune réservation ${getStatusText(selectedStatus as Booking['status'])}`
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Gestion des créneaux horaires */}
      <Card>
        <CardHeader>
          <CardTitle>Créneaux horaires disponibles</CardTitle>
          <p className="text-muted-foreground">
            Configurez vos créneaux de réservation pour optimiser votre planning
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {timeSlots.map((slot) => (
              <Card key={slot.id} className="p-4">
                <div className="text-center">
                  <div className="text-lg font-semibold">{slot.time}</div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Capacité: {slot.max_capacity} pers.
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {slot.available_days.map(day => {
                      const dayNames = {
                        monday: 'Lun',
                        tuesday: 'Mar',
                        wednesday: 'Mer',
                        thursday: 'Jeu',
                        friday: 'Ven',
                        saturday: 'Sam',
                        sunday: 'Dim'
                      };
                      return dayNames[day as keyof typeof dayNames];
                    }).join(', ')}
                  </div>
                  <Button variant="outline" size="sm" className="mt-3 w-full">
                    <Edit className="w-3 h-3 mr-1" />
                    Modifier
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingManagement;
