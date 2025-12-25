import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Edit, Plus, MapPin, Globe, Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { locationAdminService, Country, City } from "@/services/locationAdminService";
import { API_BASE_URL, extractArrayFromResponse } from "@/integrations/api/client";

const LANGUAGE_FIELDS = [
  { key: "name_fr", label: "Français" },
  { key: "name_en", label: "Anglais" },
  { key: "name_es", label: "Espagnol" },
  { key: "name_de", label: "Allemand" },
  { key: "name_it", label: "Italien" },
  { key: "name_pt", label: "Portugais" },
  { key: "name_ru", label: "Russe" },
  { key: "name_ja", label: "Japonais" },
  { key: "name_zh", label: "Chinois" },
  { key: "name_hi", label: "Hindi" },
  { key: "name_ar", label: "Arabe" },
] as const;

const emptyCountryForm = {
  name: "",
  code: "",
  is_active: true,
  name_fr: "",
  name_en: "",
  name_es: "",
  name_de: "",
  name_it: "",
  name_pt: "",
  name_ru: "",
  name_ja: "",
  name_zh: "",
  name_hi: "",
  name_ar: "",
};

const emptyCityForm = {
  name: "",
  country: "",
  latitude: "",
  longitude: "",
  is_active: true,
  name_fr: "",
  name_en: "",
  name_es: "",
  name_de: "",
  name_it: "",
  name_pt: "",
  name_ru: "",
  name_ja: "",
  name_zh: "",
  name_hi: "",
  name_ar: "",
};

type CountryFormState = typeof emptyCountryForm;
type CityFormState = typeof emptyCityForm;

const getLocalizedName = (entity: Partial<Record<(typeof LANGUAGE_FIELDS)[number]["key"] | "name", string>>) => {
  for (const { key } of LANGUAGE_FIELDS) {
    const value = entity[key];
    if (value) {
      return value;
    }
  }
  return entity.name || "";
};

