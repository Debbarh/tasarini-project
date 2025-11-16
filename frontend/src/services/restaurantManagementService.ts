import { apiClient } from '@/integrations/api/client';

const RESTAURANT_SECTION_SLUG = {
  menus: 'menus',
  dishes: 'dishes',
  reservations: 'reservations',
  operatingHours: 'operating-hours',
  tables: 'tables',
} as const;

type RestaurantSection = keyof typeof RESTAURANT_SECTION_SLUG;

const restaurantEndpoint = (restaurantId: string, section: RestaurantSection, itemId?: string) => {
  const slug = RESTAURANT_SECTION_SLUG[section];
  const base = `/poi/tourist-points/${restaurantId}/restaurant/${slug}/`;
  return itemId ? `${base}${itemId}/` : base;
};

const listSection = <T>(
  restaurantId: string,
  section: RestaurantSection,
  searchParams?: Record<string, string | number | boolean | undefined>
) => apiClient.get<T[]>(restaurantEndpoint(restaurantId, section), searchParams);

const createSection = <T>(
  restaurantId: string,
  section: RestaurantSection,
  payload: Record<string, unknown>
) => apiClient.post<T>(restaurantEndpoint(restaurantId, section), payload);

const updateSection = <T>(
  restaurantId: string,
  section: RestaurantSection,
  id: string,
  payload: Record<string, unknown>
) => apiClient.patch<T>(restaurantEndpoint(restaurantId, section, id), payload);

const deleteSection = (
  restaurantId: string,
  section: RestaurantSection,
  id: string
) => apiClient.delete<void>(restaurantEndpoint(restaurantId, section, id));

