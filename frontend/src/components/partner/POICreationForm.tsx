import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/integrations/api/client';
import { toast } from 'sonner';
import { uploadMediaFile, removeMediaFile } from '@/services/mediaStorageService';
import { createTouristPoint } from '@/services/poiService';
import { MapPin, Phone, Mail, Globe, X, Plus, Upload, Image as ImageIcon, Save, Send, Utensils, Hotel, Baby, Users, AlertTriangle, Accessibility, ParkingSquare, Bath, Headphones, Hand, UtensilsCrossed } from 'lucide-react';
import LocationPicker from '@/components/LocationPicker';
import { getPOITargetAudience } from '@/services/poiTargetMatchingService';
import { TaxonomyIcon } from '@/lib/taxonomyIcon';
import { getLocalizedLabel } from '@/utils/multilingualHelpers';
import { useTranslation } from 'react-i18next';
import { useBudgetSettings } from '@/hooks/useBudgetSettings';
import { useCulinarySettings } from '@/hooks/useCulinarySettings';
import { useAccommodationSettings } from '@/hooks/useAccommodationSettings';
import { Checkbox } from '@/components/ui/checkbox';

interface ActivityCategory {
  id: string;
  code: string;
  label_fr: string;
  label_en: string;
  icon_emoji?: string;
}

interface Country {
  id: string;
  name: string;
  code: string;
}

interface City {
  id: string;
  name: string;
  country_id: string;
}

interface DifficultyLevel {
  id: string;
  code: string;
  label_fr: string;
  label_en: string;
  level_value: number;
  is_child_friendly: boolean;
  is_senior_friendly: boolean;
  icon_emoji?: string;
}

