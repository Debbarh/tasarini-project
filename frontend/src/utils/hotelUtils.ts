/**
 * Utilitaires pour gérer les données HotelBeds
 */

import { HotelBedsHotel } from '@/services/hotelBedsService';
import { HotelSearchCard, BookingItem } from '@/types/booking';

const HOTELBEDS_IMAGE_BASE_URL = 'https://photos.hotelbeds.com/giata/original/';

const normalizeImagePath = (path?: string): string | null => {
  if (!path) return null;
  return path.startsWith('http') ? path : `${HOTELBEDS_IMAGE_BASE_URL}${path}`;
};

/**
 * Obtient la meilleure image d'un hôtel HotelBeds
 */
export function getBestHotelImage(hotel: HotelBedsHotel): string | null {
  if (!hotel.images || hotel.images.length === 0) return null;

  const images = hotel.images
    .map((img: any) => ({
      ...img,
      imageTypeCode: img.imageTypeCode || img.type,
      path: normalizeImagePath(img.path)
    }))
    .filter((img: any) => !!img.path);

  if (!images.length) return null;

  const priorityOrder = ['HAB', 'GEN', 'RES', 'LOB', 'BAR', 'SPA', 'PIS'];
  for (const type of priorityOrder) {
    const image = images.find((img: any) => img.imageTypeCode === type);
    if (image) return image.path;
  }

  return images[0].path;
}

/**
 * Mapping des codes de facilities HotelBeds en catégories lisibles
 */
export interface FacilityCategory {
  icon: string;
  label: string;
  facilities: string[];
}

export function mapFacilities(facilities: any[]): FacilityCategory[] {
  if (!facilities || facilities.length === 0) {
    return [];
  }

  const categories: Record<string, FacilityCategory> = {
    connectivity: {
      icon: '📶',
      label: 'Connectivité',
      facilities: []
    },
    comfort: {
      icon: '🛏️',
      label: 'Confort',
      facilities: []
    },
    dining: {
      icon: '🍽️',
      label: 'Restauration',
      facilities: []
    },
    leisure: {
      icon: '🏊',
      label: 'Loisirs',
      facilities: []
    },
    services: {
      icon: '🔧',
      label: 'Services',
      facilities: []
    },
    parking: {
      icon: '🅿️',
      label: 'Parking',
      facilities: []
    },
    accessibility: {
      icon: '♿',
      label: 'Accessibilité',
      facilities: []
    }
  };

  // Mapping basique des codes facilities (à enrichir selon la doc HotelBeds)
  facilities.forEach((facility: any) => {
    const code = facility.facilityCode || facility.code;
    const description = facility.description?.content || facility.description || '';

    if (!description) return;

    const lowerDesc = description.toLowerCase();

    if (lowerDesc.includes('wifi') || lowerDesc.includes('internet') || lowerDesc.includes('wi-fi')) {
      categories.connectivity.facilities.push(description);
    } else if (lowerDesc.includes('pool') || lowerDesc.includes('piscine') || lowerDesc.includes('spa') || lowerDesc.includes('gym') || lowerDesc.includes('fitness')) {
      categories.leisure.facilities.push(description);
    } else if (lowerDesc.includes('restaurant') || lowerDesc.includes('bar') || lowerDesc.includes('breakfast') || lowerDesc.includes('petit-déjeuner')) {
      categories.dining.facilities.push(description);
    } else if (lowerDesc.includes('parking') || lowerDesc.includes('garage')) {
      categories.parking.facilities.push(description);
    } else if (lowerDesc.includes('air condition') || lowerDesc.includes('climatisation') || lowerDesc.includes('heating') || lowerDesc.includes('chauffage')) {
      categories.comfort.facilities.push(description);
    } else if (lowerDesc.includes('wheelchair') || lowerDesc.includes('disabled') || lowerDesc.includes('accessible') || lowerDesc.includes('handicapé')) {
      categories.accessibility.facilities.push(description);
    } else {
      categories.services.facilities.push(description);
    }
  });

  // Retourner seulement les catégories non vides
  return Object.values(categories).filter(cat => cat.facilities.length > 0);
}

/**
 * Formate un prix avec la devise appropriée
 */
export function formatHotelPrice(amount: number, currency: string = 'EUR'): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    // Fallback si la devise n'est pas reconnue
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * Génère une URL Google Maps à partir de coordonnées
 */
