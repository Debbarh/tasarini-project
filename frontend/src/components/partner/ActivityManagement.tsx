import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, Coins, Package, Users, AlertTriangle, Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCurrencySettings } from '@/hooks/useCurrencySettings';
import {
  ActivityEquipment,
  ActivityRequirement,
  ActivityTimeSlot,
  ActivityPricing,
  ActivityBooking,
  getActivityEquipment,
  getActivityRequirements,
  getActivityTimeSlots,
  getActivityPricing,
  getActivityBookings,
  createActivityEquipment,
  createActivityRequirement,
  createActivityTimeSlot,
  createActivityPricing,
  updateActivityEquipment,
  updateActivityRequirement,
  updateActivityTimeSlot,
  updateActivityPricing,
  updateActivityBooking,
  deleteActivityEquipment,
  deleteActivityRequirement,
  deleteActivityTimeSlot,
  deleteActivityPricing
} from '@/services/activityService';

interface ActivityManagementProps {
  touristPointId: string;
  activityName: string;
}

const BASE_ACTIVITY_CURRENCY = 'EUR' as const;

export function ActivityManagement({ touristPointId, activityName }: ActivityManagementProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState<ActivityEquipment[]>([]);
  const [requirements, setRequirements] = useState<ActivityRequirement[]>([]);
  const [timeSlots, setTimeSlots] = useState<ActivityTimeSlot[]>([]);
  const [pricing, setPricing] = useState<ActivityPricing[]>([]);
  const [bookings, setBookings] = useState<ActivityBooking[]>([]);

  const {
    currency: displayCurrency,
    setCurrency: setDisplayCurrency,
    convertAmount,
    formatCurrency: formatDisplayCurrency,
    availableCurrencies,
  } = useCurrencySettings();

  const displayCurrencySymbol = useMemo(() => {
    return availableCurrencies.find((currency) => currency.code === displayCurrency)?.symbol ?? displayCurrency;
  }, [availableCurrencies, displayCurrency]);

  const convertToBaseCurrency = useCallback(
    (amount: number | string | null | undefined) => {
      const numeric = typeof amount === 'string' ? Number.parseFloat(amount) : amount ?? 0;
      if (!Number.isFinite(numeric)) return 0;
      const converted = convertAmount(numeric, displayCurrency, BASE_ACTIVITY_CURRENCY);
      return Number.isFinite(converted) ? Number.parseFloat(converted.toFixed(2)) : numeric;
    },
    [convertAmount, displayCurrency]
  );

  const convertFromBaseCurrency = useCallback(
    (amount?: number | null) => {
      if (typeof amount !== 'number' || Number.isNaN(amount)) return 0;
      const converted = convertAmount(amount, BASE_ACTIVITY_CURRENCY, displayCurrency);
      return Number.isFinite(converted) ? Number.parseFloat(converted.toFixed(2)) : amount;
    },
    [convertAmount, displayCurrency]
  );

  const formatPrice = useCallback(
    (amount?: number | null) => {
      if (typeof amount !== 'number' || Number.isNaN(amount)) return '—';
      const converted = convertFromBaseCurrency(amount);
      const displayLabel = formatDisplayCurrency(converted, displayCurrency);
      if (displayCurrency === BASE_ACTIVITY_CURRENCY) {
        return displayLabel;
      }
      const baseLabel = formatDisplayCurrency(amount, BASE_ACTIVITY_CURRENCY);
      return `${displayLabel} · ${baseLabel}`;
    },
    [convertFromBaseCurrency, formatDisplayCurrency, displayCurrency]
  );

  const previousCurrencyRef = useRef(displayCurrency);

  useEffect(() => {
    const previousCurrency = previousCurrencyRef.current;
    if (previousCurrency === displayCurrency) return;

    const recalcAmount = (value?: number) => {
      if (typeof value !== 'number' || Number.isNaN(value)) return value;
      const baseValue = convertAmount(value, previousCurrency, BASE_ACTIVITY_CURRENCY);
      const nextValue = convertAmount(baseValue, BASE_ACTIVITY_CURRENCY, displayCurrency);
      return Number.isFinite(nextValue) ? Number.parseFloat(nextValue.toFixed(2)) : value;
    };

    setEquipmentForm((prev) => {
      if (prev.type !== 'optional') {
        return prev;
      }
      const rentalPrice = recalcAmount(prev.rental_price) ?? 0;
      return { ...prev, rental_price: rentalPrice };
    });

    setPricingForm((prev) => ({
      ...prev,
      base_price: recalcAmount(prev.base_price) ?? 0,
    }));

    previousCurrencyRef.current = displayCurrency;
  }, [convertAmount, displayCurrency]);

  // Form states
  const [equipmentForm, setEquipmentForm] = useState({
    name: '',
    type: 'provided' as 'provided' | 'required' | 'optional',
    description: '',
    is_included_in_price: true,
    rental_price: 0
  });

  const [requirementForm, setRequirementForm] = useState({
    type: 'age_min' as ActivityRequirement['type'],
    value: '',
    description: '',
    is_mandatory: true
  });

  const [timeSlotForm, setTimeSlotForm] = useState({
    day_of_week: 1,
    start_time: '',
    end_time: '',
    duration_minutes: 60,
    max_participants: 10,
    seasonal_start_date: '',
    seasonal_end_date: ''
  });

  const [pricingForm, setPricingForm] = useState({
    participant_type: 'adult' as ActivityPricing['participant_type'],
    base_price: 0,
    min_age: '',
    max_age: '',
    min_group_size: '',
    max_group_size: '',
    seasonal_multiplier: 1,
    weekend_multiplier: 1
  });

  const [editingItem, setEditingItem] = useState<{
    type: 'equipment' | 'requirement' | 'timeSlot' | 'pricing';
    id: string;
  } | null>(null);

  useEffect(() => {
    fetchAllData();
  }, [touristPointId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [equipmentData, requirementsData, timeSlotsData, pricingData, bookingsData] = await Promise.all([
        getActivityEquipment(touristPointId),
        getActivityRequirements(touristPointId),
        getActivityTimeSlots(touristPointId),
        getActivityPricing(touristPointId),
        getActivityBookings(touristPointId)
      ]);

      setEquipment(equipmentData);
      setRequirements(requirementsData);
      setTimeSlots(timeSlotsData);
      setPricing(pricingData);
      setBookings(bookingsData);
    } catch (error) {
      console.error('Error fetching activity data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de l'activité",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetEquipmentForm = () => {
    setEquipmentForm({
      name: '',
      type: 'provided',
      description: '',
      is_included_in_price: true,
      rental_price: 0
    });
  };

  const resetRequirementForm = () => {
    setRequirementForm({
      type: 'age_min',
      value: '',
      description: '',
      is_mandatory: true
    });
  };

  const resetTimeSlotForm = () => {
    setTimeSlotForm({
      day_of_week: 1,
      start_time: '',
      end_time: '',
      duration_minutes: 60,
      max_participants: 10,
      seasonal_start_date: '',
      seasonal_end_date: ''
    });
  };

  const resetPricingForm = () => {
    setPricingForm({
      participant_type: 'adult',
      base_price: 0,
      min_age: '',
      max_age: '',
      min_group_size: '',
      max_group_size: '',
      seasonal_multiplier: 1,
      weekend_multiplier: 1
    });
  };

  const handleSaveEquipment = async () => {
    try {
      const rentalPrice = equipmentForm.type === 'optional'
        ? convertToBaseCurrency(equipmentForm.rental_price)
        : 0;

      const payload = {
        ...equipmentForm,
        rental_price: rentalPrice,
        tourist_point_id: touristPointId
      };

      if (editingItem?.type === 'equipment') {
        await updateActivityEquipment(touristPointId, editingItem.id, payload);
        toast({ title: "Succès", description: "Équipement mis à jour" });
      } else {
        await createActivityEquipment(touristPointId, payload);
        toast({ title: "Succès", description: "Équipement ajouté" });
      }
      
      setEditingItem(null);
      resetEquipmentForm();
      fetchAllData();
    } catch (error) {
      console.error('Error saving equipment:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'équipement",
        variant: "destructive"
      });
    }
  };

  const handleSaveRequirement = async () => {
    try {
      if (editingItem?.type === 'requirement') {
        await updateActivityRequirement(touristPointId, editingItem.id, {
          ...requirementForm,
          tourist_point_id: touristPointId
        });
        toast({ title: "Succès", description: "Prérequis mis à jour" });
      } else {
        await createActivityRequirement(touristPointId, {
          ...requirementForm,
          tourist_point_id: touristPointId
        });
        toast({ title: "Succès", description: "Prérequis ajouté" });
      }
      
      setEditingItem(null);
      resetRequirementForm();
      fetchAllData();
    } catch (error) {
      console.error('Error saving requirement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le prérequis",
        variant: "destructive"
      });
    }
  };

  const handleSaveTimeSlot = async () => {
    try {
      if (editingItem?.type === 'timeSlot') {
        await updateActivityTimeSlot(touristPointId, editingItem.id, {
          ...timeSlotForm,
          tourist_point_id: touristPointId,
          is_active: true
        });
        toast({ title: "Succès", description: "Créneau mis à jour" });
      } else {
        await createActivityTimeSlot(touristPointId, {
          ...timeSlotForm,
          tourist_point_id: touristPointId,
          is_active: true
        });
        toast({ title: "Succès", description: "Créneau ajouté" });
      }
      
      setEditingItem(null);
      resetTimeSlotForm();
      fetchAllData();
    } catch (error) {
      console.error('Error saving time slot:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le créneau",
        variant: "destructive"
      });
    }
  };

  const handleSavePricing = async () => {
    try {
      const pricingData = {
        ...pricingForm,
        base_price: convertToBaseCurrency(pricingForm.base_price),
        tourist_point_id: touristPointId,
        min_age: pricingForm.min_age ? parseInt(pricingForm.min_age) : undefined,
        max_age: pricingForm.max_age ? parseInt(pricingForm.max_age) : undefined,
        min_group_size: pricingForm.min_group_size ? parseInt(pricingForm.min_group_size) : undefined,
        max_group_size: pricingForm.max_group_size ? parseInt(pricingForm.max_group_size) : undefined,
        is_active: true
      };

      if (editingItem?.type === 'pricing') {
        await updateActivityPricing(touristPointId, editingItem.id, pricingData);
        toast({ title: "Succès", description: "Tarif mis à jour" });
      } else {
        await createActivityPricing(touristPointId, pricingData);
        toast({ title: "Succès", description: "Tarif ajouté" });
      }
      
      setEditingItem(null);
      resetPricingForm();
      fetchAllData();
    } catch (error) {
      console.error('Error saving pricing:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le tarif",
        variant: "destructive"
      });
    }
  };

  const startEdit = (type: 'equipment' | 'requirement' | 'timeSlot' | 'pricing', item: any) => {
    setEditingItem({ type, id: item.id });
    
    switch (type) {
      case 'equipment':
        setEquipmentForm({
          name: item.name,
          type: item.type,
          description: item.description ?? '',
          is_included_in_price: Boolean(item.is_included_in_price),
          rental_price: convertFromBaseCurrency(item.rental_price ?? 0)
        });
        break;
      case 'requirement':
        setRequirementForm(item);
        break;
      case 'timeSlot':
        setTimeSlotForm(item);
        break;
      case 'pricing':
        setPricingForm({
          participant_type: item.participant_type,
          base_price: convertFromBaseCurrency(item.base_price),
          min_age: item.min_age !== null && item.min_age !== undefined ? item.min_age.toString() : '',
          max_age: item.max_age !== null && item.max_age !== undefined ? item.max_age.toString() : '',
          min_group_size: item.min_group_size !== null && item.min_group_size !== undefined ? item.min_group_size.toString() : '',
          max_group_size: item.max_group_size !== null && item.max_group_size !== undefined ? item.max_group_size.toString() : '',
          seasonal_multiplier: item.seasonal_multiplier ?? 1,
          weekend_multiplier: item.weekend_multiplier ?? 1
        });
        break;
    }
  };

  const handleDelete = async (type: 'equipment' | 'requirement' | 'timeSlot' | 'pricing', id: string) => {
    try {
      switch (type) {
        case 'equipment':
          await deleteActivityEquipment(touristPointId, id);
          break;
        case 'requirement':
          await deleteActivityRequirement(touristPointId, id);
          break;
        case 'timeSlot':
          await deleteActivityTimeSlot(touristPointId, id);
          break;
        case 'pricing':
          await deleteActivityPricing(touristPointId, id);
          break;
      }
      
      toast({ title: "Succès", description: "Élément supprimé" });
      fetchAllData();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'élément",
        variant: "destructive"
      });
    }
  };

  const updateBookingStatus = async (bookingId: string, status: ActivityBooking['booking_status']) => {
    try {
      await updateActivityBooking(touristPointId, bookingId, { booking_status: status });
      toast({ title: "Succès", description: "Statut de réservation mis à jour" });
      fetchAllData();
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive"
      });
    }
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return days[dayOfWeek];
  };

  if (loading) {
    return <div className="flex justify-center p-8">Chargement...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion de l'activité: {activityName}</h1>
          <p className="text-muted-foreground">Configurez les équipements, créneaux, tarifs et gérez les réservations</p>
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Devise d'affichage</Label>
          <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableCurrencies.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.symbol} · {currency.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="equipment" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="equipment">Équipements</TabsTrigger>
          <TabsTrigger value="requirements">Prérequis</TabsTrigger>
          <TabsTrigger value="timeslots">Créneaux</TabsTrigger>
          <TabsTrigger value="pricing">Tarifs</TabsTrigger>
          <TabsTrigger value="bookings">Réservations</TabsTrigger>
        </TabsList>

        <TabsContent value="equipment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Gestion des équipements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Equipment Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                <div>
                  <Label>Nom de l'équipement</Label>
                  <Input
                    value={equipmentForm.name}
                    onChange={(e) => setEquipmentForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Casque de vélo"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={equipmentForm.type}
                    onValueChange={(value: 'provided' | 'required' | 'optional') => 
                      setEquipmentForm(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="provided">Fourni</SelectItem>
                      <SelectItem value="required">Requis</SelectItem>
                      <SelectItem value="optional">Optionnel (location)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={equipmentForm.description}
                    onChange={(e) => setEquipmentForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description détaillée..."
                  />
                </div>
                {equipmentForm.type === 'optional' && (
                  <>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={equipmentForm.is_included_in_price}
                        onCheckedChange={(checked) => setEquipmentForm(prev => ({ ...prev, is_included_in_price: checked }))}
                      />
                      <Label>Inclus dans le prix</Label>
                    </div>
                    <div>
                      <Label>Prix de location ({displayCurrencySymbol})</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={equipmentForm.rental_price}
                        onChange={(e) => setEquipmentForm(prev => ({ ...prev, rental_price: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </>
                )}
                <div className="md:col-span-2 flex gap-2">
                  <Button onClick={handleSaveEquipment}>
                    {editingItem?.type === 'equipment' ? 'Mettre à jour' : 'Ajouter'}
                  </Button>
                  {editingItem?.type === 'equipment' && (
                    <Button variant="outline" onClick={() => { setEditingItem(null); resetEquipmentForm(); }}>
                      Annuler
                    </Button>
                  )}
                </div>
              </div>

              {/* Equipment List */}
              <div className="space-y-3">
                {equipment.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{item.name}</h4>
                            <Badge variant={
                              item.type === 'provided' ? 'secondary' :
                              item.type === 'required' ? 'destructive' : 'default'
                            }>
                              {item.type === 'provided' ? 'Fourni' :
                               item.type === 'required' ? 'Requis' : 'Optionnel'}
                            </Badge>
                            {item.type === 'optional' && typeof item.rental_price === 'number' && item.rental_price > 0 && (
                              <Badge variant="outline">{formatPrice(item.rental_price)}</Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit('equipment', item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete('equipment', item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Gestion des prérequis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Requirements Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                <div>
                  <Label>Type de prérequis</Label>
                  <Select
                    value={requirementForm.type}
                    onValueChange={(value: ActivityRequirement['type']) => 
                      setRequirementForm(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="age_min">Âge minimum</SelectItem>
                      <SelectItem value="age_max">Âge maximum</SelectItem>
                      <SelectItem value="weight_min">Poids minimum</SelectItem>
                      <SelectItem value="weight_max">Poids maximum</SelectItem>
                      <SelectItem value="fitness_level">Niveau de forme physique</SelectItem>
                      <SelectItem value="medical_condition">Condition médicale</SelectItem>
                      <SelectItem value="experience_required">Expérience requise</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valeur</Label>
                  <Input
                    value={requirementForm.value}
                    onChange={(e) => setRequirementForm(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="Ex: 18, Bonne condition physique..."
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={requirementForm.description}
                    onChange={(e) => setRequirementForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Explication détaillée du prérequis..."
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={requirementForm.is_mandatory}
                    onCheckedChange={(checked) => setRequirementForm(prev => ({ ...prev, is_mandatory: checked }))}
                  />
                  <Label>Obligatoire</Label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveRequirement}>
                    {editingItem?.type === 'requirement' ? 'Mettre à jour' : 'Ajouter'}
                  </Button>
                  {editingItem?.type === 'requirement' && (
                    <Button variant="outline" onClick={() => { setEditingItem(null); resetRequirementForm(); }}>
                      Annuler
                    </Button>
                  )}
                </div>
              </div>

              {/* Requirements List */}
              <div className="space-y-3">
                {requirements.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{item.type.replace(/_/g, ' ').toUpperCase()}</h4>
                            <Badge variant={item.is_mandatory ? 'destructive' : 'secondary'}>
                              {item.is_mandatory ? 'Obligatoire' : 'Recommandé'}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">Valeur: {item.value}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit('requirement', item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete('requirement', item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeslots" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Gestion des créneaux horaires
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Time Slots Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg">
                <div>
                  <Label>Jour de la semaine</Label>
                  <Select
                    value={timeSlotForm.day_of_week.toString()}
                    onValueChange={(value) => setTimeSlotForm(prev => ({ ...prev, day_of_week: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4, 5, 6].map(day => (
                        <SelectItem key={day} value={day.toString()}>
                          {getDayName(day)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Heure de début</Label>
                  <Input
                    type="time"
                    value={timeSlotForm.start_time}
                    onChange={(e) => setTimeSlotForm(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Heure de fin</Label>
                  <Input
                    type="time"
                    value={timeSlotForm.end_time}
                    onChange={(e) => setTimeSlotForm(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Durée (minutes)</Label>
                  <Input
                    type="number"
                    min="15"
                    step="15"
                    value={timeSlotForm.duration_minutes}
                    onChange={(e) => setTimeSlotForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                  />
                </div>
                <div>
                  <Label>Participants max</Label>
                  <Input
                    type="number"
                    min="1"
                    value={timeSlotForm.max_participants}
                    onChange={(e) => setTimeSlotForm(prev => ({ ...prev, max_participants: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div>
                  <Label>Début saison (optionnel)</Label>
                  <Input
                    type="date"
                    value={timeSlotForm.seasonal_start_date}
                    onChange={(e) => setTimeSlotForm(prev => ({ ...prev, seasonal_start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Fin saison (optionnel)</Label>
                  <Input
                    type="date"
                    value={timeSlotForm.seasonal_end_date}
                    onChange={(e) => setTimeSlotForm(prev => ({ ...prev, seasonal_end_date: e.target.value }))}
                  />
                </div>
                <div className="lg:col-span-3 flex gap-2">
                  <Button onClick={handleSaveTimeSlot}>
                    {editingItem?.type === 'timeSlot' ? 'Mettre à jour' : 'Ajouter'}
                  </Button>
                  {editingItem?.type === 'timeSlot' && (
                    <Button variant="outline" onClick={() => { setEditingItem(null); resetTimeSlotForm(); }}>
                      Annuler
                    </Button>
                  )}
                </div>
              </div>

              {/* Time Slots List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {timeSlots.map((slot) => (
                  <Card key={slot.id}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium">{getDayName(slot.day_of_week)}</h4>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit('timeSlot', slot)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete('timeSlot', slot.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm">{slot.start_time} - {slot.end_time}</p>
                        <p className="text-sm text-muted-foreground">
                          {slot.duration_minutes}min • Max {slot.max_participants} pers.
                        </p>
                        {(slot.seasonal_start_date || slot.seasonal_end_date) && (
                          <p className="text-xs text-muted-foreground">
                            Saison: {slot.seasonal_start_date} - {slot.seasonal_end_date}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Gestion des tarifs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pricing Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg">
                <div>
                  <Label>Type de participant</Label>
                  <Select
                    value={pricingForm.participant_type}
                    onValueChange={(value: ActivityPricing['participant_type']) => 
                      setPricingForm(prev => ({ ...prev, participant_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adult">Adulte</SelectItem>
                      <SelectItem value="child">Enfant</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="student">Étudiant</SelectItem>
                      <SelectItem value="group">Groupe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prix de base ({displayCurrencySymbol})</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricingForm.base_price}
                    onChange={(e) => setPricingForm(prev => ({ ...prev, base_price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label>Âge minimum</Label>
                  <Input
                    type="number"
                    min="0"
                    value={pricingForm.min_age}
                    onChange={(e) => setPricingForm(prev => ({ ...prev, min_age: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Âge maximum</Label>
                  <Input
                    type="number"
                    min="0"
                    value={pricingForm.max_age}
                    onChange={(e) => setPricingForm(prev => ({ ...prev, max_age: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Multiplicateur saison</Label>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={pricingForm.seasonal_multiplier}
                    onChange={(e) => setPricingForm(prev => ({ ...prev, seasonal_multiplier: parseFloat(e.target.value) || 1 }))}
                  />
                </div>
                <div>
                  <Label>Multiplicateur week-end</Label>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={pricingForm.weekend_multiplier}
                    onChange={(e) => setPricingForm(prev => ({ ...prev, weekend_multiplier: parseFloat(e.target.value) || 1 }))}
                  />
                </div>
                <div className="lg:col-span-3 flex gap-2">
                  <Button onClick={handleSavePricing}>
                    {editingItem?.type === 'pricing' ? 'Mettre à jour' : 'Ajouter'}
                  </Button>
                  {editingItem?.type === 'pricing' && (
                    <Button variant="outline" onClick={() => { setEditingItem(null); resetPricingForm(); }}>
                      Annuler
                    </Button>
                  )}
                </div>
              </div>

              {/* Pricing List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pricing.map((price) => (
                  <Card key={price.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h4 className="font-medium capitalize">{price.participant_type}</h4>
                          <p className="text-lg font-bold text-primary">{formatPrice(price.base_price)}</p>
                          {(price.min_age || price.max_age) && (
                            <p className="text-sm text-muted-foreground">
                              Âge: {price.min_age || '0'} - {price.max_age || '∞'}
                            </p>
                          )}
                          <div className="text-xs text-muted-foreground">
                            <p>Saison: x{price.seasonal_multiplier}</p>
                            <p>Week-end: x{price.weekend_multiplier}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit('pricing', price)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete('pricing', price.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Réservations ({bookings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{booking.customer_name}</h4>
                            <Badge variant={
                              booking.booking_status === 'confirmed' ? 'default' :
                              booking.booking_status === 'pending' ? 'secondary' :
                              booking.booking_status === 'cancelled' ? 'destructive' : 'outline'
                            }>
                              {booking.booking_status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            📧 {booking.customer_email}
                            {booking.customer_phone && <span> • 📞 {booking.customer_phone}</span>}
                          </p>
                          <p className="text-sm">
                            📅 {booking.booking_date} • 🕒 {booking.start_time} - {booking.end_time}
                          </p>
                          <p className="text-sm">
                            👥 {booking.total_participants} participants 
                            ({booking.adult_participants}A, {booking.child_participants}E, {booking.senior_participants}S)
                          </p>
                          <p className="text-lg font-bold text-primary">{formatPrice(booking.total_amount)}</p>
                          {booking.special_requests && (
                            <p className="text-sm text-muted-foreground">
                              💬 {booking.special_requests}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {booking.booking_status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                              >
                                Confirmer
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                              >
                                Annuler
                              </Button>
                            </>
                          )}
                          {booking.booking_status === 'confirmed' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateBookingStatus(booking.id, 'completed')}
                            >
                              Terminer
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {bookings.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune réservation pour le moment
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
