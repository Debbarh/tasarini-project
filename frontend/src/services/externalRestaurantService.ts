export interface ExternalRestaurant {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  priceRange: string;
  rating: number;
  location: {
    address: string;
    city: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  contact: {
    phone?: string;
    website?: string;
  };
  images: string[];
  openingHours?: string;
  reservationUrl?: string;
  source: 'google_places' | 'yelp' | 'internal';
}

interface GooglePlacesSearchParams {
  query: string;
  location?: string;
  radius?: number;
  type?: string;
  priceLevel?: number;
}

class ExternalRestaurantService {
  async searchRestaurants(
    city: string,
    cuisine?: string,
    priceRange?: string,
    limit: number = 3
  ): Promise<ExternalRestaurant[]> {
    try {
      // Pour l'instant, simuler des données Google Places
      // TODO: Implémenter la vraie API Google Places
      const mockRestaurants = this.generateMockRestaurants(city, cuisine, priceRange, limit);
      return mockRestaurants;
    } catch (error) {
      console.error('Error searching restaurants:', error);
      return [];
    }
  }

  async searchNearbyRestaurants(
    latitude: number,
    longitude: number,
    radius: number = 1000,
    cuisine?: string,
    limit: number = 3
  ): Promise<ExternalRestaurant[]> {
    try {
      // TODO: Implémenter la recherche par géolocalisation
      const mockRestaurants = this.generateMockRestaurantsByLocation(latitude, longitude, cuisine, limit);
      return mockRestaurants;
    } catch (error) {
      console.error('Error searching nearby restaurants:', error);
      return [];
    }
  }

  private generateMockRestaurants(
    city: string,
    cuisine?: string,
    priceRange?: string,
    limit: number = 3
  ): ExternalRestaurant[] {
    const cuisines = ['française', 'italienne', 'japonaise', 'indienne', 'mexicaine', 'thaïlandaise'];
    const selectedCuisine = cuisine || cuisines[Math.floor(Math.random() * cuisines.length)];
    
    const restaurants: ExternalRestaurant[] = [];
    
    for (let i = 0; i < limit; i++) {
      restaurants.push({
        id: `ext_restaurant_${city}_${i}`,
        name: this.generateRestaurantName(selectedCuisine, i),
        description: `Restaurant ${selectedCuisine} authentique au cœur de ${city}. Spécialités traditionnelles et ambiance chaleureuse.`,
        cuisine: selectedCuisine,
        priceRange: priceRange || ['€', '€€', '€€€'][Math.floor(Math.random() * 3)],
        rating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
        location: {
          address: `${Math.floor(Math.random() * 100)} Rue ${this.getRandomStreetName()}, ${city}`,
          city,
          country: 'France', // Par défaut
          latitude: 48.8566 + (Math.random() - 0.5) * 0.1, // Paris + variation
          longitude: 2.3522 + (Math.random() - 0.5) * 0.1
        },
        contact: {
          phone: `+33 1 ${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 90 + 10)}`,
          website: `https://restaurant-${selectedCuisine}-${city.toLowerCase()}.fr`
        },
        images: [
          `https://images.unsplash.com/photo-151747${Math.floor(Math.random() * 1000)}?w=400&h=300&fit=crop`,
        ],
        openingHours: 'Lun-Dim: 12h-14h30, 19h-23h',
        reservationUrl: `https://booking.restaurant-${selectedCuisine}-${city.toLowerCase()}.fr`,
        source: 'google_places'
      });
    }
    
    return restaurants;
  }

  private generateMockRestaurantsByLocation(
    latitude: number,
    longitude: number,
    cuisine?: string,
    limit: number = 3
  ): ExternalRestaurant[] {
    // Pour l'instant, utiliser une ville générique
    return this.generateMockRestaurants('Local Area', cuisine, undefined, limit);
  }

  private generateRestaurantName(cuisine: string, index: number): string {
    const namePatterns = {
      française: ['Le Petit Bistrot', 'Chez Antoine', 'La Table du Chef'],
      italienne: ['Villa Roma', 'Pasta Bene', 'Il Giardino'],
      japonaise: ['Sakura Sushi', 'Tokyo Garden', 'Ramen House'],
      indienne: ['Taj Mahal', 'Spice Route', 'Bombay Palace'],
      mexicaine: ['Casa Miguel', 'El Sombrero', 'Fiesta Loca'],
      thaïlandaise: ['Bangkok Garden', 'Thai Orchid', 'Mango Tree']
    };
    
    const names = namePatterns[cuisine as keyof typeof namePatterns] || ['Restaurant Local', 'Bon Appétit', 'Saveurs du Monde'];
    return names[index] || `${names[0]} ${index + 1}`;
  }

  private getRandomStreetName(): string {
    const streetNames = [
      'de la République', 'des Arts', 'du Commerce', 'de la Paix', 'Saint-Antoine',
      'Victor Hugo', 'de Rivoli', 'Montmartre', 'des Champs'
    ];
    return streetNames[Math.floor(Math.random() * streetNames.length)];
  }

  // Méthode pour mixer avec les restaurants partenaires internes
  async getMixedRestaurants(
    city: string,
    cuisine?: string,
    priceRange?: string
  ): Promise<ExternalRestaurant[]> {
    const externalRestaurants = await this.searchRestaurants(city, cuisine, priceRange, 2);
    
    // TODO: Récupérer aussi les restaurants partenaires internes
    // const internalRestaurants = await this.getInternalRestaurants(city, cuisine, priceRange, 1);
    
    return externalRestaurants; // + internalRestaurants
  }
}

export const externalRestaurantService = new ExternalRestaurantService();
