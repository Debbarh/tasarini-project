import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  MapPin, 
  Calendar, 
  Users, 
  Search, 
  Heart, 
  Trash2, 
  Eye,
  Download,
  Share2 
} from "lucide-react";
import { useSavedItineraries } from "@/hooks/useSavedItineraries";
import { useAuth } from "@/contexts/AuthContext";
import { DetailedItineraryView } from "@/components/trip/DetailedItineraryView";
import { exportItineraryToPDF, shareItinerary } from "@/utils/itineraryExport";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SavedItineraries = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { savedItineraries, loading, deleteItinerary, toggleFavorite } = useSavedItineraries();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItinerary, setSelectedItinerary] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Redirection si non connecté
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('savedItineraries.unauthorized')}</h1>
          <p className="text-muted-foreground">
            {t('savedItineraries.unauthorizedMessage')}
          </p>
        </div>
      </div>
    );
  }

  // Filtrage des itinéraires
  const filteredItineraries = savedItineraries.filter(itinerary =>
    itinerary.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    itinerary.destination_summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    itinerary.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportPDF = async (itinerary: any) => {
    setIsExporting(true);
    try {
      await exportItineraryToPDF(itinerary.itinerary_data);
      toast({
        title: t('savedItineraries.toast.pdfExported'),
        description: t('savedItineraries.toast.pdfExportedDesc'),
      });
    } catch (error) {
      console.error('Erreur export PDF:', error);
      toast({
        title: t('savedItineraries.toast.pdfError'),
        description: t('savedItineraries.toast.pdfErrorDesc'),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async (itinerary: any) => {
    try {
      await shareItinerary(itinerary.itinerary_data, 'whatsapp');
    } catch (error) {
      console.error('Erreur partage:', error);
      toast({
        title: t('savedItineraries.toast.shareError'),
        description: t('savedItineraries.toast.shareErrorDesc'),
        variant: "destructive",
      });
    }
  };

  if (selectedItinerary) {
    return (
      <DetailedItineraryView
        itinerary={selectedItinerary.itinerary_data}
        onStartOver={() => setSelectedItinerary(null)}
        savedItineraryId={selectedItinerary.id}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Helmet>
        <title>{t('savedItineraries.pageTitle')} | Voyage AI</title>
        <meta name="description" content={t('savedItineraries.pageDescription')} />
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('savedItineraries.pageTitle')}</h1>
        <p className="text-muted-foreground">
          {t('savedItineraries.subtitle')}
        </p>
      </div>

      {/* Barre de recherche */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder={t('savedItineraries.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="flex items-center p-6">
            <MapPin className="w-8 h-8 text-primary mr-4" />
            <div>
              <p className="text-2xl font-bold">{savedItineraries.length}</p>
              <p className="text-muted-foreground">{t('savedItineraries.stats.saved')}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Heart className="w-8 h-8 text-red-500 mr-4" />
            <div>
              <p className="text-2xl font-bold">
                {savedItineraries.filter(i => i.is_favorite).length}
              </p>
              <p className="text-muted-foreground">{t('savedItineraries.stats.favorites')}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Calendar className="w-8 h-8 text-blue-500 mr-4" />
            <div>
              <p className="text-2xl font-bold">
                {savedItineraries.reduce((acc, i) => acc + (i.trip_duration || 0), 0)}
              </p>
              <p className="text-muted-foreground">{t('savedItineraries.stats.travelDays')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des itinéraires */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredItineraries.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm ? t('savedItineraries.empty.noResults') : t('savedItineraries.empty.title')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? t('savedItineraries.empty.searchMessage')
                : t('savedItineraries.empty.createMessage')
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => window.location.href = "/plan"}>
                {t('savedItineraries.actions.create')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItineraries.map((itinerary) => (
            <Card key={itinerary.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">
                      {itinerary.title}
                    </CardTitle>
                    {itinerary.destination_summary && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {itinerary.destination_summary}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFavorite(itinerary.id, !itinerary.is_favorite)}
                    className="ml-2"
                  >
                    <Heart 
                      className={`w-4 h-4 ${
                        itinerary.is_favorite 
                          ? "fill-red-500 text-red-500" 
                          : "text-muted-foreground"
                      }`} 
                    />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                {itinerary.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {itinerary.description}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {itinerary.trip_duration && (
                    <Badge variant="secondary" className="text-xs">
                      <Calendar className="w-3 h-3 mr-1" />
                      {itinerary.trip_duration} {t('savedItineraries.badges.days')}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {new Date(itinerary.created_at).toLocaleDateString('fr-FR')}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => setSelectedItinerary(itinerary)}
                    className="flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    {t('savedItineraries.actions.view')}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportPDF(itinerary)}
                    disabled={isExporting}
                    className="flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    {t('savedItineraries.actions.export')}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare(itinerary)}
                    className="flex items-center gap-1"
                  >
                    <Share2 className="w-3 h-3" />
                    {t('savedItineraries.actions.share')}
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('savedItineraries.dialog.deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('savedItineraries.dialog.deleteDescription')} "{itinerary.title}" ? 
                          {t('savedItineraries.dialog.deleteWarning')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('savedItineraries.dialog.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteItinerary(itinerary.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('savedItineraries.dialog.confirm')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedItineraries;