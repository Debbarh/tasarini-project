import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MapPin, Calendar, Users, Wallet, ArrowLeft, Download, Share2, Clock, Star, MessageCircle, Facebook, Twitter, Copy, Gift, Utensils, Backpack, Info, Sun, Shield, Save } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DetailedItinerary } from "@/types/trip";
import { exportItineraryToPDF, shareItinerary, copyItineraryLink } from "@/utils/itineraryExport";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedItineraries } from "@/hooks/useSavedItineraries";
import SaveItineraryDialog from "@/components/itinerary/SaveItineraryDialog";

interface DetailedItineraryViewProps {
  itinerary: DetailedItinerary;
  onStartOver: () => void;
}

export const DetailedItineraryView = ({ itinerary, onStartOver }: DetailedItineraryViewProps) => {
  const { trip, totalCost, practicalInfo, recommendations } = itinerary;
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { saveItinerary } = useSavedItineraries();

  const handleExportPDF = async () => {
    try {
      await exportItineraryToPDF(itinerary);
      toast({
        title: "PDF exporté avec succès",
        description: "Votre itinéraire a été téléchargé en PDF.",
      });
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter le PDF. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async (platform: 'whatsapp' | 'facebook' | 'twitter') => {
    try {
      await shareItinerary(itinerary, platform);
    } catch (error) {
      toast({
        title: "Erreur de partage",
        description: "Impossible de partager. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = async () => {
    try {
      await copyItineraryLink();
      toast({
        title: "Lien copié",
        description: "Le lien de votre itinéraire a été copié dans le presse-papiers.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien.",
        variant: "destructive",
      });
    }
  };

  const handleSaveItinerary = async (title: string, description?: string) => {
    return await saveItinerary(title, itinerary, description);
  };

  const calculateTotalDuration = () => {
    if (trip.startDate && trip.endDate) {
      try {
        const startDate = new Date(trip.startDate);
        const endDate = new Date(trip.endDate);
        
        // Vérifier que les dates sont valides
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return 0;
        }
        
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } catch (error) {
        return 0;
      }
    }
    return 0;
  };

  const getTravelGroupDescription = () => {
    switch (trip.travelGroup.type) {
      case 'solo':
        return 'Voyage solo';
      case 'couple':
        return 'Voyage en couple';
      case 'family':
        return `Famille${trip.travelGroup.children?.count ? ` avec ${trip.travelGroup.children.count} enfant${trip.travelGroup.children.count > 1 ? 's' : ''}` : ''}`;
      case 'group':
        return `Groupe de ${trip.travelGroup.size} personnes`;
      default:
        return '';
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Votre itinéraire personnalisé</h1>
          <p className="text-muted-foreground">
            Voyage généré avec vos préférences personnelles
          </p>
        </div>
        <div className="flex gap-2">
          {user && (
            <Button onClick={() => setShowSaveDialog(true)}>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          )}
          <Button variant="outline" onClick={onStartOver}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Nouveau voyage
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Exporter PDF
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Partager
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('facebook')}>
                <Facebook className="h-4 w-4 mr-2" />
                Facebook
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('twitter')}>
                <Twitter className="h-4 w-4 mr-2" />
                Twitter
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copier le lien
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Destination Images Gallery */}
      {itinerary.destinationImages && Object.keys(itinerary.destinationImages).length > 0 ? (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📸 Vos destinations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {Object.entries(itinerary.destinationImages).map(([city, images]) => (
                <div key={city} className="space-y-3">
                  <h4 className="font-semibold text-center">{city}</h4>
                  <div className="grid gap-2">
                    {images.slice(0, 3).map((image) => (
                      <div key={image.id} className="relative group overflow-hidden rounded-lg">
                        <img 
                          src={image.thumbnailUrl} 
                          alt={image.description}
                          className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                          <div className="text-white text-xs">
                            <p className="font-medium">{image.description}</p>
                            <p className="text-white/80">📷 {image.photographer}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center text-muted-foreground p-4">
          <p>Aucune image disponible pour les destinations</p>
        </div>
      )}

      {/* Trip Overview */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Aperçu du voyage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Dates
              </div>
              <p className="font-medium">
                {trip.startDate && trip.endDate ? (
                  <>
                    {format(new Date(trip.startDate), "dd MMM", { locale: fr })} - {format(new Date(trip.endDate), "dd MMM yyyy", { locale: fr })}
                  </>
                ) : (
                  'Dates à définir'
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {calculateTotalDuration()} jour{calculateTotalDuration() > 1 ? 's' : ''}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Groupe
              </div>
              <p className="font-medium">{getTravelGroupDescription()}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4" />
                Budget
              </div>
              <p className="font-medium">{trip.budget.level} - {trip.budget.dailyBudget}€/jour</p>
              <p className="text-sm text-muted-foreground">
                Total estimé: {totalCost}€
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Destinations
              </div>
              <div className="space-y-1">
                {trip.destinations.map((dest, index) => (
                  <p key={index} className="text-sm font-medium">
                    {dest.city}, {dest.country} ({dest.duration}j)
                  </p>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Itinerary */}
      {itinerary.days && itinerary.days.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Itinéraire détaillé</h2>
            <Badge variant="secondary">{itinerary.days.length} jour{itinerary.days.length > 1 ? 's' : ''}</Badge>
          </div>
          
          <div className="space-y-4">
            {itinerary.days.map((day, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Jour {index + 1} - {format(new Date(day.date), "EEEE dd MMMM", { locale: fr })}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="outline">{day.destination}</Badge>
                        <Badge variant="secondary">{day.theme}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Budget journalier</p>
                      <p className="font-bold text-lg">{day.totalCost}€</p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  {/* Activities */}
                  {day.activities && day.activities.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Activités programmées
                      </h4>
                      <div className="space-y-3">
                        {day.activities.map((activity, actIndex) => (
                          <div key={actIndex} className="flex gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                            <div className="flex-shrink-0">
                              <Badge variant="outline" className="font-mono">
                                {activity.time}
                              </Badge>
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start justify-between">
                                <h5 className="font-medium">{activity.title}</h5>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {activity.type}
                                  </Badge>
                                  <span className="text-sm font-medium">{activity.cost}€</span>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">{activity.description}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {typeof activity.location === 'string' ? activity.location : activity.location?.name || 'Lieu non spécifié'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {typeof activity.duration === 'string' ? activity.duration : `${Math.floor(Number(activity.duration) / 60)}h${Number(activity.duration) % 60 > 0 ? ` ${Number(activity.duration) % 60}min` : ''}`}
                                </span>
                                <Badge 
                                  variant={activity.difficulty === 'easy' ? 'secondary' : activity.difficulty === 'moderate' ? 'default' : 'destructive'}
                                  className="text-xs"
                                >
                                  {activity.difficulty === 'easy' ? 'Facile' : activity.difficulty === 'moderate' ? 'Modéré' : 'Difficile'}
                                </Badge>
                              </div>
                              {activity.tips && activity.tips.length > 0 && (
                                <div className="mt-2">
                                  <details className="group">
                                    <summary className="cursor-pointer text-xs text-primary hover:text-primary/80">
                                      💡 Conseils ({activity.tips.length})
                                    </summary>
                                    <ul className="mt-1 text-xs text-muted-foreground space-y-1 pl-4">
                                      {(typeof activity.tips === 'string' ? [activity.tips] : activity.tips || []).map((tip, tipIndex) => (
                                        <li key={tipIndex} className="list-disc">{tip}</li>
                                      ))}
                                    </ul>
                                  </details>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meals */}
                  {(day.meals?.breakfast || day.meals?.lunch || day.meals?.dinner) && (
                    <Separator className="my-6" />
                  )}
                  
                  {(day.meals?.breakfast || day.meals?.lunch || day.meals?.dinner) && (
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        🍽️ Repas recommandés
                      </h4>
                      <div className="grid gap-3 md:grid-cols-3">
                        {day.meals?.breakfast && (
                          <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                            <h5 className="font-medium text-sm mb-1">🌅 Petit-déjeuner</h5>
                            <p className="text-sm">{day.meals.breakfast.title}</p>
                            <p className="text-xs text-muted-foreground">{typeof day.meals.breakfast.location === 'string' ? day.meals.breakfast.location : day.meals.breakfast.location?.name || 'Lieu non spécifié'} • {day.meals.breakfast.cost}€</p>
                          </div>
                        )}
                        {day.meals?.lunch && (
                          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                            <h5 className="font-medium text-sm mb-1">☀️ Déjeuner</h5>
                            <p className="text-sm">{day.meals.lunch.title}</p>
                            <p className="text-xs text-muted-foreground">{typeof day.meals.lunch.location === 'string' ? day.meals.lunch.location : day.meals.lunch.location?.name || 'Lieu non spécifié'} • {day.meals.lunch.cost}€</p>
                          </div>
                        )}
                        {day.meals?.dinner && (
                          <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                            <h5 className="font-medium text-sm mb-1">🌙 Dîner</h5>
                            <p className="text-sm">{day.meals.dinner.title}</p>
                            <p className="text-xs text-muted-foreground">{typeof day.meals.dinner.location === 'string' ? day.meals.dinner.location : day.meals.dinner.location?.name || 'Lieu non spécifié'} • {day.meals.dinner.cost}€</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Transportation */}
                  {day.transportation && (
                    <>
                      <Separator className="my-6" />
                      <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          🚗 Transport
                        </h4>
                        <div className="space-y-2">
                          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                            <p className="text-sm">{day.transportation}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Day Summary */}
                  {day.walkingDistance && (
                    <>
                      <Separator className="my-6" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Distance de marche estimée</span>
                        <Badge variant="outline">{day.walkingDistance} km</Badge>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Itinéraire détaillé</CardTitle>
            <p className="text-sm text-muted-foreground">
              Programme jour par jour personnalisé selon vos préférences
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Génération en cours d'amélioration</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  L'itinéraire détaillé avec activités minute par minute sera bientôt disponible.
                  Pour l'instant, vous pouvez voir le résumé de votre voyage ci-dessus.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {(recommendations?.mustTryDishes || recommendations?.giftIdeas || recommendations?.packingList || recommendations?.culturalTips) && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Recommandations personnalisées</h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            {/* Culinary Recommendations */}
            {recommendations?.mustTryDishes && Object.keys(recommendations.mustTryDishes).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    🍽️ Spécialités à découvrir
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(recommendations.mustTryDishes).map(([destination, dishes]) => (
                      <div key={destination}>
                        <h4 className="font-medium mb-2">{destination}</h4>
                        <ul className="space-y-1">
                          {dishes.map((dish, index) => (
                            <li key={index} className="text-sm flex items-center gap-2">
                              <span className="w-1 h-1 bg-primary rounded-full flex-shrink-0"></span>
                              {dish}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gift Ideas */}
            {recommendations?.giftIdeas && Object.keys(recommendations.giftIdeas).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    🎁 Idées souvenirs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(recommendations.giftIdeas).map(([destination, gifts]) => (
                      <div key={destination}>
                        <h4 className="font-medium mb-2">{destination}</h4>
                        <ul className="space-y-1">
                          {gifts.map((gift, index) => (
                            <li key={index} className="text-sm flex items-center gap-2">
                              <span className="w-1 h-1 bg-primary rounded-full flex-shrink-0"></span>
                              {gift}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Packing List */}
            {recommendations?.packingList && recommendations.packingList.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    🎒 Liste de voyage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {recommendations.packingList.map((item, index) => (
                      <li key={index} className="text-sm flex items-center gap-2">
                        <span className="w-1 h-1 bg-primary rounded-full flex-shrink-0"></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Cultural Tips */}
            {recommendations?.culturalTips && Object.keys(recommendations.culturalTips).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    🏛️ Conseils culturels
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(recommendations.culturalTips).map(([destination, tips]) => (
                      <div key={destination}>
                        <h4 className="font-medium mb-2">{destination}</h4>
                        <ul className="space-y-1">
                          {tips.map((tip, index) => (
                            <li key={index} className="text-sm flex items-center gap-2">
                              <span className="w-1 h-1 bg-primary rounded-full flex-shrink-0"></span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Best Time to Visit */}
            {recommendations?.bestTimeToVisit && Object.keys(recommendations.bestTimeToVisit).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sun className="h-5 w-5" />
                    Meilleures périodes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(recommendations.bestTimeToVisit).map(([destination, period]) => (
                      <div key={destination}>
                        <h4 className="font-medium mb-2">{destination}</h4>
                        <p className="text-sm text-muted-foreground">{period}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Local Events */}
            {recommendations?.localEvents && Object.keys(recommendations.localEvents).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    🎪 Événements locaux
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(recommendations.localEvents).map(([destination, events]) => (
                      <div key={destination}>
                        <h4 className="font-medium mb-2">{destination}</h4>
                        <ul className="space-y-1">
                          {events.map((event, index) => (
                            <li key={index} className="text-sm flex items-center gap-2">
                              <span className="w-1 h-1 bg-primary rounded-full flex-shrink-0"></span>
                              {event}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transportation Tips */}
            {recommendations?.transportation && Object.keys(recommendations.transportation).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    🚗 Conseils transport
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(recommendations.transportation).map(([destination, tips]) => (
                      <div key={destination}>
                        <h4 className="font-medium mb-2">{destination}</h4>
                        <p className="text-sm text-muted-foreground">{tips}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Safety Tips */}
            {recommendations?.safety && Object.keys(recommendations.safety).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Conseils sécurité
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(recommendations.safety).map(([destination, safetyTips]) => (
                      <div key={destination}>
                        <h4 className="font-medium mb-2">{destination}</h4>
                        <ul className="space-y-1">
                          {safetyTips.map((tip, index) => (
                            <li key={index} className="text-sm flex items-center gap-2">
                              <span className="w-1 h-1 bg-primary rounded-full flex-shrink-0"></span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Budget Breakdown */}
            {recommendations?.budget && Object.keys(recommendations.budget).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Répartition budget
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(recommendations.budget).map(([destination, budgetInfo]) => (
                      <div key={destination}>
                        <h4 className="font-medium mb-2">{destination}</h4>
                        <p className="text-sm text-muted-foreground">{budgetInfo}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Similar Destinations */}
          {recommendations?.similarDestinations && recommendations.similarDestinations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  🌍 Destinations similaires
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {recommendations.similarDestinations.map((destination, index) => (
                    <Badge key={index} variant="secondary">
                      {destination}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Practical Info */}
      {practicalInfo?.destinations && Object.keys(practicalInfo.destinations).length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Informations pratiques</h2>
          
          <div className="grid gap-6">
            {Object.entries(practicalInfo.destinations).map(([destination, info]) => (
              <Card key={destination}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    ℹ️ {destination}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {info.visa && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          📄 Visa & Documents
                        </h4>
                        <p className="text-sm text-muted-foreground">{info.visa}</p>
                      </div>
                    )}

                    {info.currency && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          💰 Monnaie
                        </h4>
                        <p className="text-sm text-muted-foreground">{info.currency}</p>
                      </div>
                    )}

                    {info.language && info.language.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          🗣️ Langues
                        </h4>
                        <p className="text-sm text-muted-foreground">{info.language.join(', ')}</p>
                      </div>
                    )}

                    {info.climate && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          🌤️ Climat
                        </h4>
                        <p className="text-sm text-muted-foreground">{info.climate}</p>
                      </div>
                    )}

                    {info.emergency && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          🚨 Urgences
                        </h4>
                        <p className="text-sm text-muted-foreground">{info.emergency}</p>
                      </div>
                    )}

                    {info.health && info.health.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          🏥 Santé
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {info.health.map((healthItem, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <span className="w-1 h-1 bg-primary rounded-full flex-shrink-0"></span>
                              {healthItem}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {info.customs && info.customs.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          🎭 Coutumes locales
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {info.customs.map((custom, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <span className="w-1 h-1 bg-primary rounded-full flex-shrink-0"></span>
                              {custom}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Dialog de sauvegarde */}
      <SaveItineraryDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={handleSaveItinerary}
      />
    </div>
  );
};