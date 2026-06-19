import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Clock, DollarSign, Users, Calendar, Star, Navigation, Lightbulb } from "lucide-react";
import MapViewer from "@/components/MapViewer";

interface ItineraryDay {
  day: number;
  date: string;
  theme: string;
  activities: {
    time: string;
    title: string;
    description: string;
    location?: string;
    duration: string;
    cost?: string;
    rating?: number;
  }[];
}

interface ItineraryData {
  destination: string;
  duration: number;
  totalCost: string;
  travelers: number;
  theme: string;
  latitude?: number;
  longitude?: number;
  days: ItineraryDay[];
  highlights: string[];
  tips: string[];
}

interface ItineraryPreviewProps {
  data?: ItineraryData;
  isLoading?: boolean;
  destination?: string;
  startDate?: Date;
  endDate?: Date;
  theme?: string;
  travelers?: number;
  latitude?: number;
  longitude?: number;
}

export const ItineraryPreview = ({ 
  data, 
  isLoading, 
  destination,
  startDate,
  endDate,
  theme,
  travelers,
  latitude,
  longitude
}: ItineraryPreviewProps) => {
  
  // Mock data for demonstration when no real data is provided
  const mockItinerary: ItineraryData = {
    destination: destination || "Paris",
    duration: startDate && endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 3,
    totalCost: "300-500€",
    travelers: travelers || 2,
    theme: theme || "culture",
    latitude,
    longitude,
    days: [
      {
        day: 1,
        date: startDate ? startDate.toLocaleDateString('fr-FR') : "Jour 1",
        theme: "Découverte",
        activities: [
          {
            time: "09:00",
            title: "Arrivée et check-in",
            description: "Installation à l'hôtel et première découverte du quartier",
            duration: "2h",
            cost: "0€"
          },
          {
            time: "11:00",
            title: "Visite guidée du centre historique",
            description: "Découverte des principaux monuments et de l'histoire locale",
            location: "Centre-ville",
            duration: "3h",
            cost: "25€",
            rating: 4.5
          },
          {
            time: "15:00",
            title: "Déjeuner traditionnel",
            description: "Dégustation de spécialités locales dans un restaurant typique",
            duration: "1h30",
            cost: "35€",
            rating: 4.2
          }
        ]
      }
    ],
    highlights: [
      "Monuments historiques emblématiques",
      "Gastronomie locale authentique",
      "Points de vue panoramiques",
      "Art et culture régionale"
    ],
    tips: [
      "Réservez vos restaurants à l'avance",
      "Portez des chaussures confortables",
      "Vérifiez les horaires d'ouverture des sites"
    ]
  };

  const displayData = data || mockItinerary;

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            Génération de votre itinéraire...
          </CardTitle>
          <CardDescription>
            Création d'un programme personnalisé en cours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card className="shadow-[var(--shadow-elegant)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Aperçu de votre voyage
          </CardTitle>
          <CardDescription>
            Itinéraire personnalisé pour {displayData.destination}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{displayData.duration} jours</p>
                <p className="text-xs text-muted-foreground">Durée</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{displayData.travelers} voyageur{displayData.travelers > 1 ? 's' : ''}</p>
                <p className="text-xs text-muted-foreground">Groupe</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{displayData.totalCost}</p>
                <p className="text-xs text-muted-foreground">Budget estimé</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{displayData.theme}</p>
                <p className="text-xs text-muted-foreground">Thème</p>
              </div>
            </div>
          </div>

          {/* Map */}
          {displayData.latitude && displayData.longitude && (
            <div className="mt-4">
              <MapViewer
                latitude={displayData.latitude}
                longitude={displayData.longitude}
                title={displayData.destination}
                description="Votre destination de voyage"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Itinerary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            Programme détaillé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {displayData.days.map((day, index) => (
              <div key={index}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    {day.day}
                  </div>
                  <div>
                    <h3 className="font-semibold">Jour {day.day}</h3>
                    <p className="text-sm text-muted-foreground">{day.date} • {day.theme}</p>
                  </div>
                </div>

                <div className="ml-11 space-y-3">
                  {day.activities.map((activity, actIndex) => (
                    <div key={actIndex} className="border-l-2 border-muted pl-4 pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium text-primary">{activity.time}</span>
                            <Badge variant="outline" className="text-xs">{activity.duration}</Badge>
                          </div>
                          <h4 className="font-medium text-sm">{activity.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
                          {activity.location && (
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{activity.location}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          {activity.cost && (
                            <p className="text-xs font-medium">{activity.cost}</p>
                          )}
                          {activity.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs">{activity.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {index < displayData.days.length - 1 && <Separator className="mt-6" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Highlights and Tips */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Star className="w-5 h-5" /> Points forts</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {displayData.highlights.map((highlight, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {highlight}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Lightbulb className="w-5 h-5" /> Conseils pratiques</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {displayData.tips.map((tip, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Action Button */}
      <Card className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
        <CardContent className="p-6 text-center">
          <h3 className="font-semibold mb-2">Prêt pour l'aventure ?</h3>
          <p className="text-sm opacity-90 mb-4">
            Sauvegardez votre itinéraire et commencez à réserver vos activités
          </p>
          <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
            Sauvegarder l'itinéraire
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};