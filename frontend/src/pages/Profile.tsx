import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/integrations/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { 
  User, 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Star, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  ChevronUp,
  Clock,
  Phone,
  Mail,
  Globe,
  Euro,
  Wifi,
  Car,
  Calendar,
  Heart,
  Share2,
  Download,
  Facebook,
  MessageCircle,
  Twitter,
  ExternalLink,
  UserPlus
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Helmet } from 'react-helmet-async';
import LocationPicker from '@/components/LocationPicker';
import MapViewer from '@/components/MapViewer';
import TouristPointForm from '@/components/TouristPointForm';
import { useSavedItineraries } from '@/hooks/useSavedItineraries';
import { DetailedItineraryView } from '@/components/trip/DetailedItineraryView';
import { EditableItineraryView } from '@/components/itinerary/EditableItineraryView';
import { exportItineraryToPDF, shareItinerary, copyItineraryLink } from '@/utils/itineraryExport';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ItineraryShareDialog } from '@/components/itinerary/ItineraryShareDialog';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { PasswordChangeForm } from '@/components/profile/PasswordChangeForm';
import { ActiveSessions } from '@/components/profile/ActiveSessions';
import { DownloadUserData } from '@/components/profile/DownloadUserData';
import { DeleteAccount } from '@/components/profile/DeleteAccount';
import { ExtendedInfoForm } from '@/components/profile/ExtendedInfoForm';
import { AdvancedStatistics } from '@/components/profile/AdvancedStatistics';
import { AppearanceSettings } from '@/components/profile/AppearanceSettings';
import { PrivacySettings } from '@/components/profile/PrivacySettings';
import { FollowersFollowing } from '@/components/profile/FollowersFollowing';
import { UserContent } from '@/components/profile/UserContent';

interface TouristPoint {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  tags: string[] | null;
  contact_phone: string | null;
  contact_email: string | null;
  website_url: string | null;
  opening_hours: any;
  price_range: string | null;
  amenities: string[] | null;
  rating: number;
  review_count: number;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  media_images: string[] | null;
  media_videos: string[] | null;
}

interface TouristPointForm {
  name: string;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  tags: string;
  contact_phone: string;
  contact_email: string;
  website_url: string;
  opening_hours: string;
  price_range: string;
  amenities: string;
  media_images?: string[] | null;
  media_videos?: string[] | null;
}

const categories = [
  'Restaurant',
  'Hôtel',
  'Musée',
  'Monument',
  'Parc',
  'Plage',
  'Montagne',
  'Shopping',
  'Divertissement',
  'Sport',
  'Culture',
  'Nature'
];

const priceRanges = [
  { value: '€', label: '€ - Budget' },
  { value: '€€', label: '€€ - Modéré' },
  { value: '€€€', label: '€€€ - Élevé' },
  { value: '€€€€', label: '€€€€ - Luxe' }
];

