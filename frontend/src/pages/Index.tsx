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

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

      {/* Hero Section : accroche + recherche (Vols TravelPayouts / Hôtels Stay22) sur le premier écran */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Fond : image plein écran en fondu enchaîné + overlay pour la lisibilité du texte */}
        <div className="absolute inset-0">
          {images.map((image, index) => (
            <img
              key={index}
              src={image.src}
              alt=""
              aria-hidden="true"
              loading={index === 0 ? "eager" : "lazy"}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                index === currentImageIndex ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/80 to-background/95" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.18),transparent_60%)]" />
        </div>

        <div className="container mx-auto px-4 py-10 sm:py-14 relative z-10">
          {/* Accroche compacte, centrée */}
          <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-4 sm:gap-5 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs sm:text-sm font-medium text-primary">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <Sparkles className="h-3.5 w-3.5" />
              {t('planTrip.smartRecommendations')}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight leading-[1.1]">
              {t('home.heroTitle')}
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl leading-relaxed line-clamp-2 sm:line-clamp-none">
              {t('home.heroSubtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center">
              <Button asChild size="lg" className="text-sm sm:text-base px-6 sm:px-8 hover-scale">
                <Link to="/plan">
                  <span className="hidden sm:inline">{t('home.planTrip')}</span>
                  <span className="sm:hidden">{t('planTrip.startPlanning')}</span>
                  <svg className="ml-2 w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </Button>
              {settings.beInspiredEnabled && (
                <Button asChild variant="outline" size="lg" className="text-sm sm:text-base px-6 sm:px-8 hover-scale">
                  <Link to="/inspire">{t('home.discoverTreasures')}</Link>
                </Button>
              )}
            </div>
          </div>

          {/* Recherche Vols (TravelPayouts) + Hôtels (Stay22) — forceMount : chargés une fois et
              conservés montés (corrige le widget TP qui ne se rechargeait pas au retour d'onglet). */}
          <div className="mt-6 sm:mt-8 w-full animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <Tabs defaultValue="flights" className="bg-background/85 backdrop-blur-sm border rounded-2xl p-3 sm:p-4 lg:p-5 shadow-lg">
              <TabsList className="grid w-full grid-cols-2 mb-3 sm:max-w-md sm:mx-auto">
                <TabsTrigger value="flights" className="gap-2">
                  <Plane className="h-4 w-4" /> {t('home.flightComparatorTitle', 'Comparez les vols')}
                </TabsTrigger>
                <TabsTrigger value="hotels" className="gap-2">
                  <Hotel className="h-4 w-4" /> {t('home.hotelsMapTitle', 'Trouvez votre hébergement')}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="flights" forceMount className="data-[state=inactive]:hidden mt-0">
                <FlightComparatorWidget />
              </TabsContent>
              <TabsContent value="hotels" forceMount className="data-[state=inactive]:hidden mt-0">
                <Stay22HotelMap lat={mapCenter.lat} lng={mapCenter.lng} heightClass="h-[300px] sm:h-[380px] lg:h-[440px]" />
              </TabsContent>
            </Tabs>
          </div>

          {/* Recherche rapide interne -> /booking (si module activé) */}
          {settings.bookingCenterEnabled && (
            <div className="mt-4 max-w-3xl mx-auto bg-background/85 backdrop-blur-sm border rounded-2xl p-3 shadow-lg flex flex-col sm:flex-row gap-2">
              <div className="flex-1 min-w-0">
                <DestinationCodeAutocomplete
                  value={searchDest}
                  onValueChange={(code) => setSearchDest(code.toUpperCase())}
                  placeholder={t('home.searchDestination')}
                />
              </div>
              <Input type="date" aria-label={t('booking.checkIn')} value={searchCheckIn}
                onChange={(e) => setSearchCheckIn(e.target.value)} className="sm:w-36" />
              <Input type="date" aria-label={t('booking.checkOut')} value={searchCheckOut} min={searchCheckIn || undefined}
                onChange={(e) => setSearchCheckOut(e.target.value)} className="sm:w-36" />
              <Button onClick={handleQuickSearch} size="lg" className="shrink-0">
                <Search className="h-4 w-4 mr-2" />
                {t('home.searchCta')}
              </Button>
            </div>
          )}

          {/* Stats (compactes, sous la recherche) */}
          <div className="mt-6 sm:mt-8 flex justify-center gap-6 sm:gap-12">
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
