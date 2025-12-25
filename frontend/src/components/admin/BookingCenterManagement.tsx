import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Calendar as CalendarIcon,
  Users,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Search,
  Filter,
  Building2,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { bookingService, Reservation } from '@/services/bookingService';
import { extractArrayFromResponse } from '@/integrations/api/client';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
  completed: 'bg-blue-100 text-blue-800 border-blue-300',
};

const STATUS_LABELS = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
  completed: 'Terminée',
};

const STATUS_ICONS = {
  pending: AlertCircle,
  confirmed: CheckCircle,
  cancelled: XCircle,
  completed: CheckCircle,
};

export const BookingCenterManagement = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    fetchReservations();
  }, []);

  useEffect(() => {
    filterReservations();
  }, [reservations, selectedStatus, searchTerm]);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      // Admin view - fetch all reservations without scope restriction
      const data = await bookingService.listReservations();
      const reservationsArray = extractArrayFromResponse<Reservation>(data);
      setReservations(reservationsArray);
    } catch (error) {
      console.error('Erreur lors du chargement des réservations:', error);
      toast.error('Erreur lors du chargement des réservations');
    } finally {
      setLoading(false);
    }
  };

  const filterReservations = () => {
    let filtered = [...reservations];

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((r) => r.status === selectedStatus);
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((r) =>
        r.user_detail?.email?.toLowerCase().includes(search) ||
        r.user_detail?.display_name?.toLowerCase().includes(search) ||
        r.room_detail?.name?.toLowerCase().includes(search) ||
        r.room_detail?.tourist_point_detail?.name?.toLowerCase().includes(search) ||
        r.id.toString().includes(search)
      );
    }

    // Sort by date (most recent first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setFilteredReservations(filtered);
  };

  const handleStatusChange = async (reservationId: number, newStatus: Reservation['status']) => {
    try {
      await bookingService.updateReservation(reservationId, { status: newStatus });
      toast.success('Statut de la réservation mis à jour');
      fetchReservations();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Client', 'Email', 'Téléphone', 'Point touristique', 'Chambre', 'Check-in', 'Check-out', 'Invités', 'Montant', 'Statut', 'Créée le'];
    const rows = filteredReservations.map(r => [
      r.id,
      r.user_detail?.display_name || r.user_detail?.profile?.first_name || 'N/A',
      r.user_detail?.email || 'N/A',
      r.user_detail?.profile?.phone_number || 'N/A',
      r.room_detail?.tourist_point_detail?.name || 'N/A',
      r.room_detail?.name || 'N/A',
      format(new Date(r.check_in), 'dd/MM/yyyy'),
      format(new Date(r.check_out), 'dd/MM/yyyy'),
      r.guests,
      r.total_amount,
      STATUS_LABELS[r.status],
      format(new Date(r.created_at), 'dd/MM/yyyy HH:mm'),
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reservations_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    link.click();
  };

  const getStats = () => {
    return {
      total: reservations.length,
      pending: reservations.filter(r => r.status === 'pending').length,
      confirmed: reservations.filter(r => r.status === 'confirmed').length,
      cancelled: reservations.filter(r => r.status === 'cancelled').length,
      completed: reservations.filter(r => r.status === 'completed').length,
      totalRevenue: reservations
        .filter(r => r.status !== 'cancelled')
        .reduce((sum, r) => sum + parseFloat(r.total_amount || '0'), 0),
    };
  };

  const stats = getStats();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Chargement des réservations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Centrale de Réservation</h2>
        <p className="text-muted-foreground">
          Gérez toutes les réservations de la plateforme
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">En attente</span>
              <span className="text-2xl font-bold text-yellow-600">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Confirmées</span>
              <span className="text-2xl font-bold text-green-600">{stats.confirmed}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Annulées</span>
              <span className="text-2xl font-bold text-red-600">{stats.cancelled}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Terminées</span>
              <span className="text-2xl font-bold text-blue-600">{stats.completed}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Revenu total</span>
              <span className="text-2xl font-bold">{stats.totalRevenue.toFixed(2)} €</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par client, email, réservation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="confirmed">Confirmées</SelectItem>
                  <SelectItem value="cancelled">Annulées</SelectItem>
                  <SelectItem value="completed">Terminées</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={exportToCSV} variant="outline" className="w-full md:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reservations Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Point touristique</TableHead>
                  <TableHead>Chambre</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Invités</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Aucune réservation trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReservations.map((reservation) => {
                    const StatusIcon = STATUS_ICONS[reservation.status];
                    return (
                      <TableRow key={reservation.id}>
                        <TableCell className="font-mono text-sm">#{reservation.id}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {reservation.user_detail?.display_name || reservation.user_detail?.profile?.first_name || 'Client'}
                            </span>
                            <span className="text-xs text-muted-foreground">{reservation.user_detail?.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {reservation.room_detail?.tourist_point_detail?.name || 'N/A'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{reservation.room_detail?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span>{format(new Date(reservation.check_in), 'dd MMM yyyy', { locale: fr })}</span>
                            <span className="text-xs text-muted-foreground">
                              au {format(new Date(reservation.check_out), 'dd MMM yyyy', { locale: fr })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{reservation.guests}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{reservation.total_amount} €</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_COLORS[reservation.status]}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {STATUS_LABELS[reservation.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedReservation(reservation)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Détails de la réservation #{reservation.id}</DialogTitle>
                                  <DialogDescription>
                                    Informations complètes de la réservation
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-semibold mb-2">Informations client</h4>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                          <Users className="h-4 w-4 text-muted-foreground" />
                                          <span>{reservation.user_detail?.display_name || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Mail className="h-4 w-4 text-muted-foreground" />
                                          <span>{reservation.user_detail?.email || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Phone className="h-4 w-4 text-muted-foreground" />
                                          <span>{reservation.user_detail?.profile?.phone_number || 'N/A'}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-2">Informations hébergement</h4>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                          <Building2 className="h-4 w-4 text-muted-foreground" />
                                          <span>{reservation.room_detail?.tourist_point_detail?.name || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <MapPin className="h-4 w-4 text-muted-foreground" />
                                          <span>{reservation.room_detail?.name || 'N/A'}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold mb-2">Détails de la réservation</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">Check-in:</span>
                                        <p className="font-medium">{format(new Date(reservation.check_in), 'dd MMMM yyyy', { locale: fr })}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Check-out:</span>
                                        <p className="font-medium">{format(new Date(reservation.check_out), 'dd MMMM yyyy', { locale: fr })}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Nombre d'invités:</span>
                                        <p className="font-medium">{reservation.guests}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Montant total:</span>
                                        <p className="font-medium">{reservation.total_amount} €</p>
                                      </div>
                                    </div>
                                  </div>
                                  {reservation.special_requests && (
                                    <div>
                                      <h4 className="font-semibold mb-2">Demandes spéciales</h4>
                                      <p className="text-sm text-muted-foreground">{reservation.special_requests}</p>
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="font-semibold mb-2">Changer le statut</h4>
                                    <Select
                                      value={reservation.status}
                                      onValueChange={(value) => handleStatusChange(reservation.id, value as Reservation['status'])}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pending">En attente</SelectItem>
                                        <SelectItem value="confirmed">Confirmée</SelectItem>
                                        <SelectItem value="cancelled">Annulée</SelectItem>
                                        <SelectItem value="completed">Terminée</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingCenterManagement;
