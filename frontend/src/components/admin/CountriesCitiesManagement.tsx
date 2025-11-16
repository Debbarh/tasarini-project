import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Edit, Plus, MapPin, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { locationAdminService, Country, City } from "@/services/locationAdminService";

export default function CountriesCitiesManagement() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [isCountryDialogOpen, setIsCountryDialogOpen] = useState(false);
  const [isCityDialogOpen, setIsCityDialogOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const { toast } = useToast();

  const [countryForm, setCountryForm] = useState({
    name: "",
    code: "",
    is_active: true,
  });

  const [cityForm, setCityForm] = useState({
    name: "",
    country: "",
    latitude: "",
    longitude: "",
    is_active: true,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [countriesData, citiesData] = await Promise.all([
        locationAdminService.listCountries(),
        locationAdminService.listCities(),
      ]);
      setCountries(countriesData || []);
      setCities(citiesData || []);
    } catch (error) {
      console.error("Error loading locations", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les pays et villes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCountry = async () => {
    if (!countryForm.name || !countryForm.code) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingCountry) {
        await locationAdminService.updateCountry(editingCountry.id, countryForm);
      } else {
        await locationAdminService.createCountry(countryForm);
      }
      toast({
        title: "Succès",
        description: `Pays ${editingCountry ? "modifié" : "créé"} avec succès`,
      });
      setIsCountryDialogOpen(false);
      setEditingCountry(null);
      setCountryForm({ name: "", code: "", is_active: true });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de sauvegarder le pays",
        variant: "destructive",
      });
    }
  };

  const handleSaveCity = async () => {
    if (!cityForm.name || !cityForm.country) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      name: cityForm.name,
      country: cityForm.country,
      latitude: cityForm.latitude ? parseFloat(cityForm.latitude) : null,
      longitude: cityForm.longitude ? parseFloat(cityForm.longitude) : null,
      is_active: cityForm.is_active,
    };

    try {
      if (editingCity) {
        await locationAdminService.updateCity(editingCity.id, payload);
      } else {
        await locationAdminService.createCity(payload);
      }
      toast({
        title: "Succès",
        description: `Ville ${editingCity ? "modifiée" : "créée"} avec succès`,
      });
      setIsCityDialogOpen(false);
      setEditingCity(null);
      setCityForm({ name: "", country: "", latitude: "", longitude: "", is_active: true });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de sauvegarder la ville",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCountry = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce pays ?")) return;
    try {
      await locationAdminService.deleteCountry(id);
      toast({
        title: "Succès",
        description: "Pays supprimé avec succès",
      });
      if (selectedCountry === id) {
        setSelectedCountry("");
      }
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de supprimer le pays",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCity = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette ville ?")) return;
    try {
      await locationAdminService.deleteCity(id);
      toast({
        title: "Succès",
        description: "Ville supprimée avec succès",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de supprimer la ville",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (type: "country" | "city", id: string, currentStatus: boolean) => {
    try {
      if (type === "country") {
        await locationAdminService.updateCountry(id, { is_active: !currentStatus });
      } else {
        await locationAdminService.updateCity(id, { is_active: !currentStatus });
      }
      toast({
        title: "Succès",
        description: "Statut mis à jour avec succès",
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  };

  const openEditCountry = (country: Country) => {
    setEditingCountry(country);
    setCountryForm({ name: country.name, code: country.code, is_active: country.is_active });
    setIsCountryDialogOpen(true);
  };

  const openEditCity = (city: City) => {
    setEditingCity(city);
    setCityForm({
      name: city.name,
      country: city.country || "",
      latitude: city.latitude?.toString() || "",
      longitude: city.longitude?.toString() || "",
      is_active: city.is_active,
    });
    setIsCityDialogOpen(true);
  };

  const filteredCities = selectedCountry && selectedCountry !== "all"
    ? cities.filter(city => city.country === selectedCountry)
    : cities;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        Chargement des pays et villes...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="countries" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="countries">
            <Globe className="w-4 h-4 mr-2" />
            Pays
          </TabsTrigger>
          <TabsTrigger value="cities">
            <MapPin className="w-4 h-4 mr-2" />
            Villes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="countries">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Gestion des Pays</CardTitle>
              <Dialog open={isCountryDialogOpen} onOpenChange={setIsCountryDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingCountry(null);
                    setCountryForm({ name: "", code: "", is_active: true });
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un pays
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingCountry ? "Modifier le pays" : "Ajouter un pays"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="country-name-input">Nom du pays *</Label>
                      <Input
                        id="country-name-input"
                        name="country-name"
                        value={countryForm.name}
                        onChange={(e) => setCountryForm({ ...countryForm, name: e.target.value })}
                        placeholder="France"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country-code-input">Code ISO *</Label>
                      <Input
                        id="country-code-input"
                        name="country-code"
                        value={countryForm.code}
                        onChange={(e) => setCountryForm({ ...countryForm, code: e.target.value.toUpperCase() })}
                        placeholder="FR"
                        maxLength={2}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="country-active-switch"
                        name="country-active"
                        checked={countryForm.is_active}
                        onCheckedChange={(checked) => setCountryForm({ ...countryForm, is_active: checked })}
                      />
                      <Label htmlFor="country-active-switch">Pays actif</Label>
                    </div>
                    <Button onClick={handleSaveCountry} className="w-full">
                      {editingCountry ? "Modifier" : "Créer"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {countries.map((country) => (
                  <div key={country.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <span className="font-medium">{country.name}</span>
                      <Badge variant="secondary" className="ml-2">{country.code}</Badge>
                      {!country.is_active && (
                        <Badge variant="destructive" className="ml-2">Inactif</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Switch
                        checked={country.is_active}
                        onCheckedChange={() => handleToggleActive("country", country.id, country.is_active)}
                        aria-label="Activer le pays"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditCountry(country)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCountry(country.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cities">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestion des Villes</CardTitle>
                <div className="mt-2">
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filtrer par pays" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les pays</SelectItem>
                      {countries.filter(country => country.id && country.name).map((country) => (
                        <SelectItem key={country.id} value={country.id}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Dialog open={isCityDialogOpen} onOpenChange={setIsCityDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingCity(null);
                    setCityForm({ name: "", country: "", latitude: "", longitude: "", is_active: true });
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter une ville
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingCity ? "Modifier la ville" : "Ajouter une ville"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="city-name-input">Nom de la ville *</Label>
                      <Input
                        id="city-name-input"
                        name="city-name"
                        value={cityForm.name}
                        onChange={(e) => setCityForm({ ...cityForm, name: e.target.value })}
                        placeholder="Paris"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city-country-select">Pays *</Label>
                      <Select 
                        value={cityForm.country} 
                        onValueChange={(value) => setCityForm({ ...cityForm, country: value })}
                      >
                        <SelectTrigger id="city-country-select">
                          <SelectValue placeholder="Sélectionner un pays" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.filter(country => country.id && country.name).map((country) => (
                            <SelectItem key={country.id} value={country.id}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city-lat-input">Latitude</Label>
                        <Input
                          id="city-lat-input"
                          name="city-latitude"
                          type="number"
                          step="any"
                          value={cityForm.latitude}
                          onChange={(e) => setCityForm({ ...cityForm, latitude: e.target.value })}
                          placeholder="48.8566"
                        />
                      </div>
                      <div>
                        <Label htmlFor="city-lng-input">Longitude</Label>
                        <Input
                          id="city-lng-input"
                          name="city-longitude"
                          type="number"
                          step="any"
                          value={cityForm.longitude}
                          onChange={(e) => setCityForm({ ...cityForm, longitude: e.target.value })}
                          placeholder="2.3522"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="city-active-switch"
                        name="city-active"
                        checked={cityForm.is_active}
                        onCheckedChange={(checked) => setCityForm({ ...cityForm, is_active: checked })}
                      />
                      <Label htmlFor="city-active-switch">Ville active</Label>
                    </div>
                    <Button onClick={handleSaveCity} className="w-full">
                      {editingCity ? "Modifier" : "Créer"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredCities.map((city) => (
                  <div key={city.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <span className="font-medium">{city.name}</span>
                      {city.country_detail && (
                        <Badge variant="outline" className="ml-2">
                          {city.country_detail.name}
                        </Badge>
                      )}
                      {!city.is_active && (
                        <Badge variant="destructive" className="ml-2">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Switch
                        checked={city.is_active}
                        onCheckedChange={() => handleToggleActive("city", city.id, city.is_active)}
                        aria-label="Activer la ville"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditCity(city)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCity(city.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