const Profile = () => {
  const { user, profile } = useAuth();
  const { savedItineraries, loading: itinerariesLoading, deleteItinerary, toggleFavorite, updateItinerary } = useSavedItineraries();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touristPoints, setTouristPoints] = useState<TouristPoint[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPoint, setEditingPoint] = useState<string | null>(null);
  const [expandedPoints, setExpandedPoints] = useState<Set<string>>(new Set());
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [selectedItinerary, setSelectedItinerary] = useState<any>(null);
  const [editingItinerary, setEditingItinerary] = useState<any>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [sharingItinerary, setSharingItinerary] = useState<any>(null);
  const [userStats, setUserStats] = useState({
    stories: 0,
    favorites: 0,
    bookmarks: 0,
    bookings: 0
  });

  // Profile form data
  const [profileForm, setProfileForm] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    email: profile?.email || '',
    phone_number: profile?.phone_number || '',
    bio: profile?.bio || '',
    preferred_language: user?.preferred_language || 'fr'
  });

  // Tourist point form data
  const [pointForm, setPointForm] = useState<TouristPointForm>({
    name: '',
    description: '',
    address: '',
    latitude: '',
    longitude: '',
    tags: '',
    contact_phone: '',
    contact_email: '',
    website_url: '',
    opening_hours: '',
    price_range: '',
    amenities: ''
  });

  useEffect(() => {
    if (profile || user) {
      setProfileForm({
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        email: profile?.email || '',
        phone_number: profile?.phone_number || '',
        bio: profile?.bio || '',
        preferred_language: user?.preferred_language || 'fr'
      });
    }
  }, [profile, user]);

  useEffect(() => {
    if (user) {
      fetchTouristPoints();
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      const stats = await apiClient.get<any>('accounts/stats/');
      setUserStats(stats || { stories: 0, favorites: 0, bookmarks: 0, bookings: 0 });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const fetchTouristPoints = async () => {
    if (!user) return;

    try {
      const data = await apiClient.get<any[]>('poi/tourist-points/', { owner: 'me' });
      setTouristPoints(data || []);
    } catch (error) {
      console.error('Error fetching tourist points:', error);
      toast.error('Erreur lors du chargement des points d\'intérêt');
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Update profile fields
      await apiClient.patch('accounts/profiles/me/', {
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        phone_number: profileForm.phone_number,
        bio: profileForm.bio,
      });

      // Update user preferred language if changed
      if (profileForm.preferred_language !== user.preferred_language) {
        await apiClient.patch('users/me/', {
          preferred_language: profileForm.preferred_language,
        });
      }

      toast.success('Profil mis à jour avec succès');
      setIsEditing(false);

      // Refresh to see updated data
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  const handlePointSubmit = async (e: React.FormEvent, mediaImages: string[] = [], mediaVideos: string[] = []) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Parse opening hours if provided
      let openingHours = null;
      if (pointForm.opening_hours) {
        try {
          openingHours = JSON.parse(pointForm.opening_hours);
        } catch {
          // If not valid JSON, store as simple text
          openingHours = { note: pointForm.opening_hours };
        }
      }

      // Vérifier si l'utilisateur est un partenaire approuvé via Django API
      let isApprovedPartner = false;
      let partnerCompanyName = '';
      try {
        const partnerData = await apiClient.get<any>('partners/profiles/my-profile/');
        isApprovedPartner = partnerData?.status === 'approved';
        partnerCompanyName = partnerData?.company_name || '';
      } catch (error) {
        // Utilisateur n'est pas partenaire, c'est OK
        isApprovedPartner = false;
      }

      const pointData = {
        owner_id: user.id,
        name: pointForm.name,
        description: pointForm.description || null,
        address: selectedLocation?.address || pointForm.address || null,
        latitude: selectedLocation?.lat || (pointForm.latitude ? parseFloat(pointForm.latitude) : null),
        longitude: selectedLocation?.lng || (pointForm.longitude ? parseFloat(pointForm.longitude) : null),
        tags: pointForm.tags ? pointForm.tags.split(',').map(t => t.trim()) : null,
        contact_phone: pointForm.contact_phone || null,
        contact_email: pointForm.contact_email || null,
        website_url: pointForm.website_url || null,
        opening_hours: openingHours,
        price_range: pointForm.price_range || null,
        amenities: pointForm.amenities ? pointForm.amenities.split(',').map(a => a.trim()) : null,
        media_images: mediaImages.length > 0 ? mediaImages : null,
        media_videos: mediaVideos.length > 0 ? mediaVideos : null,
        // Champs partenaire
        is_partner_point: isApprovedPartner,
        partner_featured: false, // Peut être activé manuellement par l'admin
        partner_badge_text: isApprovedPartner ? `Partenaire - ${partnerCompanyName}` : null
      };

      if (editingPoint) {
        await apiClient.patch(`poi/tourist-points/${editingPoint}/`, pointData);
        toast.success('Point d\'intérêt mis à jour avec succès');
      } else {
        await apiClient.post('poi/tourist-points/', pointData);
        toast.success(`Point d'intérêt créé avec succès${isApprovedPartner ? ' - Marqué comme point partenaire' : ''}`);
      }

      // Reset form and refresh data
      setPointForm({
        name: '',
        description: '',
        address: '',
        latitude: '',
        longitude: '',
        tags: '',
        contact_phone: '',
        contact_email: '',
        website_url: '',
        opening_hours: '',
        price_range: '',
        amenities: ''
      });
      setSelectedLocation(null);
      setShowAddForm(false);
      setEditingPoint(null);
      fetchTouristPoints();
    } catch (error) {
      console.error('Error saving tourist point:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handlePointEdit = (point: TouristPoint) => {
    setPointForm({
      name: point.name,
      description: point.description || '',
      address: point.address || '',
      latitude: point.latitude?.toString() || '',
      longitude: point.longitude?.toString() || '',
      tags: point.tags?.join(', ') || '',
      contact_phone: point.contact_phone || '',
      contact_email: point.contact_email || '',
      website_url: point.website_url || '',
      opening_hours: point.opening_hours ? JSON.stringify(point.opening_hours, null, 2) : '',
      price_range: point.price_range || '',
      amenities: point.amenities?.join(', ') || '',
      media_images: point.media_images || null,
      media_videos: point.media_videos || null
    });
    
    if (point.latitude && point.longitude) {
      setSelectedLocation({
        lat: point.latitude,
        lng: point.longitude,
        address: point.address || ''
      });
    }
    
    setEditingPoint(point.id);
    setShowAddForm(true);
  };

  const handlePointDelete = async (pointId: string) => {
    if (!user || !confirm('Êtes-vous sûr de vouloir supprimer ce point d\'intérêt ?')) return;

    try {
      await apiClient.delete(`poi/tourist-points/${pointId}/`);
      toast.success('Point d\'intérêt supprimé avec succès');
      fetchTouristPoints();
    } catch (error) {
      console.error('Error deleting tourist point:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const togglePointExpansion = (pointId: string) => {
    const newExpanded = new Set(expandedPoints);
    if (newExpanded.has(pointId)) {
      newExpanded.delete(pointId);
    } else {
      newExpanded.add(pointId);
    }
    setExpandedPoints(newExpanded);
  };

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setSelectedLocation({ lat, lng, address });
    setPointForm(prev => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString(),
      address: address
    }));
  };

  const formatOpeningHours = (hours: any) => {
    if (!hours) return null;
    if (typeof hours === 'string') return hours;
    if (hours.note) return hours.note;
    
    // Format structured opening hours
    const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    return days.map(day => {
      if (hours[day]) {
        return `${day}: ${hours[day]}`;
      }
      return null;
    }).filter(Boolean).join(', ');
  };

  const togglePointVisibility = async (pointId: string, isActive: boolean) => {
    if (!user) return;

    try {
      await apiClient.patch(`poi/tourist-points/${pointId}/`, {
        is_active: !isActive
      });

      toast.success(`Point d'intérêt ${!isActive ? 'activé' : 'désactivé'} avec succès`);
      fetchTouristPoints();
    } catch (error) {
      console.error('Error toggling point visibility:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const handleItineraryExport = async (itinerary: any) => {
    setExportingId(itinerary.id);
    try {
      await exportItineraryToPDF(itinerary.itinerary_data);
      toast.success('PDF exporté avec succès');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erreur lors de l\'export du PDF');
    } finally {
      setExportingId(null);
    }
  };

  const handleItineraryShare = async (itinerary: any, platform: 'whatsapp' | 'facebook' | 'twitter' | 'copy') => {
    try {
      if (platform === 'copy') {
        await copyItineraryLink();
        toast.success('Lien copié dans le presse-papiers');
      } else {
        await shareItinerary(itinerary.itinerary_data, platform);
      }
    } catch (error) {
      console.error('Error sharing itinerary:', error);
      toast.error('Erreur lors du partage');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Accès requis</h2>
              <p className="text-muted-foreground mb-4">
                Vous devez être connecté pour accéder à votre profil.
              </p>
              <Button asChild>
                <Link to="/auth">Se connecter</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Mon Profil - Voyage AI</title>
        <meta name="description" content="Gérez votre profil utilisateur et vos points d'intérêt touristiques sur Voyage AI" />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <main className="container mx-auto py-8 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Profile Header with Avatar and Stats */}
            <ProfileHeader
              user={{
                display_name: user.display_name,
                email: user.email,
                role: user.role
              }}
              profile={{
                avatar_url: profile?.avatar_url,
                bio: profile?.bio,
                created_at: profile?.created_at,
                phone_number: profile?.phone_number
              }}
              stats={userStats}
            />

            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-10">
                <TabsTrigger value="profile">Informations</TabsTrigger>
                <TabsTrigger value="content">Mon Contenu</TabsTrigger>
                <TabsTrigger value="statistics">Statistiques</TabsTrigger>
                <TabsTrigger value="social">Réseau</TabsTrigger>
                <TabsTrigger value="privacy">Confidentialité</TabsTrigger>
                <TabsTrigger value="security">Sécurité</TabsTrigger>
                <TabsTrigger value="tourist-points">POI</TabsTrigger>
                <TabsTrigger value="saved-itineraries">Itinéraires</TabsTrigger>
                <TabsTrigger value="notifications">Notifs</TabsTrigger>
                <TabsTrigger value="rgpd">RGPD</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Informations Personnelles</CardTitle>
                    <CardDescription>
                      Modifiez vos informations de profil ci-dessous
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Photo de profil */}
                    <div className="flex justify-center mb-8">
                      <AvatarUpload
                        currentAvatar={profile?.avatar_url}
                        userName={user?.display_name || 'Utilisateur'}
                        onAvatarChange={() => {
                          // Rafraîchir la page pour voir le nouvel avatar
                          window.location.reload();
                        }}
                      />
                    </div>

                    <Separator className="my-6" />

                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="first_name">Prénom</Label>
                          <Input
                            id="first_name"
                            value={profileForm.first_name}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, first_name: e.target.value }))}
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="last_name">Nom</Label>
                          <Input
                            id="last_name"
                            value={profileForm.last_name}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, last_name: e.target.value }))}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileForm.email}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-sm text-muted-foreground">
                          L'email ne peut pas être modifié depuis cette page
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone_number">Numéro de téléphone</Label>
                        <Input
                          id="phone_number"
                          type="tel"
                          value={profileForm.phone_number}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, phone_number: e.target.value }))}
                          disabled={!isEditing}
                          placeholder="+33 6 12 34 56 78"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio">Biographie</Label>
                        <Textarea
                          id="bio"
                          value={profileForm.bio}
                          onChange={(e: any) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                          disabled={!isEditing}
                          placeholder="Parlez-nous de vous..."
                          rows={4}
                          className="resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="preferred_language">Langue préférée</Label>
                        <Select
                          value={profileForm.preferred_language}
                          onValueChange={(value) => setProfileForm(prev => ({ ...prev, preferred_language: value }))}
                          disabled={!isEditing}
                        >
                          <SelectTrigger id="preferred_language">
                            <SelectValue placeholder="Sélectionnez une langue" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fr">Français</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="de">Deutsch</SelectItem>
                            <SelectItem value="it">Italiano</SelectItem>
                            <SelectItem value="pt">Português</SelectItem>
                            <SelectItem value="ar">العربية</SelectItem>
                            <SelectItem value="zh">中文</SelectItem>
                            <SelectItem value="ja">日本語</SelectItem>
                            <SelectItem value="ru">Русский</SelectItem>
                            <SelectItem value="tr">Türkçe</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator />
                      
                      <div className="flex justify-between">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <Button type="submit" disabled={loading}>
                              {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setIsEditing(false)}
                            >
                              Annuler
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsEditing(true)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                          </Button>
                        )}
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Extended Profile Information */}
                <ExtendedInfoForm
                  profile={profile}
                  onUpdate={() => {
                    // Rafraîchir la page pour voir les nouvelles informations
                    window.location.reload();
                  }}
                />

                {/* Appearance Settings */}
                <AppearanceSettings />
              </TabsContent>

              <TabsContent value="content" className="space-y-6">
                <UserContent />
              </TabsContent>

              <TabsContent value="statistics" className="space-y-6">
                <AdvancedStatistics />
              </TabsContent>

              <TabsContent value="social" className="space-y-6">
                <FollowersFollowing />
              </TabsContent>

              <TabsContent value="privacy" className="space-y-6">
                <PrivacySettings
                  profile={profile}
                  onUpdate={() => {
                    window.location.reload();
                  }}
                />
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <PasswordChangeForm />
                <ActiveSessions />
              </TabsContent>

              <TabsContent value="tourist-points" className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">Mes Points d'Intérêt</h2>
                    <p className="text-muted-foreground">
                      Gérez vos points d'intérêt touristiques
                    </p>
                  </div>
                  <Button onClick={() => setShowAddForm(true)} disabled={showAddForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un point
                  </Button>
                </div>

                {showAddForm && (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {editingPoint ? 'Modifier le point d\'intérêt' : 'Ajouter un point d\'intérêt'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TouristPointForm
                        formData={pointForm}
                        onFormDataChange={setPointForm}
                        selectedLocation={selectedLocation}
                        onLocationSelect={handleLocationSelect}
                        onSubmit={handlePointSubmit}
                        onCancel={() => {
                          setShowAddForm(false);
                          setEditingPoint(null);
                          setSelectedLocation(null);
                          setPointForm({
                            name: '',
                            description: '',
                            address: '',
                            latitude: '',
                            longitude: '',
                            tags: '',
                            contact_phone: '',
                            contact_email: '',
                            website_url: '',
                            opening_hours: '',
                            price_range: '',
                             amenities: ''
                          });
                        }}
                        loading={loading}
                        isEditing={!!editingPoint}
                      />
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-4">
                  {touristPoints.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Aucun point d'intérêt</h3>
                          <p className="text-muted-foreground">
                            Vous n'avez pas encore créé de points d'intérêt. Commencez par en ajouter un !
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    touristPoints.map((point) => (
                      <Card key={point.id} className="overflow-hidden">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            {/* Header with title and actions */}
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="text-lg font-semibold">{point.name}</h3>
                                  {point.tags && point.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {point.tags.map((tag, index) => (
                                        <Badge key={index} variant="secondary">{tag}</Badge>
                                      ))}
                                    </div>
                                  )}
                                  {point.price_range && (
                                    <Badge variant="outline" className="gap-1">
                                      <Euro className="w-3 h-3" />
                                      {point.price_range}
                                    </Badge>
                                  )}
                                  {point.is_verified && (
                                    <Badge variant="default">Vérifié</Badge>
                                  )}
                                  {!point.is_active && (
                                    <Badge variant="destructive">Masqué</Badge>
                                  )}
                                </div>
                                
                                {point.description && (
                                  <p className="text-muted-foreground mb-3 line-clamp-2">{point.description}</p>
                                )}

                                {/* Quick info */}
                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                                  {point.address && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-4 h-4" />
                                      <span>{point.address}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 fill-current text-yellow-400" />
                                    <span>{point.rating.toFixed(1)}</span>
                                    <span>({point.review_count} avis)</span>
                                  </div>
                                  <span>Créé le {new Date(point.created_at).toLocaleDateString()}</span>
                                </div>

                                {/* Contact info quick view */}
                                <div className="flex flex-wrap gap-3 text-sm">
                                  {point.contact_phone && (
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <Phone className="w-3 h-3" />
                                      <span>{point.contact_phone}</span>
                                    </div>
                                  )}
                                  {point.contact_email && (
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <Mail className="w-3 h-3" />
                                      <span>{point.contact_email}</span>
                                    </div>
                                  )}
                                  {point.website_url && (
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <Globe className="w-3 h-3" />
                                      <a href={point.website_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                                        Site web
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => togglePointExpansion(point.id)}
                                  title="Voir les détails"
                                >
                                  {expandedPoints.has(point.id) ? 
                                    <ChevronUp className="w-4 h-4" /> : 
                                    <ChevronDown className="w-4 h-4" />
                                  }
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => togglePointVisibility(point.id, point.is_active)}
                                  title={point.is_active ? 'Masquer' : 'Afficher'}
                                >
                                  {point.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePointEdit(point)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePointDelete(point.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Expanded content */}
                            <Collapsible open={expandedPoints.has(point.id)}>
                              <CollapsibleContent className="space-y-4">
                                <Separator />
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {/* Map */}
                                  {point.latitude && point.longitude && (
                                    <div className="space-y-2">
                                      <h4 className="font-medium flex items-center gap-2">
                                        <MapPin className="w-4 h-4" />
                                        Localisation
                                      </h4>
                                      <MapViewer
                                        latitude={point.latitude}
                                        longitude={point.longitude}
                                        title={point.name}
                                        description={point.description || undefined}
                                      />
                                    </div>
                                  )}

                                  {/* Details */}
                                  <div className="space-y-4">
                                    {/* Opening hours */}
                                    {point.opening_hours && (
                                      <div className="space-y-2">
                                        <h4 className="font-medium flex items-center gap-2">
                                          <Clock className="w-4 h-4" />
                                          Horaires d'ouverture
                                        </h4>
                                        <p className="text-sm text-muted-foreground">
                                          {formatOpeningHours(point.opening_hours)}
                                        </p>
                                      </div>
                                    )}

                                    {/* Amenities */}
                                    {point.amenities && point.amenities.length > 0 && (
                                      <div className="space-y-2">
                                        <h4 className="font-medium">Équipements</h4>
                                        <div className="flex flex-wrap gap-1">
                                          {point.amenities.map((amenity, index) => (
                                            <Badge key={index} variant="outline" className="text-xs">
                                              {amenity}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}


                                     {/* Médias uploadés - Images */}
                                     {point.media_images && point.media_images.length > 0 && (
                                       <div className="space-y-2">
                                         <h4 className="font-medium">Photos uploadées</h4>
                                         <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                           {point.media_images.map((image, index) => (
                                             <img
                                               key={index}
                                               src={image}
                                               alt={`${point.name} - Photo ${index + 1}`}
                                               className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                               onClick={() => window.open(image, '_blank')}
                                             />
                                           ))}
                                         </div>
                                       </div>
                                     )}

                                     {/* Médias uploadés - Vidéos */}
                                     {point.media_videos && point.media_videos.length > 0 && (
                                       <div className="space-y-2">
                                         <h4 className="font-medium">Vidéos uploadées</h4>
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                           {point.media_videos.map((video, index) => (
                                             <video
                                               key={index}
                                               src={video}
                                               controls
                                               className="w-full h-32 object-cover rounded border"
                                               preload="metadata"
                                             />
                                           ))}
                                         </div>
                                       </div>
                                     )}
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="saved-itineraries" className="space-y-6">
                {selectedItinerary ? (
                  <div>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedItinerary(null)}
                      className="mb-4"
                    >
                      ← Retour à la liste
                    </Button>
                    <DetailedItineraryView 
                      itinerary={selectedItinerary.itinerary_data} 
                      onStartOver={() => setSelectedItinerary(null)}
                    />
                  </div>
                 ) : editingItinerary ? (
                   <EditableItineraryView
                     itinerary={editingItinerary}
                      onSave={async (updatedItinerary) => {
                        await updateItinerary(updatedItinerary);
                        setEditingItinerary(null);
                      }}
                     onClose={() => setEditingItinerary(null)}
                   />
                 ) : (
                   <div>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Calendar className="w-6 h-6" />
                        Mes Itinéraires Sauvegardés
                      </h2>
                      <p className="text-muted-foreground">
                        Retrouvez tous vos programmes de voyage sauvegardés
                      </p>
                    </div>

                    {itinerariesLoading ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">Chargement de vos itinéraires...</p>
                      </div>
                    ) : savedItineraries.length === 0 ? (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Aucun itinéraire sauvegardé</h3>
                            <p className="text-muted-foreground mb-4">
                              Vous n'avez pas encore sauvegardé d'itinéraires de voyage.
                            </p>
                            <Button asChild>
                              <Link to="/plan">Planifier un voyage</Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4">
                        {savedItineraries.map((itinerary) => (
                          <Card key={itinerary.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <CardContent className="pt-6">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-lg font-semibold">{itinerary.title}</h3>
                                    {itinerary.is_favorite && (
                                      <Heart className="w-4 h-4 text-red-500 fill-current" />
                                    )}
                                  </div>
                                  
                                  {itinerary.description && (
                                    <p className="text-muted-foreground mb-3">{itinerary.description}</p>
                                  )}

                                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                                    {itinerary.destination_summary && (
                                      <div className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        <span>{itinerary.destination_summary}</span>
                                      </div>
                                    )}
                                    {itinerary.trip_duration && (
                                      <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>{itinerary.trip_duration} jour{itinerary.trip_duration > 1 ? 's' : ''}</span>
                                      </div>
                                    )}
                                    <span>Créé le {new Date(itinerary.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleFavorite(itinerary.id, !itinerary.is_favorite)}
                                    title={itinerary.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                                  >
                                    <Heart className={`w-4 h-4 ${itinerary.is_favorite ? 'text-red-500 fill-current' : ''}`} />
                                  </Button>
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => setEditingItinerary(itinerary)}
                                     title="Modifier l'itinéraire"
                                   >
                                     <Edit className="w-4 h-4" />
                                   </Button>
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => setSelectedItinerary(itinerary)}
                                     title="Voir les détails"
                                   >
                                     <Eye className="w-4 h-4" />
                                   </Button>
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => handleItineraryExport(itinerary)}
                                     disabled={exportingId === itinerary.id}
                                     title="Exporter en PDF"
                                   >
                                     <Download className="w-4 h-4" />
                                   </Button>
                                   <DropdownMenu>
                                     <DropdownMenuTrigger asChild>
                                       <Button
                                         variant="ghost"
                                         size="sm"
                                         title="Partager"
                                       >
                                         <Share2 className="w-4 h-4" />
                                       </Button>
                                     </DropdownMenuTrigger>
                                     <DropdownMenuContent align="end">
                                       <DropdownMenuItem onClick={() => handleItineraryShare(itinerary, 'whatsapp')}>
                                         <MessageCircle className="w-4 h-4 mr-2" />
                                         WhatsApp
                                       </DropdownMenuItem>
                                       <DropdownMenuItem onClick={() => handleItineraryShare(itinerary, 'facebook')}>
                                         <Facebook className="w-4 h-4 mr-2" />
                                         Facebook
                                       </DropdownMenuItem>
                                       <DropdownMenuItem onClick={() => handleItineraryShare(itinerary, 'twitter')}>
                                         <Twitter className="w-4 h-4 mr-2" />
                                         Twitter
                                       </DropdownMenuItem>
                                       <DropdownMenuItem onClick={() => handleItineraryShare(itinerary, 'copy')}>
                                         <ExternalLink className="w-4 h-4 mr-2" />
                                         Copier le lien
                                       </DropdownMenuItem>
                                       </DropdownMenuContent>
                                   </DropdownMenu>
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => setSharingItinerary(itinerary)}
                                     title="Partager avec d'autres utilisateurs"
                                   >
                                     <UserPlus className="w-4 h-4" />
                                   </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteItinerary(itinerary.id)}
                                    className="text-destructive hover:text-destructive"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                 )}
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6">
                <NotificationSettings />
              </TabsContent>

              <TabsContent value="rgpd" className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">RGPD & Gestion des données</h2>
                  <p className="text-muted-foreground">
                    Gérez vos données personnelles conformément au Règlement Général sur la Protection des Données
                  </p>
                </div>

                <DownloadUserData />
                <DeleteAccount />
              </TabsContent>
            </Tabs>
          </div>
        </main>

        {/* Dialog de partage d'itinéraire */}
        <ItineraryShareDialog
          open={!!sharingItinerary}
          onOpenChange={(open) => !open && setSharingItinerary(null)}
          itinerary={sharingItinerary}
        />
      </div>
    </>
  );
};

export default Profile;