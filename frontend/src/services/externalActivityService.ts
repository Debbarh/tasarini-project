export interface ExternalActivity {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  duration: string;
  price: {
    amount: number;
    currency: string;
  };
  rating: number;
  location: {
    address: string;
    city: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  provider: {
    name: string;
    website?: string;
  };
  images: string[];
  difficulty?: 'facile' | 'modéré' | 'difficile';
  groupSize?: {
    min: number;
    max: number;
  };
  inclusions: string[];
  exclusions: string[];
  cancellationPolicy?: string;
  bookingUrl?: string;
  source: 'viator' | 'getyourguide' | 'internal';
}

interface ActivitySearchParams {
  destination: string;
  category?: string;
  priceRange?: string;
  duration?: string;
  date?: string;
}

class ExternalActivityService {
  async searchActivities(
    city: string,
    category?: string,
    type?: string,
    limit: number = 3
  ): Promise<ExternalActivity[]> {
    try {
      // Pour l'instant, simuler des données Viator/GetYourGuide
      // TODO: Implémenter les vraies APIs
      const mockActivities = this.generateMockActivities(city, category, type, limit);
      return mockActivities;
    } catch (error) {
      console.error('Error searching activities:', error);
      return [];
    }
  }

  async searchNearbyActivities(
    latitude: number,
    longitude: number,
    radius: number = 5000,
    category?: string,
    limit: number = 3
  ): Promise<ExternalActivity[]> {
    try {
      // TODO: Implémenter la recherche par géolocalisation
      const mockActivities = this.generateMockActivitiesByLocation(latitude, longitude, category, limit);
      return mockActivities;
    } catch (error) {
      console.error('Error searching nearby activities:', error);
      return [];
    }
  }

  private generateMockActivities(
    city: string,
    category?: string,
    type?: string,
    limit: number = 3
  ): ExternalActivity[] {
    const categories = ['culture', 'aventure', 'nature', 'gastronomie', 'sport', 'bien-être'];
    const selectedCategory = category || categories[Math.floor(Math.random() * categories.length)];
    
    const activities: ExternalActivity[] = [];
    
    for (let i = 0; i < limit; i++) {
      activities.push({
        id: `ext_activity_${city}_${i}`,
        name: this.generateActivityName(selectedCategory, city, i),
        description: this.generateActivityDescription(selectedCategory, city),
        category: selectedCategory,
        type: type || this.getActivityType(selectedCategory),
        duration: this.getRandomDuration(),
        price: {
          amount: Math.floor(Math.random() * 200 + 50),
          currency: 'EUR'
        },
        rating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
        location: {
          address: `${Math.floor(Math.random() * 100)} ${this.getRandomLocationName(selectedCategory)}, ${city}`,
          city,
          country: 'France', // Par défaut
          latitude: 48.8566 + (Math.random() - 0.5) * 0.1,
          longitude: 2.3522 + (Math.random() - 0.5) * 0.1
        },
        provider: {
          name: ['Viator', 'GetYourGuide', 'City Discovery'][Math.floor(Math.random() * 3)],
          website: 'https://booking-provider.com'
        },
        images: [
          `https://images.unsplash.com/photo-${1500000000 + Math.floor(Math.random() * 100000000)}?w=400&h=300&fit=crop`,
        ],
        difficulty: ['facile', 'modéré', 'difficile'][Math.floor(Math.random() * 3)] as any,
        groupSize: {
          min: 1,
          max: Math.floor(Math.random() * 20 + 5)
        },
        inclusions: this.getActivityInclusions(selectedCategory),
        exclusions: ['Transport personnel', 'Pourboires', 'Repas non mentionnés'],
        cancellationPolicy: 'Annulation gratuite jusqu\'à 24h avant le début',
        bookingUrl: `https://booking.provider.com/activity/${city.toLowerCase()}-${selectedCategory}`,
        source: 'viator'
      });
    }
    
    return activities;
  }

  private generateMockActivitiesByLocation(
    latitude: number,
    longitude: number,
    category?: string,
    limit: number = 3
  ): ExternalActivity[] {
    return this.generateMockActivities('Local Area', category, undefined, limit);
  }

  private generateActivityName(category: string, city: string, index: number): string {
    const namePatterns = {
      culture: [`Visite guidée de ${city}`, `Musées incontournables de ${city}`, `Art et Histoire de ${city}`],
      aventure: [`Parcours aventure ${city}`, `Exploration urbaine ${city}`, `Chasse au trésor ${city}`],
      nature: [`Parcs et jardins de ${city}`, `Balade nature ${city}`, `Découverte écologique ${city}`],
      gastronomie: [`Tour gastronomique ${city}`, `Dégustation locale ${city}`, `Cours de cuisine ${city}`],
      sport: [`Activités sportives ${city}`, `Course à pied ${city}`, `Vélo tour ${city}`],
      'bien-être': [`Spa et détente ${city}`, `Yoga en plein air ${city}`, `Massage traditionnel ${city}`]
    };
    
    const names = namePatterns[category as keyof typeof namePatterns] || [`Activité ${city}`, `Expérience ${city}`, `Découverte ${city}`];
    return names[index] || `${names[0]} ${index + 1}`;
  }

  private generateActivityDescription(category: string, city: string): string {
    const descriptions = {
      culture: `Découvrez les trésors culturels de ${city} avec un guide expert. Une expérience immersive dans l'histoire et l'art local.`,
      aventure: `Vivez une aventure inoubliable au cœur de ${city}. Parfait pour les amateurs de sensations fortes et de découvertes.`,
      nature: `Explorez les espaces verts et naturels de ${city}. Une bouffée d'air frais en pleine ville.`,
      gastronomie: `Savourez les spécialités locales de ${city}. Un voyage culinaire authentique et délicieux.`,
      sport: `Restez actif durant votre séjour à ${city}. Activités sportives adaptées à tous les niveaux.`,
      'bien-être': `Détendez-vous et ressourcez-vous à ${city}. Des moments de pure relaxation vous attendent.`
    };
    
    return descriptions[category as keyof typeof descriptions] || `Découvrez ${city} d'une manière unique et authentique.`;
  }

  private getActivityType(category: string): string {
    const types = {
      culture: 'visite',
      aventure: 'outdoor',
      nature: 'découverte',
      gastronomie: 'dégustation',
      sport: 'activité physique',
      'bien-être': 'relaxation'
    };
    
    return types[category as keyof typeof types] || 'expérience';
  }

  private getRandomDuration(): string {
    const durations = ['2h', '3h', '4h', '1/2 journée', '1 journée', '2-3h'];
    return durations[Math.floor(Math.random() * durations.length)];
  }

  private getRandomLocationName(category: string): string {
    const locations = {
      culture: ['Place du Centre', 'Quartier Historique', 'Avenue des Arts'],
      aventure: ['Parc Aventure', 'Zone d\'Activités', 'Base de Loisirs'],
      nature: ['Parc National', 'Jardin Botanique', 'Réserve Naturelle'],
      gastronomie: ['Marché Central', 'Quartier Gourmand', 'Rue des Saveurs'],
      sport: ['Centre Sportif', 'Base Nautique', 'Terrain de Sport'],
      'bien-être': ['Centre Spa', 'Institut de Beauté', 'Espace Détente']
    };
    
    const categoryLocations = locations[category as keyof typeof locations] || ['Centre-Ville', 'Place Principale', 'Zone Touristique'];
    return categoryLocations[Math.floor(Math.random() * categoryLocations.length)];
  }

  private getActivityInclusions(category: string): string[] {
    const inclusions = {
      culture: ['Guide expert', 'Entrées aux sites', 'Documentation'],
      aventure: ['Équipement de sécurité', 'Encadrement professionnel', 'Assurance'],
      nature: ['Guide naturaliste', 'Matériel d\'observation', 'Collation'],
      gastronomie: ['Dégustations', 'Explications culinaires', 'Recettes'],
      sport: ['Matériel sportif', 'Encadrement', 'Échauffement'],
      'bien-être': ['Accès aux installations', 'Produits de soins', 'Boissons']
    };
    
    return inclusions[category as keyof typeof inclusions] || ['Guide', 'Matériel', 'Accueil'];
  }

  // Méthode pour mixer avec les activités partenaires internes
  async getMixedActivities(
    city: string,
    category?: string,
    type?: string
  ): Promise<ExternalActivity[]> {
    const externalActivities = await this.searchActivities(city, category, type, 2);
    
    // TODO: Récupérer aussi les activités partenaires internes
    // const internalActivities = await this.getInternalActivities(city, category, type, 1);
    
    return externalActivities; // + internalActivities
  }
}

export const externalActivityService = new ExternalActivityService();
