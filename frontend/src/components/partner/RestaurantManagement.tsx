import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { toast } from '@/hooks/use-toast';
import { 
  RestaurantManagementService, 
  RestaurantMenu, 
  RestaurantDish, 
  RestaurantReservation,
  RestaurantOperatingHours,
  RestaurantTable
} from '@/services/restaurantManagementService';
import {
  ChefHat,
  Clock,
  Calendar as CalendarIcon,
  Users,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  MapPin
} from 'lucide-react';
import { useCurrencySettings } from '@/hooks/useCurrencySettings';

interface RestaurantManagementProps {
  restaurantId: string;
}

const BASE_RESTAURANT_CURRENCY = 'EUR' as const;

export const RestaurantManagement: React.FC<RestaurantManagementProps> = ({ restaurantId }) => {
  const [menus, setMenus] = useState<RestaurantMenu[]>([]);
  const [dishes, setDishes] = useState<RestaurantDish[]>([]);
  const [reservations, setReservations] = useState<RestaurantReservation[]>([]);
  const [operatingHours, setOperatingHours] = useState<RestaurantOperatingHours[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

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
      const converted = convertAmount(numeric, displayCurrency, BASE_RESTAURANT_CURRENCY);
      return Number.isFinite(converted) ? Number.parseFloat(converted.toFixed(2)) : numeric;
    },
    [convertAmount, displayCurrency]
  );

  const convertFromBaseCurrency = useCallback(
    (amount?: number | null) => {
      if (typeof amount !== 'number' || Number.isNaN(amount)) return 0;
      const converted = convertAmount(amount, BASE_RESTAURANT_CURRENCY, displayCurrency);
      return Number.isFinite(converted) ? Number.parseFloat(converted.toFixed(2)) : amount;
    },
    [convertAmount, displayCurrency]
  );

  const formatPrice = useCallback(
    (amount?: number | null) => {
      if (typeof amount !== 'number' || Number.isNaN(amount)) return '—';
      const displayValue = convertFromBaseCurrency(amount);
      const displayLabel = formatDisplayCurrency(displayValue, displayCurrency);
      if (displayCurrency === BASE_RESTAURANT_CURRENCY) {
        return displayLabel;
      }
      const baseLabel = formatDisplayCurrency(amount, BASE_RESTAURANT_CURRENCY);
      return `${displayLabel} · ${baseLabel}`;
    },
    [convertFromBaseCurrency, formatDisplayCurrency, displayCurrency]
  );

  const previousCurrencyRef = useRef(displayCurrency);

  // Form states
  const [newMenu, setNewMenu] = useState<Partial<RestaurantMenu>>({ price: undefined });
  const [newDish, setNewDish] = useState<Partial<RestaurantDish>>({ price: undefined });
  const [newTable, setNewTable] = useState<Partial<RestaurantTable>>({});

  useEffect(() => {
    const previousCurrency = previousCurrencyRef.current;
    if (previousCurrency === displayCurrency) return;

    const recalcAmount = (value?: number) => {
      if (typeof value !== 'number' || Number.isNaN(value)) return value;
      const baseValue = convertAmount(value, previousCurrency, BASE_RESTAURANT_CURRENCY);
      const nextValue = convertAmount(baseValue, BASE_RESTAURANT_CURRENCY, displayCurrency);
      return Number.isFinite(nextValue) ? Number.parseFloat(nextValue.toFixed(2)) : value;
    };

    setNewMenu((prev) => ({
      ...prev,
      price: prev.price !== undefined ? recalcAmount(prev.price) ?? prev.price : prev.price,
    }));

    setNewDish((prev) => ({
      ...prev,
      price: prev.price !== undefined ? recalcAmount(prev.price) ?? prev.price : prev.price,
    }));

    previousCurrencyRef.current = displayCurrency;
  }, [convertAmount, displayCurrency]);

  useEffect(() => {
    loadRestaurantData();
  }, [restaurantId]);

  const loadRestaurantData = async () => {
    try {
      setLoading(true);
      const [menusData, dishesData, reservationsData, hoursData, tablesData] = await Promise.all([
        RestaurantManagementService.getMenusByRestaurant(restaurantId),
        RestaurantManagementService.getDishesByRestaurant(restaurantId),
        RestaurantManagementService.getReservationsByRestaurant(restaurantId),
        RestaurantManagementService.getOperatingHours(restaurantId),
        RestaurantManagementService.getTablesByRestaurant(restaurantId)
      ]);

      setMenus(menusData);
      setDishes(dishesData);
      setReservations(reservationsData);
      setOperatingHours(hoursData);
      setTables(tablesData);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du restaurant",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMenu = async () => {
    if (!newMenu.name || !newMenu.menu_type) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    try {
      const basePrice = typeof newMenu.price === 'number' && Number.isFinite(newMenu.price)
        ? convertToBaseCurrency(newMenu.price)
        : undefined;

      await RestaurantManagementService.createMenu({
        restaurant_id: restaurantId,
        name: newMenu.name,
        menu_type: newMenu.menu_type as any,
        description: newMenu.description || '',
        price: basePrice,
        is_available: true,
        display_order: menus.length
      });

      setNewMenu({ price: undefined });
      loadRestaurantData();
      toast({
        title: "Succès",
        description: "Menu créé avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la création du menu",
        variant: "destructive"
      });
    }
  };

  const handleCreateDish = async () => {
    if (!newDish.name || newDish.price === undefined || Number.isNaN(newDish.price) || !newDish.category) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    try {
      const basePrice = convertToBaseCurrency(newDish.price);
      await RestaurantManagementService.addDishToMenu({
        restaurant_id: restaurantId,
        name: newDish.name,
        price: basePrice,
        category: newDish.category as any,
        description: newDish.description || '',
        is_available: true,
        display_order: dishes.length,
        ingredients: newDish.ingredients || [],
        allergens: newDish.allergens || [],
        dietary_info: newDish.dietary_info || []
      });

      setNewDish({ price: undefined });
      loadRestaurantData();
      toast({
        title: "Succès",
        description: "Plat créé avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la création du plat",
        variant: "destructive"
      });
    }
  };

  const handleCreateTable = async () => {
    if (!newTable.table_number || !newTable.capacity) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    try {
      await RestaurantManagementService.createTable({
        restaurant_id: restaurantId,
        table_number: newTable.table_number,
        capacity: newTable.capacity,
        location: newTable.location as any,
        table_type: newTable.table_type as any,
        is_available: true,
        amenities: newTable.amenities || []
      });

      setNewTable({});
      loadRestaurantData();
      toast({
        title: "Succès",
        description: "Table créée avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la création de la table",
        variant: "destructive"
      });
    }
  };

  const handleReservationStatusUpdate = async (reservationId: string, status: RestaurantReservation['status']) => {
    try {
      await RestaurantManagementService.updateReservationStatus(restaurantId, reservationId, status);
      loadRestaurantData();
      toast({
        title: "Succès",
        description: "Statut de réservation mis à jour"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl font-bold">Gestion Restaurant</h1>
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

      <Tabs defaultValue="menus" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="menus" className="flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Menus & Plats
          </TabsTrigger>
          <TabsTrigger value="reservations" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Réservations
          </TabsTrigger>
          <TabsTrigger value="tables" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Tables
          </TabsTrigger>
          <TabsTrigger value="hours" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Horaires
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="menus" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Créer un nouveau menu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="menu-name">Nom du menu</Label>
                  <Input
                    id="menu-name"
                    value={newMenu.name || ''}
                    onChange={(e) => setNewMenu({...newMenu, name: e.target.value})}
                    placeholder="Menu du jour"
                  />
                </div>
                <div>
                  <Label htmlFor="menu-type">Type de menu</Label>
                  <Select 
                    value={newMenu.menu_type} 
                    onValueChange={(value) => setNewMenu({...newMenu, menu_type: value as any})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a_la_carte">À la carte</SelectItem>
                      <SelectItem value="menu_fixe">Menu fixe</SelectItem>
                      <SelectItem value="buffet">Buffet</SelectItem>
                      <SelectItem value="brunch">Brunch</SelectItem>
                      <SelectItem value="petit_dejeuner">Petit déjeuner</SelectItem>
                      <SelectItem value="dejeuner">Déjeuner</SelectItem>
                      <SelectItem value="diner">Dîner</SelectItem>
                      <SelectItem value="boissons">Boissons</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="menu-description">Description</Label>
                <Textarea
                  id="menu-description"
                  value={newMenu.description || ''}
                  onChange={(e) => setNewMenu({...newMenu, description: e.target.value})}
                  placeholder="Description du menu..."
                />
              </div>
              <div>
                <Label htmlFor="menu-price">Prix ({displayCurrencySymbol})</Label>
                <Input
                  id="menu-price"
                  type="number"
                  value={newMenu.price ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewMenu({
                      ...newMenu,
                      price: value === '' ? undefined : Number.parseFloat(value),
                    });
                  }}
                  placeholder="0.00"
                />
              </div>
              <Button onClick={handleCreateMenu} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Créer le menu
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ajouter un plat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dish-name">Nom du plat</Label>
                  <Input
                    id="dish-name"
                    value={newDish.name || ''}
                    onChange={(e) => setNewDish({...newDish, name: e.target.value})}
                    placeholder="Salade César"
                  />
                </div>
                <div>
                  <Label htmlFor="dish-price">Prix ({displayCurrencySymbol})</Label>
                  <Input
                    id="dish-price"
                    type="number"
                    value={newDish.price ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewDish({
                        ...newDish,
                        price: value === '' ? undefined : Number.parseFloat(value),
                      });
                    }}
                    placeholder="15.50"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="dish-category">Catégorie</Label>
                <Select 
                  value={newDish.category} 
                  onValueChange={(value) => setNewDish({...newDish, category: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entree">Entrée</SelectItem>
                    <SelectItem value="plat_principal">Plat principal</SelectItem>
                    <SelectItem value="dessert">Dessert</SelectItem>
                    <SelectItem value="boisson">Boisson</SelectItem>
                    <SelectItem value="accompagnement">Accompagnement</SelectItem>
                    <SelectItem value="sauce">Sauce</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dish-description">Description</Label>
                <Textarea
                  id="dish-description"
                  value={newDish.description || ''}
                  onChange={(e) => setNewDish({...newDish, description: e.target.value})}
                  placeholder="Description du plat..."
                />
              </div>
              <Button onClick={handleCreateDish} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter le plat
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <h3 className="text-xl font-semibold">Menus existants</h3>
            {menus.map((menu) => (
              <Card key={menu.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{menu.name}</h4>
                      <p className="text-sm text-muted-foreground">{menu.description}</p>
                      <Badge variant="outline">{menu.menu_type}</Badge>
                      {typeof menu.price === 'number' && (
                        <span className="ml-2 font-medium">{formatPrice(menu.price)}</span>
                      )}
                    </div>
                    <Switch checked={menu.is_available} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4">
            <h3 className="text-xl font-semibold">Plats existants</h3>
            {dishes.map((dish) => (
              <Card key={dish.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{dish.name}</h4>
                      <p className="text-sm text-muted-foreground">{dish.description}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{dish.category}</Badge>
                        <span className="font-medium">{formatPrice(dish.price)}</span>
                      </div>
                    </div>
                    <Switch checked={dish.is_available} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reservations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Sélectionner une date</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Réservations du {selectedDate.toLocaleDateString('fr-FR')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reservations
                    .filter(r => r.reservation_date === selectedDate.toISOString().split('T')[0])
                    .map((reservation) => (
                    <div key={reservation.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{reservation.customer_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {reservation.reservation_time} - {reservation.party_size} personnes
                          </p>
                          <p className="text-sm">{reservation.customer_email}</p>
                          {typeof reservation.total_amount === 'number' && (
                            <p className="text-sm font-semibold text-primary">{formatPrice(reservation.total_amount)}</p>
                          )}
                          {typeof reservation.deposit_amount === 'number' && (
                            <p className="text-xs text-muted-foreground">Acompte: {formatPrice(reservation.deposit_amount)}</p>
                          )}
                          {reservation.special_requests && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Demandes spéciales: {reservation.special_requests}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Badge 
                            variant={
                              reservation.status === 'confirmed' ? 'default' :
                              reservation.status === 'pending' ? 'secondary' :
                              reservation.status === 'cancelled' ? 'destructive' : 'outline'
                            }
                          >
                            {reservation.status}
                          </Badge>
                          {reservation.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReservationStatusUpdate(reservation.id, 'confirmed')}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReservationStatusUpdate(reservation.id, 'cancelled')}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tables" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ajouter une table</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="table-number">Numéro de table</Label>
                  <Input
                    id="table-number"
                    value={newTable.table_number || ''}
                    onChange={(e) => setNewTable({...newTable, table_number: e.target.value})}
                    placeholder="Table 1"
                  />
                </div>
                <div>
                  <Label htmlFor="table-capacity">Capacité</Label>
                  <Input
                    id="table-capacity"
                    type="number"
                    value={newTable.capacity || ''}
                    onChange={(e) => setNewTable({...newTable, capacity: parseInt(e.target.value)})}
                    placeholder="4"
                  />
                </div>
                <div>
                  <Label htmlFor="table-location">Emplacement</Label>
                  <Select 
                    value={newTable.location} 
                    onValueChange={(value) => setNewTable({...newTable, location: value as any})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Emplacement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="terrasse">Terrasse</SelectItem>
                      <SelectItem value="interieur">Intérieur</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="salon_prive">Salon privé</SelectItem>
                      <SelectItem value="jardin">Jardin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreateTable} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter la table
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <h3 className="text-xl font-semibold">Tables existantes</h3>
            {tables.map((table) => (
              <Card key={table.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{table.table_number}</h4>
                      <p className="text-sm text-muted-foreground">
                        Capacité: {table.capacity} personnes • {table.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={table.is_available ? 'default' : 'secondary'}>
                        {table.is_available ? 'Disponible' : 'Occupée'}
                      </Badge>
                      <Switch 
                        checked={table.is_available}
                        onCheckedChange={(checked) => 
                          RestaurantManagementService.updateTableAvailability(restaurantId, table.id, checked)
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="hours" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Horaires d'ouverture</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Configuration des horaires d'ouverture à venir...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Réservations aujourd'hui</p>
                    <p className="text-2xl font-bold">
                      {reservations.filter(r => r.reservation_date === new Date().toISOString().split('T')[0]).length}
                    </p>
                  </div>
                  <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tables totales</p>
                    <p className="text-2xl font-bold">{tables.length}</p>
                  </div>
                  <MapPin className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Menus actifs</p>
                    <p className="text-2xl font-bold">{menus.filter(m => m.is_available).length}</p>
                  </div>
                  <ChefHat className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Plats disponibles</p>
                    <p className="text-2xl font-bold">{dishes.filter(d => d.is_available).length}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