interface POICreationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const POICreationForm: React.FC<POICreationFormProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    latitude: '',
    longitude: '',
    price_range: '',
    budget_level_id: '',
    contact_phone: '',
    contact_email: '',
    website_url: '',
    tags: [] as string[],
    categories: [] as string[],
    country: '',
    city: '',
    difficulty_level_id: '',
    is_wheelchair_accessible: false,
    has_accessible_parking: false,
    has_accessible_restrooms: false,
    has_audio_guide: false,
    has_sign_language_support: false,
    // Culinary fields
    is_restaurant: false,
    cuisine_types: [] as string[],
    dietary_restrictions_supported: [] as string[],
    restaurant_categories: [] as string[],
    culinary_adventure_level_id: '',
    
    // Accommodation fields
    is_accommodation: false,
    accommodation_types: [] as string[],
    accommodation_amenities: [] as string[],
    accommodation_locations: [] as string[],
    accommodation_accessibility: [] as string[],
    accommodation_security: [] as string[],
    accommodation_ambiance: [] as string[],
    
    // Activity fields
    is_activity: false,
    activity_categories: [] as string[],
    activity_intensity_level_id: '',
    activity_interests: [] as string[],
    activity_avoidances: [] as string[],
    activity_duration_minutes: null as number | null,
    activity_difficulty_level_id: ''
  });
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [difficultyLevels, setDifficultyLevels] = useState<DifficultyLevel[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [isDraft, setIsDraft] = useState(true);
  const { budgetLevels, loading: budgetLoading } = useBudgetSettings();
  const { 
    cuisineTypes, 
    dietaryRestrictions, 
    restaurantCategories, 
    adventureLevels,
    loading: culinaryLoading 
  } = useCulinarySettings();
  const {
    accommodationTypes,
    accommodationAmenities,
    accommodationLocations,
    accommodationAccessibility,
    accommodationSecurity,
    accommodationAmbiance,
    loading: accommodationLoading
  } = useAccommodationSettings();

  // Charger les catégories, pays et villes au montage
  useEffect(() => {
    loadCategories();
    loadCountries();
    loadCities();
    loadDifficultyLevels();
  }, []);

  const loadDifficultyLevels = async () => {
    try {
      const data = await apiClient.get<any[]>('poi/difficulty-levels/');
      setDifficultyLevels(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des niveaux de difficulté:', error);
    }
  };

  // Filtrer les villes selon le pays sélectionné
  useEffect(() => {
    if (formData.country) {
      const selectedCountry = countries.find(c => c.name === formData.country);
      if (selectedCountry) {
        const filtered = cities.filter(c => c.country_id === selectedCountry.id);
        setFilteredCities(filtered);
      }
    } else {
      setFilteredCities([]);
    }
  }, [formData.country, countries, cities]);

  const loadCategories = async () => {
    try {
      const data = await apiClient.get<any[]>('activities/categories/');
      setCategories(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
    }
  };

  const loadCountries = async () => {
    try {
      const data = await apiClient.get<any[]>('locations/countries/');
      setCountries(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des pays:', error);
      toast.error('Erreur lors du chargement des pays');
    }
  };

  const loadCities = async () => {
    try {
      const data = await apiClient.get<any[]>('locations/cities/');
      setCities(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des villes:', error);
      toast.error('Erreur lors du chargement des villes');
    }
  };

  const getAvailableCities = (countryName: string) => {
    const country = countries.find(c => c.name === countryName);
    if (!country) return [];
    return cities.filter(c => c.country_id === country.id);
  };

  const refreshCountriesAndCities = async () => {
    await Promise.all([loadCountries(), loadCities()]);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setSelectedLocation({ lat, lng, address });
    
    // Extraire le pays et la ville de l'adresse
    const addressParts = address.split(',').map(part => part.trim());
    
    let updatedFormData = {
      ...formData,
      latitude: lat.toString(),
      longitude: lng.toString(),
      address: address
    };
    
    // Essayer d'extraire le pays et la ville depuis l'adresse
    if (addressParts.length >= 2) {
      const countryFromAddress = addressParts[addressParts.length - 1] || '';
      const cityFromAddress = addressParts[addressParts.length - 2] || '';
      
      // Vérifier si le pays existe dans notre liste (recherche intelligente)
      const existingCountry = countries.find(c => 
        c.name.toLowerCase().includes(countryFromAddress.toLowerCase()) || 
        countryFromAddress.toLowerCase().includes(c.name.toLowerCase())
      );
      
      if (existingCountry) {
        updatedFormData.country = existingCountry.name;
        
        // Vérifier si la ville existe dans notre liste pour ce pays
        const existingCity = cities.find(c => 
          c.country_id === existingCountry.id && 
          (c.name.toLowerCase().includes(cityFromAddress.toLowerCase()) || 
           cityFromAddress.toLowerCase().includes(c.name.toLowerCase()))
        );
        
        if (existingCity) {
          updatedFormData.city = existingCity.name;
        } else if (cityFromAddress) {
          updatedFormData.city = cityFromAddress;
        }
      } else if (countryFromAddress) {
        // Si le pays n'existe pas dans la liste, utiliser le nom extrait
        updatedFormData.country = countryFromAddress;
        if (cityFromAddress) {
          updatedFormData.city = cityFromAddress;
        }
      }
    }
    
    setFormData(updatedFormData);
    
    // Recharger les données pour synchroniser avec les nouvelles entrées potentielles
    refreshCountriesAndCities();
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ 
        ...prev, 
        tags: [...prev.tags, newTag.trim()] 
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  const handleImageUpload = async (file: File) => {
    if (!file || !user?.id) {
      toast.error('Erreur d\'authentification');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadMediaFile(file, 'image', String(user.id), {
        compress: true,
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 800,
        maxSizeBytes: 10 * 1024 * 1024 // 10MB
      });

      if (result.success && result.url) {
        setUploadedImages(prev => [...prev, result.url]);
        toast.success('Image ajoutée avec succès');
      } else {
        toast.error(result.error || 'Erreur lors de l\'upload');
      }
    } catch (error: any) {
      console.error('Erreur upload complète:', error);
      toast.error(`Erreur lors de l'upload: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (url: string) => {
    try {
      const result = await removeMediaFile(url, 'image');
      
      if (result.success) {
        setUploadedImages(prev => prev.filter(img => img !== url));
        toast.success('Image supprimée');
      } else {
        toast.error(result.error || 'Erreur lors de la suppression');
      }
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const validateForm = (asDraft: boolean = false) => {
    const errors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      errors.name = 'Le nom est obligatoire';
    }
    
    if (!formData.address?.trim()) {
      errors.address = 'L\'adresse est obligatoire';
    }
    
    if (!formData.budget_level_id) {
      errors.budget_level_id = 'Le niveau de budget est obligatoire';
    }
    
    if (!asDraft && !formData.description?.trim()) {
      errors.description = 'La description est obligatoire pour la validation';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent, asDraft: boolean = false) => {
    e.preventDefault();
    // Clear previous validation errors
    setValidationErrors({});
    
    // Single validation check - remove duplicate validations
    if (!validateForm(asDraft)) {
      toast.error('Veuillez corriger les erreurs avant de continuer');
      return;
    }

    // Validation des coordonnées avec gestion des NaN
    if (!asDraft && formData.latitude && formData.longitude) {
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        toast.error('Les coordonnées GPS ne sont pas valides. Veuillez utiliser la carte pour sélectionner un emplacement.');
        return;
      }
    } else if (!asDraft) {
      toast.error('Les coordonnées GPS sont obligatoires pour la validation. Veuillez utiliser la carte.');
      return;
    }

    setLoading(true);
    try {
      // Extraction automatique du pays et de la ville depuis l'adresse
      const extractLocationFromAddress = (address: string) => {
        const parts = address.split(',').map(part => part.trim());
        const country = parts[parts.length - 1]; // Dernier élément = pays
        const city = parts.length >= 2 ? parts[parts.length - 2] : parts[0]; // Avant-dernier = ville
        return { country, city };
      };

      // Utiliser les valeurs du formulaire si remplies, sinon extraire de l'adresse
      let finalCountry = formData.country;
      let finalCity = formData.city;
      
      if (!finalCountry || !finalCity) {
        const extracted = extractLocationFromAddress(formData.address);
        finalCountry = finalCountry || extracted.country;
        finalCity = finalCity || extracted.city;
        
        // Mettre à jour les champs si ils étaient vides
        if (!formData.country && extracted.country) {
          handleInputChange('country', extracted.country);
        }
        if (!formData.city && extracted.city) {
          handleInputChange('city', extracted.city);
        }
      }

      // Créer ou récupérer les IDs du pays et de la ville
      let countryId: string | null = null;
      let cityId: string | null = null;

      // Utiliser les IDs de pays et ville sélectionnés s'ils existent
      if (formData.country) {
        countryId = formData.country;
      }

      if (formData.city) {
        cityId = formData.city;
      }

      const categoryTags = categories
        .filter((c) => formData.categories.includes(c.id))
        .map((c) => c.code || c.label_en || c.label_fr);
      
      // Validation minimale - les autres validations ont déjà été faites
      if (!user?.id) {
        throw new Error('Utilisateur non authentifié');
      }

      const poiData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        address: formData.address.trim(),
        latitude: formData.latitude && !isNaN(parseFloat(formData.latitude)) ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude && !isNaN(parseFloat(formData.longitude)) ? parseFloat(formData.longitude) : null,
        budget_level_id: formData.budget_level_id,
        contact_phone: formData.contact_phone?.trim() || null,
        contact_email: formData.contact_email?.trim() || null,
        website_url: formData.website_url?.trim() || null,
        tags: [...new Set([...(formData.tags || []), ...categoryTags])],
        media_images: uploadedImages,
        is_partner_point: true,
        is_active: false,
        is_verified: false,
        status_enum: asDraft ? 'draft' as const : 'pending_validation' as const,
        country_id: countryId,
        city_id: cityId,
        difficulty_level_id: formData.difficulty_level_id || null,
        is_wheelchair_accessible: formData.is_wheelchair_accessible,
        has_accessible_parking: formData.has_accessible_parking,
        has_accessible_restrooms: formData.has_accessible_restrooms,
        has_audio_guide: formData.has_audio_guide,
        has_sign_language_support: formData.has_sign_language_support,
        // Culinary fields
        is_restaurant: formData.is_restaurant,
        cuisine_types: formData.cuisine_types,
        dietary_restrictions_supported: formData.dietary_restrictions_supported,
        restaurant_categories: formData.restaurant_categories,
        culinary_adventure_level_id: formData.culinary_adventure_level_id || null,
        
        // Accommodation fields
        is_accommodation: formData.is_accommodation,
        accommodation_types: formData.accommodation_types,
        accommodation_amenities: formData.accommodation_amenities,
        accommodation_locations: formData.accommodation_locations,
        accommodation_accessibility: formData.accommodation_accessibility,
        accommodation_security: formData.accommodation_security,
        accommodation_ambiance: formData.accommodation_ambiance
      };

      const data = await createTouristPoint(poiData);

      toast.success(asDraft ? 'Point d\'intérêt sauvegardé en brouillon' : 'Point d\'intérêt soumis pour validation');
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        address: '',
        latitude: '',
        longitude: '',
        price_range: '',
        budget_level_id: '',
        contact_phone: '',
        contact_email: '',
        website_url: '',
        tags: [],
        categories: [],
        country: '',
        city: '',
        difficulty_level_id: '',
        is_wheelchair_accessible: false,
        has_accessible_parking: false,
        has_accessible_restrooms: false,
        has_audio_guide: false,
        has_sign_language_support: false,
        // Culinary fields
        is_restaurant: false,
        cuisine_types: [],
        dietary_restrictions_supported: [],
        restaurant_categories: [],
        culinary_adventure_level_id: '',
        
        // Accommodation fields
        is_accommodation: false,
        accommodation_types: [],
        accommodation_amenities: [],
        accommodation_locations: [],
        accommodation_accessibility: [],
        accommodation_security: [],
        accommodation_ambiance: [],
        
        // Activity fields
        is_activity: false,
        activity_categories: [],
        activity_intensity_level_id: '',
        activity_interests: [],
        activity_avoidances: [],
        activity_duration_minutes: null,
        activity_difficulty_level_id: ''
      });
      setUploadedImages([]);
      setSelectedLocation(null);
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('💥 Erreur lors de la création:', error);
      
      // N'afficher un toast générique que si aucun toast spécifique n'a été affiché
      if (!error.message?.includes('niveau de budget') && 
          !error.message?.includes('statut') && 
          !error.message?.includes('authentification')) {
        toast.error(`Erreur inattendue: ${error.message || 'Problème technique'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un nouveau point d'intérêt</DialogTitle>
          <DialogDescription>
            Ajoutez un nouveau point d'intérêt à votre profil partenaire. Vous pouvez le sauvegarder en brouillon ou le soumettre directement pour validation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
          {/* Informations de base */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations de base</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className={!formData.name ? "text-destructive" : ""}>
                  Nom du point d'intérêt *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Nom de votre établissement"
                  className={!formData.name ? "border-destructive" : ""}
                  required
                />
                {!formData.name && (
                  <p className="text-xs text-destructive">Ce champ est obligatoire</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className={!formData.description ? "text-destructive" : ""}>
                  Description *
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Décrivez votre établissement"
                  rows={4}
                  className={!formData.description ? "border-destructive" : ""}
                  required
                />
                {!formData.description && (
                  <p className="text-xs text-destructive">Ce champ est obligatoire</p>
                )}
                <div className="text-xs text-muted-foreground text-right">
                  {formData.description.length} caractères
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price_range">Gamme de prix</Label>
                  <Select
                    value={formData.price_range}
                    onValueChange={(value) => handleInputChange('price_range', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une gamme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="€">€ - Économique</SelectItem>
                      <SelectItem value="€€">€€ - Modéré</SelectItem>
                      <SelectItem value="€€€">€€€ - Cher</SelectItem>
                      <SelectItem value="€€€€">€€€€ - Très cher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget_level">Niveau de budget *</Label>
                  <Select
                    value={formData.budget_level_id}
                    onValueChange={(value) => handleInputChange('budget_level_id', value)}
                  >
                    <SelectTrigger className={validationErrors.budget_level_id ? "border-red-500" : ""}>
                      <SelectValue placeholder="Sélectionner un niveau" />
                    </SelectTrigger>
                    <SelectContent>
                      {budgetLevels.map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                          <div className="flex items-center gap-2">
                            <TaxonomyIcon iconName={level.icon_name} code={level.code} className="h-4 w-4 mr-2" fallback="Tag" />
                            <span>{getLocalizedLabel(level, i18n.language) || level.label_fr}</span>
                            <span className="text-xs text-muted-foreground">
                              ({level.default_daily_amount}€/jour)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.budget_level_id && (
                    <p className="text-sm text-red-600">{validationErrors.budget_level_id}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Localisation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Localisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <div className="flex">
                  <MapPin className="w-4 h-4 mr-2 mt-3 text-muted-foreground" />
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Adresse complète"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => handleInputChange('latitude', e.target.value)}
                    placeholder="Ex: 48.8566"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => handleInputChange('longitude', e.target.value)}
                    placeholder="Ex: 2.3522"
                  />
                </div>
              </div>

              {/* Champs Pays et Ville */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Pays</Label>
                  <Select 
                    value={formData.country} 
                    onValueChange={(value) => handleInputChange('country', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un pays" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.id} value={country.name}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Détecté automatiquement depuis l'adresse
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ville</Label>
                  <Select 
                    value={formData.city} 
                    onValueChange={(value) => handleInputChange('city', value)}
                    disabled={!formData.country}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une ville" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCities.map((city) => (
                        <SelectItem key={city.id} value={city.name}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Détectée automatiquement depuis l'adresse
                  </p>
                </div>
              </div>

              <div className="h-64 border rounded-lg overflow-hidden">
                <LocationPicker
                  onLocationSelect={handleLocationSelect}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations de contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Téléphone</Label>
                  <div className="flex">
                    <Phone className="w-4 h-4 mr-2 mt-3 text-muted-foreground" />
                    <Input
                      id="contact_phone"
                      value={formData.contact_phone}
                      onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                      placeholder="+33 1 23 45 67 89"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email</Label>
                  <div className="flex">
                    <Mail className="w-4 h-4 mr-2 mt-3 text-muted-foreground" />
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => handleInputChange('contact_email', e.target.value)}
                      placeholder="contact@exemple.com"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website_url">Site web</Label>
                <div className="flex">
                  <Globe className="w-4 h-4 mr-2 mt-3 text-muted-foreground" />
                  <Input
                    id="website_url"
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => handleInputChange('website_url', e.target.value)}
                    placeholder="https://www.exemple.com"
                    className="flex-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Catégories */}
          <Card className={formData.categories.length === 0 ? "border-amber-200 bg-amber-50/50" : ""}>
            <CardHeader>
              <CardTitle className={formData.categories.length === 0 ? "text-amber-700" : "text-lg"}>
                Catégories {!isDraft && formData.categories.length === 0 && "*"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className={`p-2 rounded-lg border text-sm transition-colors ${
                      formData.categories.includes(category.id)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-muted'
                    }`}
                  >
                    <span className="inline-flex items-center"><TaxonomyIcon iconName={category.icon_name} code={category.code} className="h-4 w-4 mr-2" fallback="Tag" />{getLocalizedLabel(category, i18n.language) || category.label_fr}</span>
                  </button>
                ))}
              </div>
              {formData.categories.length === 0 && !isDraft && (
                <p className="text-xs text-amber-600 mt-2">
                  Sélectionnez au moins une catégorie pour soumettre le POI
                </p>
              )}
              {formData.categories.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {formData.categories.length} catégorie(s) sélectionnée(s)
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tags personnalisés</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Ex: Vue sur mer, Terrasse"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="pr-1">
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-1"
                        onClick={() => removeTag(tag)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Niveau de difficulté */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Niveau de difficulté</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty_level">Niveau de difficulté</Label>
                <Select
                  value={formData.difficulty_level_id}
                  onValueChange={(value) => handleInputChange('difficulty_level_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyLevels.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        <div className="flex items-center gap-2">
                          <TaxonomyIcon iconName={level.icon_name} code={level.code} className="h-4 w-4 mr-2" fallback="Tag" />
                          <span>{getLocalizedLabel(level, i18n.language) || level.label_fr}</span>
                          {level.is_child_friendly && <Baby className="w-4 h-4 text-green-600" />}
                          {level.is_senior_friendly && <Users className="w-4 h-4 text-blue-600" />}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Baby className="w-4 h-4" /> = Adapté aux enfants | <Users className="w-4 h-4" /> = Adapté aux seniors
                </p>
              </div>

              {/* Aperçu des segments cibles */}
              {formData.difficulty_level_id && (
                <div className="mt-4">
                  <Label className="text-sm font-medium">Segments cibles automatiques :</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(() => {
                      const selectedLevel = difficultyLevels.find(l => l.id === formData.difficulty_level_id);
                      if (!selectedLevel) return null;
                      
                      const mockPOI = {
                        id: 'temp',
                        name: formData.name || 'Nouveau POI',
                        latitude: 0,
                        longitude: 0,
                        is_active: true,
                        difficulty_level: {
                          id: selectedLevel.id,
                          code: selectedLevel.code,
                          label_fr: selectedLevel.label_fr,
                          label_en: selectedLevel.label_en,
                          level_value: selectedLevel.level_value,
                          is_child_friendly: selectedLevel.is_child_friendly,
                          is_senior_friendly: selectedLevel.is_senior_friendly
                        },
                        is_wheelchair_accessible: formData.is_wheelchair_accessible
                      };
                      
                      return getPOITargetAudience(mockPOI).map(audience => (
                        <Badge 
                          key={audience.segment} 
                          variant={audience.suitable ? "default" : "secondary"}
                          className={audience.suitable ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                        >
                          <TaxonomyIcon iconName={audience.icon} className="w-3 h-3 mr-1 inline" />
                          {audience.label}
                          {!audience.suitable && audience.reason && (
                            <AlertTriangle className="w-3 h-3 ml-1" aria-label={audience.reason} />

                          )}
                        </Badge>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Accessibilité */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Accessibilité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="wheelchair_accessible"
                    checked={formData.is_wheelchair_accessible}
                    onChange={(e) => handleInputChange('is_wheelchair_accessible', e.target.checked)}
                    className="rounded border-border"
                  />
                  <Label htmlFor="wheelchair_accessible" className="text-sm flex items-center gap-1">
                    <Accessibility className="w-4 h-4" /> Accessible en fauteuil roulant
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="accessible_parking"
                    checked={formData.has_accessible_parking}
                    onChange={(e) => handleInputChange('has_accessible_parking', e.target.checked)}
                    className="rounded border-border"
                  />
                  <Label htmlFor="accessible_parking" className="text-sm flex items-center gap-1">
                    <ParkingSquare className="w-4 h-4" /> Parking accessible
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="accessible_restrooms"
                    checked={formData.has_accessible_restrooms}
                    onChange={(e) => handleInputChange('has_accessible_restrooms', e.target.checked)}
                    className="rounded border-border"
                  />
                  <Label htmlFor="accessible_restrooms" className="text-sm flex items-center gap-1">
                    <Bath className="w-4 h-4" /> Toilettes accessibles
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="audio_guide"
                    checked={formData.has_audio_guide}
                    onChange={(e) => handleInputChange('has_audio_guide', e.target.checked)}
                    className="rounded border-border"
                  />
                  <Label htmlFor="audio_guide" className="text-sm flex items-center gap-1">
                    <Headphones className="w-4 h-4" /> Guide audio disponible
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sign_language"
                    checked={formData.has_sign_language_support}
                    onChange={(e) => handleInputChange('has_sign_language_support', e.target.checked)}
                    className="rounded border-border"
                  />
                  <Label htmlFor="sign_language" className="text-sm flex items-center gap-1">
                    <Hand className="w-4 h-4" /> Support langue des signes
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section Restauration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Services de restauration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_restaurant"
                  checked={formData.is_restaurant}
                  onCheckedChange={(checked) => handleInputChange('is_restaurant', checked)}
                />
                <Label htmlFor="is_restaurant" className="text-sm font-medium flex items-center gap-1">
                  <UtensilsCrossed className="w-4 h-4" /> Proposez-vous des services de restauration ?
                </Label>
              </div>

              {formData.is_restaurant && (
                <div className="space-y-4 border-l-2 border-primary pl-4">
                  {/* Types de cuisine */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Types de cuisine</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {cuisineTypes.map((cuisine) => (
                        <label key={cuisine.id} className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={formData.cuisine_types.includes(cuisine.code)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleInputChange('cuisine_types', [...formData.cuisine_types, cuisine.code]);
                              } else {
                                handleInputChange('cuisine_types', formData.cuisine_types.filter(c => c !== cuisine.code));
                              }
                            }}
                          />
                          <span className="text-sm">{cuisine.label_fr}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Restrictions alimentaires supportées */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Restrictions alimentaires supportées</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {dietaryRestrictions.map((restriction) => (
                        <label key={restriction.id} className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={formData.dietary_restrictions_supported.includes(restriction.code)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleInputChange('dietary_restrictions_supported', [...formData.dietary_restrictions_supported, restriction.code]);
                              } else {
                                handleInputChange('dietary_restrictions_supported', formData.dietary_restrictions_supported.filter(r => r !== restriction.code));
                              }
                            }}
                          />
                          <span className="text-sm inline-flex items-center">
                            <TaxonomyIcon iconName={restriction.icon_name} code={restriction.code} className="h-4 w-4 mr-2" fallback="Tag" />{getLocalizedLabel(restriction, i18n.language) || restriction.label_fr}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Catégories de restaurant */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Catégories de restaurant</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {restaurantCategories.map((category) => (
                        <label key={category.id} className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={formData.restaurant_categories.includes(category.code)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleInputChange('restaurant_categories', [...formData.restaurant_categories, category.code]);
                              } else {
                                handleInputChange('restaurant_categories', formData.restaurant_categories.filter(c => c !== category.code));
                              }
                            }}
                          />
                          <span className="text-sm inline-flex items-center">
                            <TaxonomyIcon iconName={category.icon_name} code={category.code} className="h-4 w-4 mr-2" fallback="Tag" />{getLocalizedLabel(category, i18n.language) || category.label_fr}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Niveau d'aventure culinaire */}
                  <div className="space-y-2">
                    <Label htmlFor="culinary_adventure_level">Niveau d'aventure culinaire</Label>
                    <Select
                      value={formData.culinary_adventure_level_id}
                      onValueChange={(value) => handleInputChange('culinary_adventure_level_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un niveau" />
                      </SelectTrigger>
                      <SelectContent>
                        {adventureLevels.map((level) => (
                          <SelectItem key={level.id} value={level.id}>
                            {level.label_fr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Indique le niveau d'aventure culinaire de votre établissement
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section Hébergement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Services d'hébergement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_accommodation"
                  checked={formData.is_accommodation}
                  onCheckedChange={(checked) => handleInputChange('is_accommodation', checked)}
                />
                <Label htmlFor="is_accommodation" className="text-sm font-medium flex items-center gap-1">
                  <Hotel className="w-4 h-4" /> Proposez-vous des services d'hébergement ?
                </Label>
              </div>

              {formData.is_accommodation && (
                <div className="space-y-4 border-l-2 border-primary pl-4">
                  {/* Types d'hébergement */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Types d'hébergement</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {accommodationTypes.map((type) => (
                        <label key={type.id} className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={formData.accommodation_types.includes(type.code)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleInputChange('accommodation_types', [...formData.accommodation_types, type.code]);
                              } else {
                                handleInputChange('accommodation_types', formData.accommodation_types.filter(t => t !== type.code));
                              }
                            }}
                          />
                          <span className="text-sm inline-flex items-center">
                            <TaxonomyIcon iconName={type.icon_name} code={type.code} className="h-4 w-4 mr-2" fallback="Tag" />{getLocalizedLabel(type, i18n.language) || type.label_fr}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Équipements */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Équipements</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {accommodationAmenities.map((amenity) => (
                        <label key={amenity.id} className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={formData.accommodation_amenities.includes(amenity.code)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleInputChange('accommodation_amenities', [...formData.accommodation_amenities, amenity.code]);
                              } else {
                                handleInputChange('accommodation_amenities', formData.accommodation_amenities.filter(a => a !== amenity.code));
                              }
                            }}
                          />
                          <span className="text-sm inline-flex items-center">
                            <TaxonomyIcon iconName={amenity.icon_name} code={amenity.code} className="h-4 w-4 mr-2" fallback="Tag" />{getLocalizedLabel(amenity, i18n.language) || amenity.label_fr}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Emplacements */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Emplacements</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {accommodationLocations.map((location) => (
                        <label key={location.id} className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={formData.accommodation_locations.includes(location.code)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleInputChange('accommodation_locations', [...formData.accommodation_locations, location.code]);
                              } else {
                                handleInputChange('accommodation_locations', formData.accommodation_locations.filter(l => l !== location.code));
                              }
                            }}
                          />
                          <span className="text-sm inline-flex items-center">
                            <TaxonomyIcon iconName={location.icon_name} code={location.code} className="h-4 w-4 mr-2" fallback="Tag" />{getLocalizedLabel(location, i18n.language) || location.label_fr}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Accessibilité hébergement */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Accessibilité hébergement</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {accommodationAccessibility.map((access) => (
                        <label key={access.id} className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={formData.accommodation_accessibility.includes(access.code)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleInputChange('accommodation_accessibility', [...formData.accommodation_accessibility, access.code]);
                              } else {
                                handleInputChange('accommodation_accessibility', formData.accommodation_accessibility.filter(a => a !== access.code));
                              }
                            }}
                          />
                          <span className="text-sm inline-flex items-center">
                            <TaxonomyIcon iconName={access.icon_name} code={access.code} className="h-4 w-4 mr-2" fallback="Tag" />{getLocalizedLabel(access, i18n.language) || access.label_fr}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Sécurité */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Mesures de sécurité</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {accommodationSecurity.map((security) => (
                        <label key={security.id} className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={formData.accommodation_security.includes(security.code)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleInputChange('accommodation_security', [...formData.accommodation_security, security.code]);
                              } else {
                                handleInputChange('accommodation_security', formData.accommodation_security.filter(s => s !== security.code));
                              }
                            }}
                          />
                          <span className="text-sm inline-flex items-center">
                            <TaxonomyIcon iconName={security.icon_name} code={security.code} className="h-4 w-4 mr-2" fallback="Tag" />{getLocalizedLabel(security, i18n.language) || security.label_fr}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Ambiance */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Ambiance</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {accommodationAmbiance.map((ambiance) => (
                        <label key={ambiance.id} className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={formData.accommodation_ambiance.includes(ambiance.code)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleInputChange('accommodation_ambiance', [...formData.accommodation_ambiance, ambiance.code]);
                              } else {
                                handleInputChange('accommodation_ambiance', formData.accommodation_ambiance.filter(a => a !== ambiance.code));
                              }
                            }}
                          />
                          <span className="text-sm inline-flex items-center">
                            <TaxonomyIcon iconName={ambiance.icon_name} code={ambiance.code} className="h-4 w-4 mr-2" fallback="Tag" />{getLocalizedLabel(ambiance, i18n.language) || ambiance.label_fr}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {uploading ? 'Upload en cours...' : 'Cliquez pour ajouter une image'}
                  </p>
                </label>
              </div>

              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Image ${index + 1}`}
                        className="w-full h-24 object-cover rounded-md"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(image)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Validation Summary */}
          {(!formData.name || !formData.description || !formData.budget_level_id) && (
            <Card className="border-destructive bg-destructive/5">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-destructive flex-shrink-0 mt-0.5">
                    <span className="text-destructive-foreground text-xs block text-center leading-4">!</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-destructive">Champs obligatoires manquants :</p>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                      {!formData.name && <li>• Nom du point d'intérêt</li>}
                      {!formData.description && <li>• Description</li>}
                      {!formData.budget_level_id && <li>• Niveau de budget</li>}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={(e) => handleSubmit(e, true)}
                disabled={loading || !formData.name || !formData.description || !formData.budget_level_id}
                title={(!formData.name || !formData.description || !formData.budget_level_id) ? "Veuillez remplir les champs obligatoires" : ""}
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Sauvegarde...' : 'Sauver en brouillon'}
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !formData.name || !formData.description || !formData.budget_level_id || 
                         !formData.address || !formData.latitude || !formData.longitude || formData.categories.length === 0}
                title={(!formData.name || !formData.description || !formData.budget_level_id || 
                        !formData.address || !formData.latitude || !formData.longitude || formData.categories.length === 0) 
                       ? "Veuillez remplir tous les champs obligatoires et sélectionner au moins une catégorie" : ""}
              >
                <Send className="w-4 h-4 mr-2" />
                {loading ? 'Soumission...' : 'Soumettre pour validation'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default POICreationForm;
