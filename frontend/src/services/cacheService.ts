export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  key: string;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  persistent?: boolean; // Store in localStorage
  prefix?: string;
}

export class CacheService {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private readonly DEFAULT_TTL = 60 * 60 * 1000; // 1 heure
  private readonly MAX_MEMORY_ENTRIES = 500;
  private readonly PERSISTENT_PREFIX = 'travel_cache_';

  /**
   * Stocke une valeur dans le cache
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const {
      ttl = this.DEFAULT_TTL,
      persistent = false,
      prefix = ''
    } = options;

    const fullKey = prefix + key;
    const now = Date.now();
    const expiresAt = now + ttl;

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt,
      key: fullKey
    };

    // Cache en mémoire
    this.memoryCache.set(fullKey, entry);
    this.cleanupMemoryCache();

    // Cache persistant si demandé
    if (persistent) {
      try {
        localStorage.setItem(
          this.PERSISTENT_PREFIX + fullKey,
          JSON.stringify(entry)
        );
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde en cache persistant:', error);
      }
    }
  }

  /**
   * Récupère une valeur du cache
   */
  get<T>(key: string, options: CacheOptions = {}): T | null {
    const { prefix = '' } = options;
    const fullKey = prefix + key;

    // Vérifier d'abord le cache mémoire
    let entry = this.memoryCache.get(fullKey);

    // Si pas trouvé et cache persistant activé, vérifier localStorage
    if (!entry && options.persistent) {
      try {
        const stored = localStorage.getItem(this.PERSISTENT_PREFIX + fullKey);
        if (stored) {
          entry = JSON.parse(stored);
          // Remettre en cache mémoire
          if (entry && !this.isExpired(entry)) {
            this.memoryCache.set(fullKey, entry);
          }
        }
      } catch (error) {
        console.warn('Erreur lors de la lecture du cache persistant:', error);
      }
    }

    // Vérifier si l'entrée est expirée
    if (!entry || this.isExpired(entry)) {
      this.delete(fullKey, options);
      return null;
    }

    return entry.data;
  }

  /**
   * Supprime une entrée du cache
   */
  delete(key: string, options: CacheOptions = {}): void {
    const { prefix = '' } = options;
    const fullKey = prefix + key;

    this.memoryCache.delete(fullKey);

    if (options.persistent) {
      try {
        localStorage.removeItem(this.PERSISTENT_PREFIX + fullKey);
      } catch (error) {
        console.warn('Erreur lors de la suppression du cache persistant:', error);
      }
    }
  }

  /**
   * Vérifie si une clé existe dans le cache (et n'est pas expirée)
   */
  has(key: string, options: CacheOptions = {}): boolean {
    return this.get(key, options) !== null;
  }

  /**
   * Vide complètement le cache
   */
  clear(options: { persistent?: boolean } = {}): void {
    this.memoryCache.clear();

    if (options.persistent) {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(this.PERSISTENT_PREFIX)) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('Erreur lors du nettoyage du cache persistant:', error);
      }
    }
  }

  /**
   * Récupère ou calcule une valeur (pattern cache-aside)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T> | T,
    options: CacheOptions = {}
  ): Promise<T> {
    // Tentative de récupération depuis le cache
    const cached = this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Exécuter la fonction de récupération
    const data = await fetcher();
    
    // Stocker en cache
    this.set(key, data, options);
    
    return data;
  }

  /**
   * Invalide toutes les entrées qui correspondent à un pattern
   */
  invalidatePattern(pattern: RegExp, options: CacheOptions = {}): void {
    // Invalider le cache mémoire
    for (const [key] of this.memoryCache) {
      if (pattern.test(key)) {
        this.memoryCache.delete(key);
      }
    }

    // Invalider le cache persistant si demandé
    if (options.persistent) {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(this.PERSISTENT_PREFIX) && 
              pattern.test(key.substring(this.PERSISTENT_PREFIX.length))) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('Erreur lors de l\'invalidation du cache persistant:', error);
      }
    }
  }

  /**
   * Précharge des données populaires
   */
  async preloadPopularData(): Promise<void> {
    const popularDestinations = [
      'Paris', 'London', 'Rome', 'Barcelona', 'Amsterdam',
      'Prague', 'Vienna', 'Budapest', 'Berlin', 'Madrid'
    ];

    const preloadTasks = popularDestinations.map(async (destination) => {
      const cacheKey = `popular_${destination.toLowerCase()}`;
      
      // Simuler le préchargement de données populaires
      if (!this.has(cacheKey, { persistent: true })) {
        try {
          // TODO: Remplacer par vos vraies API calls
          const data = {
            destination,
            preloaded: true,
            timestamp: Date.now()
          };
          
          this.set(cacheKey, data, {
            ttl: 24 * 60 * 60 * 1000, // 24h
            persistent: true
          });
        } catch (error) {
          console.warn(`Erreur préchargement pour ${destination}:`, error);
        }
      }
    });

    await Promise.allSettled(preloadTasks);
  }

  /**
   * Génère une clé de cache standardisée pour les recherches
   */
  generateSearchKey(params: {
    type: 'hotels' | 'flights' | 'restaurants' | 'activities';
    city?: string;
    dates?: string;
    passengers?: number;
    budget?: string;
    [key: string]: any;
  }): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return `search_${params.type}_${btoa(sortedParams).replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  /**
   * Nettoie automatiquement le cache mémoire si trop plein
   */
  private cleanupMemoryCache(): void {
    if (this.memoryCache.size <= this.MAX_MEMORY_ENTRIES) return;

    // Supprimer les entrées expirées d'abord
    for (const [key, entry] of this.memoryCache) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
      }
    }

    // Si encore trop plein, supprimer les plus anciennes
    if (this.memoryCache.size > this.MAX_MEMORY_ENTRIES) {
      const entries = Array.from(this.memoryCache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp);
      
      const toDelete = entries.slice(0, this.memoryCache.size - this.MAX_MEMORY_ENTRIES);
      toDelete.forEach(([key]) => this.memoryCache.delete(key));
    }
  }

  /**
   * Vérifie si une entrée est expirée
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Retourne des statistiques sur le cache
   */
  getStats(): {
    memoryEntries: number;
    persistentEntries: number;
    memorySize: number;
    oldestEntry?: number;
    newestEntry?: number;
  } {
    const memoryEntries = this.memoryCache.size;
    let persistentEntries = 0;
    let oldestEntry: number | undefined;
    let newestEntry: number | undefined;

    // Compter les entrées persistantes
    try {
      const keys = Object.keys(localStorage);
      persistentEntries = keys.filter(key => 
        key.startsWith(this.PERSISTENT_PREFIX)
      ).length;
    } catch (error) {
      // Ignorer les erreurs d'accès localStorage
    }

    // Analyser les timestamps
    for (const entry of this.memoryCache.values()) {
      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (!newestEntry || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    }

    // Estimation approximative de la taille mémoire
    const memorySize = JSON.stringify(Array.from(this.memoryCache.values())).length;

    return {
      memoryEntries,
      persistentEntries,
      memorySize,
      oldestEntry,
      newestEntry
    };
  }
}

export const cacheService = new CacheService();

// Précharger les données populaires au démarrage
if (typeof window !== 'undefined') {
  // Attendre un peu pour ne pas bloquer le démarrage
  setTimeout(() => {
    cacheService.preloadPopularData().catch(console.warn);
  }, 2000);
}