export interface RestaurantMenu {
  id: string;
  restaurant_id: string;
  menu_type: string;
  name: string;
  description?: string;
  price?: number | null;
  is_available: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
  meal_period?: string | null;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface RestaurantDish {
  id: string;
  restaurant_id: string;
  menu_id?: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  ingredients?: string[];
  allergens?: string[];
  dietary_info?: string[];
  preparation_time_minutes?: number;
  is_available: boolean;
  image_urls?: string[];
  portion_size?: string;
  spiciness_level?: number;
  calories?: number;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface RestaurantReservation {
  id: string;
  restaurant_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  special_requests?: string;
  table_preferences?: string;
  total_amount?: number;
  deposit_amount?: number;
  cancellation_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RestaurantOperatingHours {
  id: string;
  restaurant_id: string;
  day_of_week: number;
  open_time?: string;
  close_time?: string;
  is_closed: boolean;
  break_start?: string;
  break_end?: string;
  last_order_time?: string;
  service_type?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RestaurantTable {
  id: string;
  restaurant_id: string;
  table_number: string;
  capacity: number;
  location?: string;
  is_available: boolean;
  table_type?: string;
  amenities?: string[];
  created_at?: string;
  updated_at?: string;
}

export class RestaurantManagementService {
  // Menu Management
  static async createMenu(menuData: Omit<RestaurantMenu, 'id'>): Promise<RestaurantMenu> {
    if (!menuData.restaurant_id) {
      throw new Error('restaurant_id requis pour créer un menu');
    }
    return createSection<RestaurantMenu>(menuData.restaurant_id, 'menus', menuData);
  }

  static async getMenusByRestaurant(restaurantId: string): Promise<RestaurantMenu[]> {
    const menus = await listSection<RestaurantMenu>(restaurantId, 'menus');
    return (menus || []).sort((a, b) => a.display_order - b.display_order);
  }

  static async updateMenu(restaurantId: string, menuId: string, updates: Partial<RestaurantMenu>): Promise<void> {
    await updateSection<RestaurantMenu>(restaurantId, 'menus', menuId, updates);
  }

  static async deleteMenu(restaurantId: string, menuId: string): Promise<void> {
    await deleteSection(restaurantId, 'menus', menuId);
  }

  // Dish Management
  static async addDishToMenu(dishData: Omit<RestaurantDish, 'id'>): Promise<RestaurantDish> {
    if (!dishData.restaurant_id) {
      throw new Error('restaurant_id requis pour créer un plat');
    }
    return createSection<RestaurantDish>(dishData.restaurant_id, 'dishes', dishData);
  }

  static async getDishesByRestaurant(restaurantId: string): Promise<RestaurantDish[]> {
    const dishes = await listSection<RestaurantDish>(restaurantId, 'dishes');
    return (dishes || []).sort((a, b) => a.display_order - b.display_order);
  }

  static async getDishesByMenu(restaurantId: string, menuId: string): Promise<RestaurantDish[]> {
    const dishes = await listSection<RestaurantDish>(restaurantId, 'dishes', { menu_id: menuId });
    return dishes || [];
  }

  static async updateDish(restaurantId: string, dishId: string, updates: Partial<RestaurantDish>): Promise<void> {
    await updateSection<RestaurantDish>(restaurantId, 'dishes', dishId, updates);
  }

  static async deleteDish(restaurantId: string, dishId: string): Promise<void> {
    await deleteSection(restaurantId, 'dishes', dishId);
  }

  // Reservation Management
  static async createReservation(reservationData: Omit<RestaurantReservation, 'id'>): Promise<RestaurantReservation> {
    if (!reservationData.restaurant_id) {
      throw new Error('restaurant_id requis pour créer une réservation');
    }
    return createSection<RestaurantReservation>(reservationData.restaurant_id, 'reservations', reservationData);
  }

  static async getReservationsByRestaurant(restaurantId: string, date?: string): Promise<RestaurantReservation[]> {
    const params = date ? { reservation_date: date } : undefined;
    const reservations = await listSection<RestaurantReservation>(restaurantId, 'reservations', params);
    return reservations || [];
  }

  static async updateReservationStatus(
    restaurantId: string,
    reservationId: string,
    status: RestaurantReservation['status'],
    reason?: string
  ): Promise<void> {
    const payload: Record<string, unknown> = { status };
    if (reason && status === 'cancelled') {
      payload.cancellation_reason = reason;
    }
    await updateSection<RestaurantReservation>(restaurantId, 'reservations', reservationId, payload);
  }

  // Operating Hours Management
  static async setOperatingHours(
    restaurantId: string,
    hoursData: Array<Omit<RestaurantOperatingHours, 'id'> & { id?: string }>
  ): Promise<void> {
    await Promise.all(
      hoursData.map((hours) => {
        if (hours.id) {
          return updateSection<RestaurantOperatingHours>(restaurantId, 'operatingHours', hours.id, hours);
        }
        return createSection<RestaurantOperatingHours>(restaurantId, 'operatingHours', {
          ...hours,
          restaurant_id: restaurantId,
        });
      })
    );
  }

  static async getOperatingHours(restaurantId: string): Promise<RestaurantOperatingHours[]> {
    const hours = await listSection<RestaurantOperatingHours>(restaurantId, 'operatingHours');
    return hours || [];
  }

  // Table Management
  static async createTable(tableData: Omit<RestaurantTable, 'id'>): Promise<RestaurantTable> {
    if (!tableData.restaurant_id) {
      throw new Error('restaurant_id requis pour créer une table');
    }
    return createSection<RestaurantTable>(tableData.restaurant_id, 'tables', tableData);
  }

  static async getTablesByRestaurant(restaurantId: string): Promise<RestaurantTable[]> {
    const tables = await listSection<RestaurantTable>(restaurantId, 'tables');
    return (tables || []).sort((a, b) => Number(a.table_number) - Number(b.table_number));
  }

  static async updateTableAvailability(restaurantId: string, tableId: string, isAvailable: boolean): Promise<void> {
    await updateSection<RestaurantTable>(restaurantId, 'tables', tableId, { is_available: isAvailable });
  }

  // Analytics & Reports
  static async getBookingStats(restaurantId: string, startDate: string, endDate: string): Promise<any> {
    const reservations = await this.getReservationsByRestaurant(restaurantId);
    const filtered = reservations.filter(
      (reservation) =>
        reservation.reservation_date >= startDate && reservation.reservation_date <= endDate
    );

    const totalReservations = filtered.length;
    const confirmedReservations = filtered.filter((r) => r.status === 'confirmed').length;
    const totalGuests = filtered.reduce((sum, r) => sum + r.party_size, 0);
    const totalRevenue = filtered.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    const averagePartySize = totalReservations ? totalGuests / totalReservations : 0;

    return {
      totalReservations,
      confirmedReservations,
      totalGuests,
      totalRevenue,
      averagePartySize,
      occupancyRate: 0,
    };
  }

  static async calculateRevenue(
    restaurantId: string,
    period: 'day' | 'week' | 'month',
    date: string
  ): Promise<number> {
    let startDate = date;
    let endDate = date;

    if (period === 'week') {
      const dateObj = new Date(date);
      const day = dateObj.getDay();
      const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(dateObj.setDate(diff));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      startDate = start.toISOString().split('T')[0];
      endDate = end.toISOString().split('T')[0];
    } else if (period === 'month') {
      const dateObj = new Date(date);
      startDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1).toISOString().split('T')[0];
      endDate = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).toISOString().split('T')[0];
    }

    const reservations = await this.getReservationsByRestaurant(restaurantId);
    return reservations
      .filter(
        (reservation) =>
          reservation.status === 'completed' &&
          reservation.reservation_date >= startDate &&
          reservation.reservation_date <= endDate
      )
      .reduce((sum, r) => sum + (r.total_amount || 0), 0);
  }

  // Availability Checks
  static async checkAvailability(
    restaurantId: string,
    date: string,
    time: string,
    partySize: number
  ): Promise<{ available: boolean; availableTables: RestaurantTable[] }> {
    const tables = await this.getTablesByRestaurant(restaurantId);
    const suitableTables = tables.filter((table) => table.capacity >= partySize && table.is_available);

    const reservations = await this.getReservationsByRestaurant(restaurantId, date);
    const overlapping = reservations.filter(
      (reservation) =>
        reservation.status !== 'cancelled' &&
        reservation.status !== 'no_show' &&
        reservation.reservation_time === time
    );

    const totalCapacity = suitableTables.reduce((sum, table) => sum + table.capacity, 0);
    const totalReserved = overlapping.reduce((sum, reservation) => sum + reservation.party_size, 0);

    return {
      available: totalCapacity >= totalReserved + partySize,
      availableTables: suitableTables,
    };
  }
}
