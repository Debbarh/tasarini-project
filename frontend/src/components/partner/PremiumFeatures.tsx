import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/integrations/api/client';
import { toast } from 'sonner';
import { 
  Star, 
  Crown, 
  Image, 
  Calendar as CalendarIcon, 
  Download, 
  Users, 
  MapPin,
  Clock,
  Eye,
  Smartphone,
  Globe,
  TrendingUp,
  Settings,
  Upload
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface POIMedia {
  id: string;
  kind: string;
  file: string;
  external_url: string;
}

interface TouristPoint {
  id: string;
  name: string;
  description: string;
  is_partner_point: boolean;
  partner_featured: boolean;
  media: POIMedia[];
  created_at: string;
  rating: number;
  review_count: number;
  // Autres propriétés optionnelles de la table tourist_points
  address?: string;
  latitude?: number;
  longitude?: number;
  is_active?: boolean;
  is_verified?: boolean;
  tags?: string[];
  amenities?: string[];
  price_range?: string;
  contact_phone?: string;
  contact_email?: string;
  website_url?: string;
  opening_hours?: any;
  owner_id?: string;
  updated_at?: string;
  partner_badge_text?: string;
}

interface BookingData {
  id: string;
  tourist_point_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  booking_date: string;
  time_slot: string;
  party_size: number;
  status: string;
  created_at: string;
}

const PremiumFeatures: React.FC = () => {
  const { user } = useAuth();
  const [points, setPoints] = useState<TouristPoint[]>([]);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Récupérer les points d'intérêt du partenaire via Django API
      const pointsData = await apiClient.get<TouristPoint[]>('poi/tourist-points/', { owner: 'me' });
      setPoints(pointsData || []);

      // Simuler des données de réservation (à remplacer par une vraie table)
      const mockBookings: BookingData[] = [
        {
          id: '1',
          tourist_point_id: pointsData?.[0]?.id || '',
          customer_name: 'Marie Dupont',
          customer_email: 'marie.dupont@email.com',
          customer_phone: '+33 6 12 34 56 78',
          booking_date: '2024-01-20',
          time_slot: '14:00',
          party_size: 4,
          status: 'confirmed',
          created_at: '2024-01-15T10:30:00'
        },
        {
          id: '2',
          tourist_point_id: pointsData?.[0]?.id || '',
          customer_name: 'Jean Martin',
          customer_email: 'jean.martin@email.com',
          customer_phone: '+33 6 98 76 54 32',
          booking_date: '2024-01-22',
          time_slot: '16:30',
          party_size: 2,
          status: 'pending',
          created_at: '2024-01-16T14:20:00'
        }
      ];
      setBookings(mockBookings);

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const toggleFeaturedStatus = async (pointId: string, currentStatus: boolean) => {
    try {
      await apiClient.patch(`poi/tourist-points/${pointId}/`, {
        partner_featured: !currentStatus
      });

      setPoints(points.map(point =>
        point.id === pointId ? { ...point, partner_featured: !currentStatus } : point
      ));

      toast.success(`Point d'intérêt ${!currentStatus ? 'mis en avant' : 'retiré de la mise en avant'}`);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleImageUpload = async (pointId: string, files: FileList) => {
    try {
      setUploadProgress(0);
      const uploadedMedia: POIMedia[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'image');

        // Upload via Django Media API
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/media/upload/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();

        // Créer un POIMedia pour ce tourist point
        const mediaItem = await apiClient.post<POIMedia>('poi/media/', {
          tourist_point: pointId,
          kind: 'image',
          external_url: data.url
        });

        uploadedMedia.push(mediaItem);
        setUploadProgress(((i + 1) / files.length) * 100);
      }

      // Rafraîchir les données pour obtenir les media mis à jour
      const updatedPoint = await apiClient.get<TouristPoint>(`poi/tourist-points/${pointId}/`);
      setPoints(points.map(point =>
        point.id === pointId ? updatedPoint : point
      ));

      toast.success(`${uploadedMedia.length} image(s) ajoutée(s) avec succès`);
      setUploadProgress(0);
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      toast.error('Erreur lors de l\'upload des images');
      setUploadProgress(0);
    }
  };

  const exportCustomerData = () => {
    const csvContent = [
      ['Nom', 'Email', 'Téléphone', 'Date de réservation', 'Heure', 'Nombre de personnes', 'Statut', 'Point d\'intérêt'],
      ...bookings.map(booking => {
        const point = points.find(p => p.id === booking.tourist_point_id);
        return [
          booking.customer_name,
          booking.customer_email,
          booking.customer_phone,
          booking.booking_date,
          booking.time_slot,
          booking.party_size.toString(),
          booking.status,
          point?.name || 'Inconnu'
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `donnees_clients_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Données exportées avec succès');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500">Confirmée</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">En attente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulée</Badge>;
      default:
        return <Badge variant="outline">Inconnue</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Premium */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-yellow-500/10 border-purple-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-yellow-500" />
            <div>
              <CardTitle className="text-xl">Fonctionnalités Premium</CardTitle>
              <p className="text-muted-foreground">
                Accédez aux outils avancés pour maximiser votre visibilité et vos réservations
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="featured" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="featured" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Mise en avant
          </TabsTrigger>
          <TabsTrigger value="gallery" className="flex items-center gap-2">
            <Image className="w-4 h-4" />
            Galeries
          </TabsTrigger>
          <TabsTrigger value="booking" className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Réservations
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export données
          </TabsTrigger>
        </TabsList>

        {/* Mise en avant des annonces */}
        <TabsContent value="featured" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Mise en avant de vos annonces
              </CardTitle>
              <p className="text-muted-foreground">
                Mettez en avant vos points d'intérêt pour une visibilité maximale
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {points.map((point) => (
                <Card key={point.id} className={point.partner_featured ? 'ring-2 ring-purple-500' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{point.name}</h3>
                          {point.partner_featured && (
                            <Badge className="bg-purple-500">
                              <Crown className="w-3 h-3 mr-1" />
                              Mis en avant
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {point.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span>{point.rating || 0}/5</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4 text-blue-500" />
                            <span>{point.partner_featured ? '+45%' : 'Standard'} de vues</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={point.partner_featured ? "destructive" : "default"}
                          size="sm"
                          onClick={() => toggleFeaturedStatus(point.id, point.partner_featured)}
                        >
                          {point.partner_featured ? (
                            <>
                              <Star className="w-4 h-4 mr-2 fill-current" />
                              Retirer
                            </>
                          ) : (
                            <>
                              <Crown className="w-4 h-4 mr-2" />
                              Mettre en avant
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Photos illimitées et galeries */}
        <TabsContent value="gallery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5 text-blue-500" />
                Galeries photos illimitées
              </CardTitle>
              <p className="text-muted-foreground">
                Ajoutez autant de photos que vous le souhaitez pour vos points d'intérêt
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {points.map((point) => (
                <Card key={point.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{point.name}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{point.media?.length || 0} photos</span>
                      <Badge variant="outline" className="text-green-600">
                        Illimité
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Upload de nouvelles images */}
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => e.target.files && handleImageUpload(point.id, e.target.files)}
                        className="hidden"
                        id={`upload-${point.id}`}
                      />
                      <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-3">
                        Glissez-déposez vos images ou cliquez pour sélectionner
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById(`upload-${point.id}`)?.click()}
                      >
                        Ajouter des photos
                      </Button>
                      {uploadProgress > 0 && (
                        <div className="mt-3">
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{uploadProgress}% uploadé</p>
                        </div>
                      )}
                    </div>

                    {/* Galerie existante */}
                    {point.media && point.media.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {point.media.map((mediaItem, index) => (
                          <div key={mediaItem.id || index} className="relative aspect-square rounded-lg overflow-hidden">
                            <img
                              src={mediaItem.external_url || mediaItem.file}
                              alt={`Photo ${index + 1}`}
                              className="w-full h-full object-cover hover:scale-105 transition-transform"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Réservation en ligne intégrée */}
        <TabsContent value="booking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-green-500" />
                Système de réservation intégré
              </CardTitle>
              <p className="text-muted-foreground">
                Gérez les réservations directement depuis votre tableau de bord
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Widget de réservation */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Widget de réservation</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Point d'intérêt</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {points.map((point) => (
                            <SelectItem key={point.id} value={point.id}>
                              {point.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
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
                    <div>
                      <label className="text-sm font-medium">Créneau</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Heure" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="09:00">09:00</SelectItem>
                          <SelectItem value="11:00">11:00</SelectItem>
                          <SelectItem value="14:00">14:00</SelectItem>
                          <SelectItem value="16:00">16:00</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Smartphone className="w-4 h-4 mr-2" />
                      Intégrer sur mon site
                    </Button>
                    <Button variant="outline">
                      <Globe className="w-4 h-4 mr-2" />
                      Aperçu
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Aperçu des réservations - Version simplifiée pour premium features */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Aperçu des réservations</span>
                    <Badge variant="outline">{bookings.length} réservation(s)</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {bookings.slice(0, 3).map((booking) => {
                      const point = points.find(p => p.id === booking.tourist_point_id);
                      return (
                        <Card key={booking.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold">{booking.customer_name}</h4>
                                {getStatusBadge(booking.status)}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="w-4 h-4" />
                                  <span>{format(new Date(booking.booking_date), 'dd/MM/yyyy', { locale: fr })}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  <span>{booking.party_size} personne(s)</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm">
                                Gérer
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                    {bookings.length > 3 && (
                      <div className="text-center pt-4">
                        <Button variant="outline">
                          Voir toutes les réservations ({bookings.length})
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export des données clients */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-purple-500" />
                Export des données clients
              </CardTitle>
              <p className="text-muted-foreground">
                Exportez vos données de réservation pour l'analyse et le suivi
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Statistiques des données */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{bookings.length}</div>
                    <div className="text-sm text-muted-foreground">Réservations totales</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {bookings.filter(b => b.status === 'confirmed').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Confirmées</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {new Set(bookings.map(b => b.customer_email)).size}
                    </div>
                    <div className="text-sm text-muted-foreground">Clients uniques</div>
                  </CardContent>
                </Card>
              </div>

              {/* Options d'export */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Options d'export</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="text-sm font-medium">Période</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner la période" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="last-7-days">7 derniers jours</SelectItem>
                          <SelectItem value="last-30-days">30 derniers jours</SelectItem>
                          <SelectItem value="last-3-months">3 derniers mois</SelectItem>
                          <SelectItem value="all-time">Toutes les données</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Format</label>
                      <Select defaultValue="csv">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">CSV (Excel)</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="pdf">PDF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Données incluses :</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Informations client</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Dates de réservation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Points d'intérêt</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Statuts des réservations</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-6">
                    <Button onClick={exportCustomerData} className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Exporter les données
                    </Button>
                    <Button variant="outline">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Analyser les tendances
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PremiumFeatures;