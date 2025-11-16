import { BookingType } from '@/types/booking';
import { API_BASE_URL, authTokenStorage } from '@/integrations/api/client';

export interface AnalyticsEvent {
  event: string;
  category: 'booking' | 'search' | 'user' | 'performance';
  properties: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

export interface ConversionMetrics {
  totalViews: number;
  totalClicks: number;
  totalBookings: number;
  clickRate: number; // clicks/views
  conversionRate: number; // bookings/clicks
  averageOrderValue: number;
  revenueTotal: number;
}

export interface PerformanceMetrics {
  apiResponseTimes: { [api: string]: number[] };
  searchLatency: number[];
  errorRates: { [source: string]: number };
  cacheHitRate: number;
}

export interface ABTestResult {
  variant: 'A' | 'B';
  conversionRate: number;
  sampleSize: number;
  isSignificant: boolean;
  confidence: number;
}

export class BookingAnalytics {
  private sessionId: string;
  private userId?: string;
  private events: AnalyticsEvent[] = [];
  private abTestVariant?: 'A' | 'B';
  private persistedEvents: AnalyticsEvent[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeUser();
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('tasarini_analytics_events');
        if (cached) {
          this.persistedEvents = JSON.parse(cached);
        }
      } catch (error) {
        console.warn('Unable to read cached analytics events', error);
      }
    }
    this.setupABTest();
  }

  /**
   * Track un événement analytics
   */
  track(
    event: string,
    category: AnalyticsEvent['category'],
    properties: Record<string, any> = {}
  ): void {
    const analyticsEvent: AnalyticsEvent = {
      event,
      category,
      properties: {
        ...properties,
        abTestVariant: this.abTestVariant,
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        url: window.location.href
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId
    };

    this.events.push(analyticsEvent);

    // Envoyer en batch toutes les 10 events ou toutes les 30 secondes
    if (this.events.length >= 10) {
      this.flush();
    }
  }

  /**
   * Track une vue de produit
   */
  trackProductView(
    productType: BookingType,
    productId: string,
    source: string,
    properties: Record<string, any> = {}
  ): void {
    this.track('product_view', 'booking', {
      productType,
      productId,
      source,
      ...properties
    });
  }

  /**
   * Track un clic sur un produit
   */
  trackProductClick(
    productType: BookingType,
    productId: string,
    source: string,
    position: number,
    properties: Record<string, any> = {}
  ): void {
    this.track('product_click', 'booking', {
      productType,
      productId,
      source,
      position,
      ...properties
    });
  }

  /**
   * Track une tentative de réservation
   */
  trackBookingAttempt(
    productType: BookingType,
    productId: string,
    amount: number,
    currency: string,
    properties: Record<string, any> = {}
  ): void {
    this.track('booking_attempt', 'booking', {
      productType,
      productId,
      amount,
      currency,
      ...properties
    });
  }

  /**
   * Track une réservation réussie
   */
  trackBookingSuccess(
    bookingId: string,
    productType: BookingType,
    amount: number,
    currency: string,
    source: string,
    properties: Record<string, any> = {}
  ): void {
    this.track('booking_success', 'booking', {
      bookingId,
      productType,
      amount,
      currency,
      source,
      revenue: amount,
      ...properties
    });
  }

  /**
   * Track un abandon de réservation
   */
  trackBookingAbandonment(
    productType: BookingType,
    step: string,
    reason?: string,
    properties: Record<string, any> = {}
  ): void {
    this.track('booking_abandonment', 'booking', {
      productType,
      step,
      reason,
      ...properties
    });
  }

  /**
   * Track une recherche
   */
  trackSearch(
    searchType: BookingType,
    query: string,
    filters: Record<string, any>,
    resultCount: number,
    responseTime: number
  ): void {
    this.track('search', 'search', {
      searchType,
      query,
      filters,
      resultCount,
      responseTime
    });
  }

  /**
   * Track les performances d'API
   */
  trackApiPerformance(
    apiName: string,
    endpoint: string,
    responseTime: number,
    success: boolean,
    errorCode?: string
  ): void {
    this.track('api_performance', 'performance', {
      apiName,
      endpoint,
      responseTime,
      success,
      errorCode
    });
  }

  /**
   * Track l'utilisation du cache
   */
  trackCacheUsage(cacheKey: string, hit: boolean, responseTime?: number): void {
    this.track('cache_usage', 'performance', {
      cacheKey,
      hit,
      responseTime
    });
  }

  /**
   * Récupère les métriques de conversion pour une période
   */
  async getConversionMetrics(
    startDate: Date,
    endDate: Date,
    productType?: BookingType
  ): Promise<ConversionMetrics> {
    try {
      // Calculer les métriques à partir des événements analytics
      const events = this.filterPersistedEvents(startDate, endDate);
      const viewEvents = events.filter((event) => event.event === 'product_view');
      const clickEvents = events.filter((event) => event.event === 'product_click');
      const bookingEvents = events.filter((event) => event.event === 'booking_success');

      const totalViews = viewEvents?.length || 0;
      const totalClicks = clickEvents?.length || 0;
      const totalBookings = bookingEvents?.length || 0;
      const revenueTotal = bookingEvents?.reduce((sum, event) => 
        sum + ((event.properties as any)?.amount || 0), 0) || 0;

      return {
        totalViews,
        totalClicks,
        totalBookings,
        clickRate: totalViews > 0 ? totalClicks / totalViews : 0,
        conversionRate: totalClicks > 0 ? totalBookings / totalClicks : 0,
        averageOrderValue: totalBookings > 0 ? revenueTotal / totalBookings : 0,
        revenueTotal
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des métriques:', error);
      return {
        totalViews: 0,
        totalClicks: 0,
        totalBookings: 0,
        clickRate: 0,
        conversionRate: 0,
        averageOrderValue: 0,
        revenueTotal: 0
      };
    }
  }

  /**
   * Récupère les métriques de performance
   */
  async getPerformanceMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceMetrics> {
    try {
      // Récupérer les événements de performance
      const performanceEvents = this.filterPersistedEvents(startDate, endDate).filter(
        (event) => event.category === 'performance'
      );

      const apiResponseTimes: { [api: string]: number[] } = {};
      const searchLatency: number[] = [];
      let cacheHits = 0;
      let cacheMisses = 0;

      performanceEvents?.forEach(event => {
        const props = event.properties as any;
        if (event.event_name === 'api_performance') {
          const apiName = props?.apiName as string;
          const responseTime = props?.responseTime as number;
          if (apiName && responseTime) {
            if (!apiResponseTimes[apiName]) apiResponseTimes[apiName] = [];
            apiResponseTimes[apiName].push(responseTime);
          }
        } else if (event.event_name === 'search') {
          const responseTime = props?.responseTime as number;
          if (responseTime) searchLatency.push(responseTime);
        } else if (event.event_name === 'cache_usage') {
          if (props?.hit) cacheHits++;
          else cacheMisses++;
        }
      });

      return {
        apiResponseTimes,
        searchLatency,
        errorRates: {},
        cacheHitRate: (cacheHits + cacheMisses) > 0 ? cacheHits / (cacheHits + cacheMisses) : 0
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des métriques de performance:', error);
      return {
        apiResponseTimes: {},
        searchLatency: [],
        errorRates: {},
        cacheHitRate: 0
      };
    }
  }

  /**
   * Exécute un test A/B sur l'ordre des recommandations
   */
  runABTest(items: any[]): { items: any[]; variant: 'A' | 'B' } {
    if (!this.abTestVariant) {
      this.setupABTest();
    }

    const variant = this.abTestVariant!;

    if (variant === 'A') {
      // Variante A: Ordre par score total
      return { items, variant };
    } else {
      // Variante B: Favoriser les partenaires internes
      const sortedItems = [...items].sort((a, b) => {
        const aIsPartner = a.source === 'internal' ? 1 : 0;
        const bIsPartner = b.source === 'internal' ? 1 : 0;
        
        if (aIsPartner !== bIsPartner) {
          return bIsPartner - aIsPartner;
        }
        
        return (b.score?.totalScore || 0) - (a.score?.totalScore || 0);
      });
      
      return { items: sortedItems, variant };
    }
  }

  /**
   * Analyse les résultats du test A/B
   */
  async getABTestResults(startDate: Date, endDate: Date): Promise<{
    variantA: ABTestResult;
    variantB: ABTestResult;
  }> {
    try {
      // Analyser les événements par variante A/B
      const events = this.filterPersistedEvents(startDate, endDate).filter((event) =>
        ['product_view', 'booking_success'].includes(event.event)
      );

      const variantAViews = events?.filter(e => 
        (e.properties as any)?.abTestVariant === 'A' && e.event_name === 'product_view').length || 0;
      const variantBViews = events?.filter(e => 
        (e.properties as any)?.abTestVariant === 'B' && e.event_name === 'product_view').length || 0;
      
      const variantABookings = events?.filter(e => 
        (e.properties as any)?.abTestVariant === 'A' && e.event_name === 'booking_success').length || 0;
      const variantBBookings = events?.filter(e => 
        (e.properties as any)?.abTestVariant === 'B' && e.event_name === 'booking_success').length || 0;

      return {
        variantA: { 
          variant: 'A', 
          conversionRate: variantAViews > 0 ? variantABookings / variantAViews : 0, 
          sampleSize: variantAViews, 
          isSignificant: false, 
          confidence: 0 
        },
        variantB: { 
          variant: 'B', 
          conversionRate: variantBViews > 0 ? variantBBookings / variantBViews : 0, 
          sampleSize: variantBViews, 
          isSignificant: false, 
          confidence: 0 
        }
      };
    } catch (error) {
      console.error('Erreur lors de l\'analyse du test A/B:', error);
      return {
        variantA: { variant: 'A', conversionRate: 0, sampleSize: 0, isSignificant: false, confidence: 0 },
        variantB: { variant: 'B', conversionRate: 0, sampleSize: 0, isSignificant: false, confidence: 0 }
      };
    }
  }

  /**
   * Crée un tableau de bord en temps réel
   */
  async getDashboardMetrics(): Promise<{
    realTimeUsers: number;
    todayBookings: number;
    todayRevenue: number;
    topPerformingProducts: Array<{
      name: string;
      conversionRate: number;
      revenue: number;
    }>;
    alertsCount: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Récupérer les métriques du jour
      const todayEvents = this.persistedEvents.filter(
        (event) => event.timestamp >= today.getTime()
      );

      const todayBookings = todayEvents?.filter(e => e.event_name === 'booking_success').length || 0;
      const todayRevenue = todayEvents?.filter(e => e.event_name === 'booking_success')
        .reduce((sum, e) => sum + ((e.properties as any)?.amount || 0), 0) || 0;

      return {
        realTimeUsers: Math.floor(Math.random() * 50) + 10, // Simulé
        todayBookings,
        todayRevenue,
        topPerformingProducts: [], // À implémenter
        alertsCount: 0 // À implémenter
      };
    } catch (error) {
      console.error('Erreur lors de la récupération du tableau de bord:', error);
      return {
        realTimeUsers: 0,
        todayBookings: 0,
        todayRevenue: 0,
        topPerformingProducts: [],
        alertsCount: 0
      };
    }
  }

  /**
   * Envoie tous les événements en attente
   */
  async flush(): Promise<void> {
    if (this.events.length === 0) return;

    try {
      this.persistedEvents = [...this.persistedEvents, ...this.events].slice(-1000);
      if (typeof window !== 'undefined') {
        localStorage.setItem('tasarini_analytics_events', JSON.stringify(this.persistedEvents));
      }
      this.events = [];
    } catch (error) {
      console.error('Erreur lors de la persistance des événements analytics:', error);
    }
  }

  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private filterPersistedEvents(startDate: Date, endDate: Date) {
    const start = startDate.getTime();
    const end = endDate.getTime();
    return this.persistedEvents.filter(
      (event) => event.timestamp >= start && event.timestamp <= end
    );
  }

  private async initializeUser(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('tasarini_user_id');
        if (stored) {
          this.userId = stored;
          return;
        }
      }
      const token = authTokenStorage.getAccessToken();
      if (token) {
        this.userId = token.slice(0, 8);
      }
    } catch {
      this.userId = undefined;
    }
  }

  private setupABTest(): void {
    // Utiliser le sessionId pour déterminer de manière cohérente la variante
    const hash = this.sessionId.split('_').reduce((acc, part) => {
      return acc + part.charCodeAt(0);
    }, 0);
    
    this.abTestVariant = hash % 2 === 0 ? 'A' : 'B';
  }
}

export const bookingAnalytics = new BookingAnalytics();

// Auto-flush des événements toutes les 30 secondes
if (typeof window !== 'undefined') {
  setInterval(() => {
    bookingAnalytics.flush();
  }, 30000);

  // Flush au moment de quitter la page
  window.addEventListener('beforeunload', () => {
    bookingAnalytics.flush();
  });
}
