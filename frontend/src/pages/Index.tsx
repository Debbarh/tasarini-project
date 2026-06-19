import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { DestinationCodeAutocomplete } from "@/components/ui/destination-code-autocomplete";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WidgetRenderer } from "@/components/widgets/WidgetRenderer";
import FlightComparatorWidget from "@/components/widgets/FlightComparatorWidget";
import Stay22HotelMap from "@/components/widgets/Stay22HotelMap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import Testimonials from "@/components/home/Testimonials";
import {
  Hotel,
  Car,
  CarTaxiFront,
  Bus,
  CarFront,
  Compass,
  Map as MapIcon,
  UtensilsCrossed,
  Briefcase,
  Plane,
  Smartphone,
  Scale,
  Sparkles,
  Search,
} from "lucide-react";

import hero from "@/assets/hero-travel.jpg";
import beach from "@/assets/inspire-beach.jpg";
import mountain from "@/assets/inspire-mountain.jpg";
import city from "@/assets/inspire-city.jpg";
import cultural from "@/assets/inspire-cultural.jpg";

const Index = () => {
  const { t } = useTranslation();
  const { settings } = useSystemSettings();
  const navigate = useNavigate();

  // Recherche rapide du hero -> page /booking
  const [searchDest, setSearchDest] = useState('');
  const [searchCheckIn, setSearchCheckIn] = useState('');
  const [searchCheckOut, setSearchCheckOut] = useState('');

  // Centre partagé des cartes (Stay22 + Tasarini) : géoloc si autorisée, sinon Paris.
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 48.8566, lng: 2.3522 });
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => { /* refus/échec -> on garde Paris */ },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
      );
    }
  }, []);

  const handleQuickSearch = () => {
    const params = new URLSearchParams();
    if (searchDest) params.set('destination', searchDest.toUpperCase());
    if (searchCheckIn) params.set('checkIn', searchCheckIn);
    if (searchCheckOut) params.set('checkOut', searchCheckOut);
    navigate(`/booking?${params.toString()}`);
  };

  const images = [
    { src: hero, alt: t('home.heroTitle'), caption: t('home.captionHero') },
    { src: beach, alt: t('home.exploreWorldDesc'), caption: t('home.captionBeach') },
    { src: mountain, alt: t('home.exploreWorldDesc'), caption: t('home.captionMountain') },
    { src: city, alt: t('home.exploreWorldDesc'), caption: t('home.captionCity') },
    { src: cultural, alt: t('home.exploreWorldDesc'), caption: t('home.captionCultural') }
  ];

  // Live inspiration : routes affichées en rotation (noms de villes réels)
  const inspirationRoutes = [
    { from: 'Paris', to: 'Bali' },
    { from: 'Tokyo', to: 'Rome' },
    { from: 'New York', to: 'Marrakech' },
    { from: 'Londres', to: 'Bangkok' },
    { from: 'Barcelone', to: 'Lisbonne' }
  ];
  const [routeIndex, setRouteIndex] = useState(0);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setRouteIndex((prev) => (prev + 1) % inspirationRoutes.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [inspirationRoutes.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000); // Change d'image toutes les 4 secondes

    return () => clearInterval(timer);
  }, [images.length]);
  return (
    <main>
      <Helmet>
        <title>Travel Platform - {t('home.heroTitle')}</title>
        <meta name="description" content={t('home.heroSubtitle')} />
        <link rel="canonical" href="/" />
      </Helmet>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background avec gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary-glow/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.15),transparent_70%)]" />
        
        <div className="container mx-auto px-4 py-12 sm:py-20 relative z-10">
          {/* Vols (TravelPayouts) + Hébergements (Stay22) regroupés en onglets pour gagner
              de la place ; le widget inactif n'est pas monté (chargement à la demande). */}
          <div className="mb-8 sm:mb-10">
            <Tabs defaultValue="flights" className="bg-background/80 backdrop-blur-sm border rounded-2xl p-3 sm:p-4 shadow-lg">
              <TabsList className="grid w-full grid-cols-2 mb-3 sm:max-w-md">
                <TabsTrigger value="flights" className="gap-2">
                  <Plane className="h-4 w-4" /> {t('home.flightComparatorTitle', 'Comparez les vols')}
                </TabsTrigger>
                <TabsTrigger value="hotels" className="gap-2">
                  <Hotel className="h-4 w-4" /> {t('home.hotelsMapTitle', 'Trouvez votre hébergement')}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="flights">
                <FlightComparatorWidget />
              </TabsContent>
              <TabsContent value="hotels">
                <Stay22HotelMap lat={mapCenter.lat} lng={mapCenter.lng} />
              </TabsContent>
            </Tabs>
          </div>

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-20 items-center">
            {/* Contenu textuel */}
            <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in order-2 lg:order-1">
              <div className="space-y-4 sm:space-y-6">
                <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-xs sm:text-sm font-medium text-primary animate-scale-in">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('planTrip.smartRecommendations')}
                </div>
                
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight leading-tight">
                  {t('home.heroTitle')}
                </h1>
                
                <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-xl leading-relaxed">
                  {t('home.heroSubtitle')}
                </p>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 relative z-10">
                <Button asChild size="lg" className="text-sm sm:text-base lg:text-lg px-6 sm:px-8 py-4 sm:py-6 hover-scale">
                  <Link to="/plan">
                    <span className="hidden sm:inline">{t('home.planTrip')}</span>
                    <span className="sm:hidden">{t('planTrip.startPlanning')}</span>
                    <svg className="ml-2 w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </Button>
                {settings.beInspiredEnabled && (
                  <Button asChild variant="outline" size="lg" className="text-sm sm:text-base lg:text-lg px-6 sm:px-8 py-4 sm:py-6 hover-scale">
                    <Link to="/inspire">
                      {t('home.discoverTreasures')}
                    </Link>
                  </Button>
                )}
              </div>

              {/* Barre de recherche rapide -> /booking (masquée si module désactivé) */}
              {settings.bookingCenterEnabled && (
              <div className="bg-background/80 backdrop-blur-sm border rounded-2xl p-3 shadow-lg flex flex-col sm:flex-row gap-2 relative z-10">
                <div className="flex-1 min-w-0">
                  <DestinationCodeAutocomplete
                    value={searchDest}
                    onValueChange={(code) => setSearchDest(code.toUpperCase())}
                    placeholder={t('home.searchDestination')}
                  />
                </div>
                <Input
                  type="date"
                  aria-label={t('booking.checkIn')}
                  value={searchCheckIn}
                  onChange={(e) => setSearchCheckIn(e.target.value)}
                  className="sm:w-36"
                />
                <Input
                  type="date"
                  aria-label={t('booking.checkOut')}
                  value={searchCheckOut}
                  min={searchCheckIn || undefined}
                  onChange={(e) => setSearchCheckOut(e.target.value)}
                  className="sm:w-36"
                />
                <Button onClick={handleQuickSearch} size="lg" className="shrink-0">
                  <Search className="h-4 w-4 mr-2" />
                  {t('home.searchCta')}
                </Button>
              </div>
              )}

              {/* Stats */}
              <div className="flex justify-center sm:justify-start gap-4 sm:gap-8 pt-6 sm:pt-8 border-t border-border/50">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary">1000+</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{t('home.statsDestinations')}</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary">500K+</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{t('home.statsAdventurers')}</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-success">98%</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{t('home.statsDreams')}</div>
                </div>
              </div>
            </div>
            
            {/* Carrousel Hero */}
            <div className="relative lg:justify-self-end animate-fade-in order-1 lg:order-2" style={{ animationDelay: '0.2s' }}>
              {/* Effet de glow animé */}
              <div className="absolute -inset-4 sm:-inset-8 bg-gradient-to-r from-primary/30 to-primary-glow/30 rounded-2xl sm:rounded-3xl blur-2xl sm:blur-3xl animate-pulse" />
              
              {/* Carrousel d'images */}
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-elegant">
                <div 
                  className="flex transition-transform duration-1000 ease-in-out"
                  style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                >
                  {images.map((image, index) => (
                    <div key={index} className="relative w-full max-w-lg flex-shrink-0">
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="w-full h-[250px] sm:h-[350px] lg:h-[400px] object-cover"
                        loading={index === 0 ? "eager" : "lazy"}
                      />
                      {image.caption && (
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3 sm:p-4 pb-8 sm:pb-10">
                          <span className="text-white text-sm sm:text-base font-medium drop-shadow">{image.caption}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Indicateurs de pagination */}
                <div className="absolute bottom-3 sm:bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1.5 sm:gap-2">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      aria-label={t('home.goToImage', { index: index + 1 })}
                      aria-current={index === currentImageIndex}
                      className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-300 ${
                        index === currentImageIndex
                          ? 'bg-white scale-125'
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              {/* Floating cards - cachées sur mobile */}
              <div className="hidden sm:block absolute -top-4 -left-4 bg-background/90 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg border animate-slide-in-right" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full" />
                  <span className="text-xs sm:text-sm font-medium inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-primary" />{t('home.liveInspiration')}</span>
                </div>
              </div>

              <div className="hidden sm:block absolute -bottom-4 -right-4 bg-background/90 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg border animate-slide-in-right" style={{ animationDelay: '0.7s' }}>
                <div className="flex items-center gap-2">
                  <div className="text-lg sm:text-2xl"><Plane className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /></div>
                  <div>
                    <div className="text-xs sm:text-sm font-medium transition-all duration-500">
                      {inspirationRoutes[routeIndex].from} → {inspirationRoutes[routeIndex].to}
                    </div>
                    <div className="text-xs text-muted-foreground">{t('home.adventureFound')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* How it works */}
      <section className="py-12 sm:py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                {t('home.howItWorksTitle', 'Comment ça marche ?')}
              </h2>
              <p className="text-muted-foreground">
                {t('home.howItWorksSubtitle', '3 étapes simples pour passer de l’idée au voyage confirmé.')}
              </p>
            </div>
            <Button asChild size="lg" className="hover-scale">
              <Link to="/plan">
                {t('home.planTrip')}
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">1</span>
                  {t('home.howStep1Title', 'Inspirez-vous')}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>{t('home.howStep1Desc', 'Parcourez les stories et les idées de voyage adaptées à vos envies.')}</p>
              </CardContent>
            </Card>

            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">2</span>
                  {t('home.howStep2Title', 'Planifiez')}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>{t('home.howStep2Desc', 'Utilisez notre assistant pour créer un itinéraire et réserver hôtels et transports.')}</p>
              </CardContent>
            </Card>

            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">3</span>
                  {t('home.howStep3Title', 'Partez serein')}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>{t('home.howStep3Desc', 'Recevez les confirmations, partagez vos stories et profitez du voyage.')}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Booking Engine Section - Controlled by admin settings */}
      {settings.bookingCenterEnabled && (
        <section className="py-12 sm:py-16 bg-gradient-to-b from-background to-primary/5">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 flex items-center justify-center gap-2">
                <Hotel className="h-7 w-7 text-primary" />
                {t('home.bookingCenter')}
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('home.bookingCenterDesc')}
              </p>
            </div>

            <div className="text-center">
              <Button asChild size="lg" className="hover-scale">
                <Link to="/booking">
                  <Search className="h-4 w-4 mr-2" />
                  {t('home.openBookingCenter')}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Sections de widgets d'affiliation — masquées au lancement (module Centrale de réservation OFF), réactivables par l'admin */}
      {settings.bookingCenterEnabled && (
      <>
      {/* Transport Section with Tabs */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 flex items-center justify-center gap-2">
              <Car className="h-6 w-6 text-primary" />
              {t('home.transportServices')}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t('home.transportServicesDesc')}
            </p>
          </div>

          <Tabs defaultValue="car-rental" className="max-w-7xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6">
              <TabsTrigger value="car-rental" className="flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-1 sm:px-3"><Car className="h-4 w-4 shrink-0" />{t('home.carRental')}</TabsTrigger>
              <TabsTrigger value="transfers" className="flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-1 sm:px-3"><CarTaxiFront className="h-4 w-4 shrink-0" />{t('home.transfers')}</TabsTrigger>
              <TabsTrigger value="public" className="flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-1 sm:px-3"><Bus className="h-4 w-4 shrink-0" />{t('home.busAndTrain')}</TabsTrigger>
              <TabsTrigger value="urban" className="flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-1 sm:px-3"><CarFront className="h-4 w-4 shrink-0" />{t('home.urbanTransport')}</TabsTrigger>
            </TabsList>

            <TabsContent value="car-rental" className="mt-0">
              <WidgetRenderer placement="home_transport_car" />
            </TabsContent>

            <TabsContent value="transfers" className="mt-0">
              <WidgetRenderer placement="home_transport_transfers" />
            </TabsContent>

            <TabsContent value="public" className="mt-0">
              <WidgetRenderer placement="home_transport_public" />
            </TabsContent>

            <TabsContent value="urban" className="mt-0">
              <WidgetRenderer placement="home_transport_urban" />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Activities & Experiences Section with Tabs */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-background to-primary/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 flex items-center justify-center gap-2">
              <Compass className="h-6 w-6 text-primary" />
              {t('home.activitiesExperiences')}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t('home.activitiesDesc')}
            </p>
          </div>

          <Tabs defaultValue="tours" className="max-w-7xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="tours" className="flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-1 sm:px-3"><MapIcon className="h-4 w-4 shrink-0" />{t('home.toursVisits')}</TabsTrigger>
              <TabsTrigger value="dining" className="flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-1 sm:px-3"><UtensilsCrossed className="h-4 w-4 shrink-0" />{t('home.gastronomy')}</TabsTrigger>
            </TabsList>

            <TabsContent value="tours" className="mt-0">
              <WidgetRenderer placement="home_activities_tours" />
            </TabsContent>

            <TabsContent value="dining" className="mt-0">
              <WidgetRenderer placement="home_activities_dining" />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Services Section with Tabs */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 flex items-center justify-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" />
              {t('home.travelerServices')}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t('home.travelerServicesDesc')}
            </p>
          </div>

          <Tabs defaultValue="booking" className="max-w-7xl mx-auto">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="booking" className="flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-1 sm:px-3"><Plane className="h-4 w-4 shrink-0" />{t('home.booking')}</TabsTrigger>
              <TabsTrigger value="esim" className="flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-1 sm:px-3"><Smartphone className="h-4 w-4 shrink-0" />{t('home.esimCards')}</TabsTrigger>
              <TabsTrigger value="compensation" className="flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-1 sm:px-3"><Scale className="h-4 w-4 shrink-0" />{t('home.compensation')}</TabsTrigger>
            </TabsList>

            <TabsContent value="booking" className="mt-0">
              <WidgetRenderer placement="home_services_booking" />
            </TabsContent>

            <TabsContent value="esim" className="mt-0">
              <WidgetRenderer placement="home_services_esim" />
            </TabsContent>

            <TabsContent value="compensation" className="mt-0">
              <WidgetRenderer placement="home_services_compensation" />
            </TabsContent>
          </Tabs>
        </div>
      </section>
      </>
      )}

      {/* Testimonials - vrais avis utilisateurs (masqué si aucun) */}
      <Testimonials />

      {/* Dynamic Widgets Section - Managed from Admin (masquée si module désactivé) */}
      {settings.bookingCenterEnabled && (
        <section className="py-12 sm:py-16 bg-gradient-to-b from-background to-primary/5">
          <div className="container mx-auto px-4">
            <WidgetRenderer placement="home" className="max-w-7xl mx-auto" />
          </div>
        </section>
      )}

    </main>
  );
};

export default Index;