export default function CountriesCitiesManagement() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [isCountryDialogOpen, setIsCountryDialogOpen] = useState(false);
  const [isCityDialogOpen, setIsCityDialogOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const { toast } = useToast();

  const [countryForm, setCountryForm] = useState<CountryFormState>({ ...emptyCountryForm });

  const [cityForm, setCityForm] = useState<CityFormState>({ ...emptyCityForm });

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

      // Handle both array and paginated response formats
      setCountries(extractArrayFromResponse<Country>(countriesData));
      setCities(extractArrayFromResponse<City>(citiesData));
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
    if (!countryForm.code) {
      toast({
        title: "Erreur",
        description: "Le code ISO est obligatoire",
        variant: "destructive",
      });
      return;
    }

    const payload: Record<string, any> = {
      code: countryForm.code.toUpperCase(),
      is_active: countryForm.is_active,
    };

    LANGUAGE_FIELDS.forEach(({ key }) => {
      payload[key] = countryForm[key as keyof typeof countryForm] || "";
    });

    payload.name =
      countryForm.name.trim() ||
      payload.name_fr ||
      payload.name_en ||
      payload.name_es ||
      payload.code;

    try {
      if (editingCountry) {
        await locationAdminService.updateCountry(editingCountry.id, payload);
      } else {
        await locationAdminService.createCountry(payload);
      }
      toast({
        title: "Succès",
        description: `Pays ${editingCountry ? "modifié" : "créé"} avec succès`,
      });
      setIsCountryDialogOpen(false);
      setEditingCountry(null);
      setCountryForm({ ...emptyCountryForm });
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
    if (!cityForm.country) {
      toast({
        title: "Erreur",
        description: "Sélectionnez un pays pour la ville",
        variant: "destructive",
      });
      return;
    }

    const payload: Record<string, any> = {
      name: cityForm.name.trim(),
      country: cityForm.country,
      latitude: cityForm.latitude ? parseFloat(cityForm.latitude) : null,
      longitude: cityForm.longitude ? parseFloat(cityForm.longitude) : null,
      is_active: cityForm.is_active,
    };

    LANGUAGE_FIELDS.forEach(({ key }) => {
      payload[key] = cityForm[key as keyof typeof cityForm] || "";
    });

    if (!payload.name) {
      payload.name =
        payload.name_fr ||
        payload.name_en ||
        payload.name_es ||
        payload.name_de ||
        payload.name_it ||
        "Ville sans nom";
    }

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
      setCityForm({ ...emptyCityForm });
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

  const buildCountryForm = (country?: Country | null): CountryFormState => {
    if (!country) {
      return { ...emptyCountryForm };
    }
    const translations = LANGUAGE_FIELDS.reduce((acc, { key }) => {
      const value = country[key as keyof Country];
      acc[key] = (typeof value === 'string' ? value : "") || "";
      return acc;
    }, {} as Record<string, string>);

    return {
      ...emptyCountryForm,
      ...translations,
      name: country.name || translations.name_fr || "",
      code: country.code || "",
      is_active: country.is_active,
    };
  };

  const buildCityForm = (city?: City | null): CityFormState => {
    if (!city) {
      return { ...emptyCityForm };
    }
    const translations = LANGUAGE_FIELDS.reduce((acc, { key }) => {
      const value = city[key as keyof City];
      acc[key] = (typeof value === 'string' ? value : "") || "";
      return acc;
    }, {} as Record<string, string>);

    return {
      ...emptyCityForm,
      ...translations,
      name: city.name || translations.name_fr || "",
      country: city.country || "",
      latitude: city.latitude?.toString() || "",
      longitude: city.longitude?.toString() || "",
      is_active: city.is_active,
    };
  };

  const openEditCountry = (country: Country) => {
    setEditingCountry(country);
    setCountryForm(buildCountryForm(country));
    setIsCountryDialogOpen(true);
  };

  const openEditCity = (city: City) => {
    setEditingCity(city);
    setCityForm(buildCityForm(city));
    setIsCityDialogOpen(true);
  };

  // Translate functions
  const handleTranslateCountry = async (countryId: string) => {
    try {
      console.log('[CountriesCitiesManagement] Translating country', countryId);
      const translateEndpoint = `/api/v1/locations/countries/${countryId}/translate/`;
      console.log('[CountriesCitiesManagement] Translation endpoint (country):', translateEndpoint);
      const result = await locationAdminService.translateCountry(countryId);
      console.log('[CountriesCitiesManagement] Translation response (country):', result);
      const updatedCountry = result.country;

      setCountries((prev) =>
        prev.map((country) => (country.id === updatedCountry.id ? updatedCountry : country))
      );

      if (editingCountry && editingCountry.id === updatedCountry.id) {
        setEditingCountry(updatedCountry);
        setCountryForm(buildCountryForm(updatedCountry));
      }

      toast({
        title: "✅ Traduction réussie",
        description: `${result.message} dans les langues: ${result.languages.join(", ")}`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de traduire le pays",
        variant: "destructive",
      });
    }
  };

  const handleTranslateCity = async (cityId: string) => {
    try {
      console.log('[CountriesCitiesManagement] Translating city', cityId);
      const result = await locationAdminService.translateCity(cityId);
      console.log('[CountriesCitiesManagement] Translation response (city):', result);
      const updatedCity = result.city;

      setCities((prev) => prev.map((city) => (city.id === updatedCity.id ? updatedCity : city)));

      if (editingCity && editingCity.id === updatedCity.id) {
        setEditingCity(updatedCity);
        setCityForm(buildCityForm(updatedCity));
      }

      toast({
        title: "✅ Traduction réussie",
        description: `${result.message} dans les langues: ${result.languages.join(", ")}`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de traduire la ville",
        variant: "destructive",
      });
    }
  };

  // Export functions
  const handleExportCountries = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/locations/countries/export-csv/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tasarini_access_token')}`,
        },
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'countries.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Succès",
        description: "Export des pays réussi",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Échec de l'export des pays",
        variant: "destructive",
      });
    }
  };

  const handleExportCities = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/locations/cities/export-csv/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tasarini_access_token')}`,
        },
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cities.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Succès",
        description: "Export des villes réussi",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Échec de l'export des villes",
        variant: "destructive",
      });
    }
  };

  // Import functions
  const handleImportCountries = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/locations/countries/import-csv/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tasarini_access_token')}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      toast({
        title: "Succès",
        description: `Import terminé: ${result.created} créés, ${result.updated} mis à jour${result.errors.length > 0 ? `, ${result.errors.length} erreurs` : ''}`,
      });

      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
      }

      // Refresh data
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Échec de l'import des pays",
        variant: "destructive",
      });
    }

    // Reset input
    event.target.value = '';
  };

  const handleImportCities = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/locations/cities/import-csv/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tasarini_access_token')}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      toast({
        title: "Succès",
        description: `Import terminé: ${result.created} créés, ${result.updated} mis à jour${result.errors.length > 0 ? `, ${result.errors.length} erreurs` : ''}`,
      });

      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
      }

      // Refresh data
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Échec de l'import des villes",
        variant: "destructive",
      });
    }

    // Reset input
    event.target.value = '';
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
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCountries}>
                  <Download className="w-4 h-4 mr-2" />
                  Exporter CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.csv';
                  input.onchange = (e) => handleImportCountries(e as any);
                  input.click();
                }}>
                  <Upload className="w-4 h-4 mr-2" />
                  Importer CSV
                </Button>
                <Dialog open={isCountryDialogOpen} onOpenChange={setIsCountryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingCountry(null);
                      setCountryForm({ ...emptyCountryForm });
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
                    <DialogDescription>
                      Renseignez le nom et ses traductions pour toutes les langues supportées.
                    </DialogDescription>
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
                    {editingCountry && (
                      <div className="border rounded-lg p-3 bg-blue-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Traduction automatique</p>
                            <p className="text-xs text-gray-600 mt-1">
                              Remplir automatiquement les champs de traduction vides via LibreTranslate
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleTranslateCountry(editingCountry.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Globe className="w-4 h-4 mr-1" />
                            Traduire
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="border rounded-lg p-3 space-y-3">
                      <p className="text-sm font-medium">Traductions du nom</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {LANGUAGE_FIELDS.map(({ key, label }) => {
                          const fieldKey = key as keyof CountryFormState;
                          return (
                            <div key={key}>
                              <Label htmlFor={`country-${key}`}>{label}</Label>
                              <Input
                                id={`country-${key}`}
                                value={(countryForm[fieldKey] as string) || ""}
                                onChange={(e) =>
                                  setCountryForm({ ...countryForm, [fieldKey]: e.target.value } as CountryFormState)
                                }
                                placeholder={`Nom en ${label.toLowerCase()}`}
                              />
                            </div>
                          );
                        })}
                      </div>
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
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {countries.map((country) => (
                  <div key={country.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <span className="font-medium">{getLocalizedName(country)}</span>
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
                      {countries
                        .filter((country) => country.id && getLocalizedName(country))
                        .map((country) => (
                          <SelectItem key={country.id} value={country.id}>
                            {getLocalizedName(country)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCities}>
                  <Download className="w-4 h-4 mr-2" />
                  Exporter CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.csv';
                  input.onchange = (e) => handleImportCities(e as any);
                  input.click();
                }}>
                  <Upload className="w-4 h-4 mr-2" />
                  Importer CSV
                </Button>
                <Dialog open={isCityDialogOpen} onOpenChange={setIsCityDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingCity(null);
                      setCityForm({ ...emptyCityForm });
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
                    <DialogDescription>
                      Ajoutez la localisation et les traductions du nom pour chaque langue.
                    </DialogDescription>
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
                          {countries
                            .filter((country) => country.id && getLocalizedName(country))
                            .map((country) => (
                              <SelectItem key={country.id} value={country.id}>
                                {getLocalizedName(country)}
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
                    {editingCity && (
                      <div className="border rounded-lg p-3 bg-blue-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Traduction automatique</p>
                            <p className="text-xs text-gray-600 mt-1">
                              Remplir automatiquement les champs de traduction vides via LibreTranslate
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleTranslateCity(editingCity.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Globe className="w-4 h-4 mr-1" />
                            Traduire
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="border rounded-lg p-3 space-y-3">
                      <p className="text-sm font-medium">Traductions du nom</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {LANGUAGE_FIELDS.map(({ key, label }) => {
                          const fieldKey = key as keyof CityFormState;
                          return (
                            <div key={key}>
                              <Label htmlFor={`city-${key}`}>{label}</Label>
                              <Input
                                id={`city-${key}`}
                                value={(cityForm[fieldKey] as string) || ""}
                                onChange={(e) =>
                                  setCityForm({ ...cityForm, [fieldKey]: e.target.value } as CityFormState)
                                }
                                placeholder={`Nom en ${label.toLowerCase()}`}
                              />
                            </div>
                          );
                        })}
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
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredCities.map((city) => (
                  <div key={city.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <span className="font-medium">{getLocalizedName(city)}</span>
                      {city.country_detail && (
                        <Badge variant="outline" className="ml-2">
                          {getLocalizedName(city.country_detail)}
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
