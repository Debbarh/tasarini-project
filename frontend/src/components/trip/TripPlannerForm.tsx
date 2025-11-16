import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MapPin, Users, DollarSign, Clock } from "lucide-react";
import { format } from "date-fns";
import LocationPicker from "@/components/LocationPicker";
import { cn } from "@/lib/utils";

interface TripFormData {
  destination: string;
  latitude?: number;
  longitude?: number;
  startDate: Date | undefined;
  endDate: Date | undefined;
  theme: string;
  budget: string;
  travelers: number;
  preferences: string;
}

interface TripPlannerFormProps {
  onSubmit: (data: TripFormData) => void;
  isLoading?: boolean;
}

export const TripPlannerForm = ({ onSubmit, isLoading }: TripPlannerFormProps) => {
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState({
    destination: "",
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<TripFormData>({
    defaultValues: {
      theme: "nature",
      budget: "moderate",
      travelers: 2,
      preferences: "",
    }
  });

  const startDate = watch("startDate");
  const endDate = watch("endDate");

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setSelectedLocation({
      destination: address,
      latitude: lat,
      longitude: lng,
    });
    setValue("destination", address);
    setValue("latitude", lat);
    setValue("longitude", lng);
    setShowLocationPicker(false);
  };

  const onFormSubmit = (data: TripFormData) => {
    onSubmit({
      ...data,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
    });
  };

  const calculateDuration = () => {
    if (startDate && endDate) {
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Planifiez votre voyage
        </CardTitle>
        <CardDescription>
          Renseignez vos préférences pour créer un itinéraire personnalisé
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Destination */}
          <div className="space-y-2">
            <Label htmlFor="destination">Destination</Label>
            <div className="flex gap-2">
              <Input
                id="destination"
                placeholder="Où souhaitez-vous aller ?"
                value={selectedLocation.destination}
                onChange={(e) => setSelectedLocation(prev => ({ ...prev, destination: e.target.value }))}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLocationPicker(!showLocationPicker)}
              >
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
            {errors.destination && (
              <p className="text-sm text-destructive">La destination est requise</p>
            )}
          </div>

          {/* Location Picker */}
          {showLocationPicker && (
            <Card className="border-primary/20">
              <CardContent className="p-4">
                <LocationPicker
                  latitude={selectedLocation.latitude}
                  longitude={selectedLocation.longitude}
                  onLocationSelect={handleLocationSelect}
                />
              </CardContent>
            </Card>
          )}

          {/* Dates */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Choisir une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => setValue("startDate", date)}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Date de fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "Choisir une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => setValue("endDate", date)}
                    disabled={(date) => date < (startDate || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Duration indicator */}
          {calculateDuration() > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 p-3 rounded-md">
              <Clock className="h-4 w-4" />
              <span>Durée du voyage : {calculateDuration()} jour{calculateDuration() > 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Theme and Budget */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Type de voyage</Label>
              <Select onValueChange={(value) => setValue("theme", value)} defaultValue="nature">
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un thème" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nature">🌲 Nature & plein air</SelectItem>
                  <SelectItem value="culture">🏛️ Culture & musées</SelectItem>
                  <SelectItem value="plage">🏖️ Plage & détente</SelectItem>
                  <SelectItem value="gastronomie">🍷 Gastronomie</SelectItem>
                  <SelectItem value="adventure">🧗 Aventure</SelectItem>
                  <SelectItem value="city">🏙️ Ville & shopping</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Budget</Label>
              <Select onValueChange={(value) => setValue("budget", value)} defaultValue="moderate">
                <SelectTrigger>
                  <SelectValue placeholder="Votre budget" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="budget">💰 Économique (&lt; 50€/jour)</SelectItem>
                  <SelectItem value="moderate">💎 Modéré (50-150€/jour)</SelectItem>
                  <SelectItem value="luxury">👑 Luxe (&gt; 150€/jour)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Travelers */}
          <div className="space-y-2">
            <Label htmlFor="travelers">Nombre de voyageurs</Label>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Input
                id="travelers"
                type="number"
                min="1"
                max="20"
                defaultValue="2"
                className="w-20"
                {...register("travelers", { 
                  valueAsNumber: true,
                  min: { value: 1, message: "Minimum 1 voyageur" },
                  max: { value: 20, message: "Maximum 20 voyageurs" }
                })}
              />
              <span className="text-sm text-muted-foreground">voyageur{watch("travelers") && watch("travelers") > 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Preferences */}
          <div className="space-y-2">
            <Label htmlFor="preferences">Préférences spéciales (optionnel)</Label>
            <Textarea
              id="preferences"
              placeholder="Activités spécifiques, contraintes d'accessibilité, régime alimentaire..."
              className="min-h-[80px]"
              {...register("preferences")}
            />
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            variant="hero"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Génération en cours...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Générer mon itinéraire
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};