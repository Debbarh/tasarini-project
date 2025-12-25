import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Users, Wallet, UtensilsCrossed, Building2, Activity, VideoIcon, ClipboardList, Brain } from "lucide-react";
import CountriesCitiesManagement from "./CountriesCitiesManagement";
import TravelGroupManagement from "./TravelGroupManagement";
import BudgetManagement from "./BudgetManagement";
import { CulinaryManagement } from "./CulinaryManagement";
import { AccommodationManagement } from "./AccommodationManagement";
import { ActivityManagement } from "./ActivityManagement";
import AdvertisementManagement from "./AdvertisementManagement";
import TripRequestsOverview from "./TripRequestsOverview";
import AIProviderManagement from "./AIProviderManagement";

const TripPlannerSettings = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Paramètres Plan Your Trip
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="destinations" className="space-y-4">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="destinations" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Destinations
            </TabsTrigger>
            <TabsTrigger value="travelers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Voyageurs
            </TabsTrigger>
            <TabsTrigger value="budget" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Budget
            </TabsTrigger>
            <TabsTrigger value="culinary" className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4" />
              Culinaire
            </TabsTrigger>
            <TabsTrigger value="accommodation" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Hébergement
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activités
            </TabsTrigger>
            <TabsTrigger value="advertisements" className="flex items-center gap-2">
              <VideoIcon className="w-4 h-4" />
              Publicités
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              IA
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Demandes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="destinations">
            <CountriesCitiesManagement />
          </TabsContent>

          <TabsContent value="travelers">
            <TravelGroupManagement />
          </TabsContent>

          <TabsContent value="budget">
            <BudgetManagement />
          </TabsContent>

          <TabsContent value="culinary">
            <CulinaryManagement />
          </TabsContent>

          <TabsContent value="accommodation">
            <AccommodationManagement />
          </TabsContent>

          <TabsContent value="activities">
            <ActivityManagement />
          </TabsContent>

          <TabsContent value="advertisements">
            <AdvertisementManagement />
          </TabsContent>

          <TabsContent value="ai">
            <AIProviderManagement />
          </TabsContent>

          <TabsContent value="requests">
            <TripRequestsOverview />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TripPlannerSettings;