export function getGoogleMapsUrl(
  coordinates?: { latitude: number; longitude: number } | null,
  hotelName?: string
): string | null {
  if (!coordinates?.latitude || !coordinates?.longitude) {
    return null;
  }

  const { latitude, longitude } = coordinates;
  const query = hotelName ? encodeURIComponent(hotelName) : `${latitude},${longitude}`;

  return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${latitude},${longitude}`;
}

/**
 * Extrait le nombre d'étoiles à partir du categoryCode
 */
export function getStarRating(categoryCode?: string): number {
  if (!categoryCode) return 0;

  const match = categoryCode.match(/\d+/);
  return match ? parseInt(match[0]) : 0;
}

/**
 * Génère un tableau d'étoiles pour l'affichage
 */
export function renderStars(rating: number): string {
  return '⭐'.repeat(Math.min(rating, 5));
}

/**
 * Calcule le nombre de nuits entre deux dates
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Formate une date en format lisible
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch (error) {
    return dateString;
  }
}

/**
 * Convertit un HotelBedsHotel en HotelSearchCard pour l'affichage dans la liste
 */
export function mapHotelToSearchCard(
  hotel: any,
  searchContext: { checkIn: string; checkOut: string; destination: string }
): HotelSearchCard {
  const provider = (hotel.provider || hotel.source || '').toString().toLowerCase() === 'kayak' ? 'Kayak' : 'HotelBeds';

  // Kayak mapping (api returns imageUrl and price.amount)
  if (provider === 'Kayak') {
    const price = hotel.price?.amount ?? hotel.minRate ?? 0;
    const currency = hotel.price?.currency ?? hotel.currency ?? 'EUR';
    const imageUrl = hotel.imageUrl || null;

    return {
      id: hotel.code || hotel.id,
      name: hotel.name,
      categoryCode: hotel.categoryCode,
      categoryName: hotel.categoryName,
      destinationCity: hotel.city || hotel.destination || searchContext.destination,
      destinationCountry: hotel.zoneName || '',
      destinationName: hotel.destinationName,
      zoneName: hotel.zoneName,
      address: hotel.address || hotel.destinationName || '',
      rating: hotel.rating || getStarRating(hotel.categoryCode) || 0,
      price: { amount: price, currency },
      checkInDate: searchContext.checkIn,
      checkOutDate: searchContext.checkOut,
      bookingUrl: hotel.web || hotel.bookingUrl || '',
      provider: 'Kayak',
      imageUrl,
      allImages: hotel.images || [],
      facilities: hotel.facilities || [],
      description: hotel.description || '',
      coordinates: hotel.coordinates,
      web: hotel.web,
      email: hotel.email,
      phones: hotel.phones || [],
      postalCode: hotel.postalCode
    };
  }

  // HotelBeds mapping (par défaut)
  const normalizedImages = (hotel.images || []).map((img: any) => ({
    ...img,
    imageTypeCode: img.imageTypeCode || img.type,
    path: normalizeImagePath(img.path) || ''
  }));
  const hotelWithImages = { ...hotel, images: normalizedImages } as HotelBedsHotel;
  const imageUrl = getBestHotelImage(hotelWithImages);

  return {
    id: hotel.code,
    name: hotel.name,
    categoryCode: hotel.categoryCode,
    categoryName: hotel.categoryName,
    destinationCity: hotel.city?.content || hotel.destinationName || searchContext.destination,
    destinationCountry: hotel.zoneName || hotel.address?.content || '',
    destinationName: hotel.destinationName,
    zoneName: hotel.zoneName,
    address: hotel.address?.content || hotel.destinationName || '',
    rating: getStarRating(hotel.categoryCode) || hotel.ranking || 0,
    price: {
      amount: hotel.minRate ?? 0,
      currency: hotel.currency ?? 'EUR'
    },
    checkInDate: searchContext.checkIn,
    checkOutDate: searchContext.checkOut,
    bookingUrl: hotel.web || `https://www.hotelbeds.com/hotel/${hotel.code}`,
    provider: 'HotelBeds',
    imageUrl,
    allImages: normalizedImages,
    facilities: hotel.facilities || [],
    description: hotel.description || hotel.categoryName || '',
    coordinates: hotel.coordinates,
    web: hotel.web,
    email: hotel.email,
    phones: hotel.phones || [],
    postalCode: hotel.postalCode
  };
}

/**
 * Convertit un HotelBedsHotel en BookingItem pour le système de réservation
 */
export function mapHotelToBookingItem(
  hotel: HotelBedsHotel,
  dates: { start: string; end: string }
): BookingItem {
  return {
    id: hotel.code,
    name: hotel.name,
    description: hotel.description || hotel.categoryName || '',
    price: {
      amount: hotel.minRate ?? 0,
      currency: hotel.currency ?? 'EUR'
    },
    bookingUrl: hotel.web || `https://www.hotelbeds.com/hotel/${hotel.code}`,
    sourceType: 'external',
    sourceProvider: 'HotelBeds',
    // Données supplémentaires pour le contexte
    hotelCode: hotel.code,
    categoryCode: hotel.categoryCode,
    categoryName: hotel.categoryName,
    checkInDate: dates.start,
    checkOutDate: dates.end,
    coordinates: hotel.coordinates,
    address: hotel.address?.content,
    city: hotel.city?.content,
    destinationName: hotel.destinationName,
    zoneName: hotel.zoneName
  };
}
