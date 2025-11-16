import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

import hero from "@/assets/hero-travel.jpg";
import beach from "@/assets/inspire-beach.jpg";
import mountain from "@/assets/inspire-mountain.jpg";
import city from "@/assets/inspire-city.jpg";
import cultural from "@/assets/inspire-cultural.jpg";

const Index = () => {
  const { t } = useTranslation();
  const images = [
    { src: hero, alt: t('home.heroTitle') },
    { src: beach, alt: t('home.exploreWorldDesc') },
    { src: mountain, alt: t('home.exploreWorldDesc') },
    { src: city, alt: t('home.exploreWorldDesc') },
    { src: cultural, alt: t('home.exploreWorldDesc') }
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

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background avec gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary-glow/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.15),transparent_70%)]" />
        
        <div className="container mx-auto px-4 py-12 sm:py-20 relative z-10">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-20 items-center">
            {/* Contenu textuel */}
            <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in order-2 lg:order-1">
              <div className="space-y-4 sm:space-y-6">
                <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-xs sm:text-sm font-medium text-primary animate-scale-in">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  ✨ {t('planTrip.smartRecommendations')}
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
                <Button asChild variant="outline" size="lg" className="text-sm sm:text-base lg:text-lg px-6 sm:px-8 py-4 sm:py-6 hover-scale">
                  <Link to="/inspire">
                    {t('home.discoverTreasures')}
                  </Link>
                </Button>
              </div>
              
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
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary">98%</div>
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
                    <img 
                      key={index}
                      src={image.src} 
                      alt={image.alt}
                      className="w-full max-w-lg h-[250px] sm:h-[350px] lg:h-[400px] object-cover flex-shrink-0"
                      loading={index === 0 ? "eager" : "lazy"}
                    />
                  ))}
                </div>
                
                {/* Indicateurs de pagination */}
                <div className="absolute bottom-3 sm:bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1.5 sm:gap-2">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
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
                  <span className="text-xs sm:text-sm font-medium">🌟 Inspiration en direct</span>
                </div>
              </div>
              
              <div className="hidden sm:block absolute -bottom-4 -right-4 bg-background/90 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg border animate-slide-in-right" style={{ animationDelay: '0.7s' }}>
                <div className="flex items-center gap-2">
                  <div className="text-lg sm:text-2xl">✈️</div>
                  <div>
                    <div className="text-xs sm:text-sm font-medium">Paris → Bali</div>
                    <div className="text-xs text-muted-foreground">Aventure trouvée !</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-primary/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-primary rounded-full mt-2 animate-pulse" />
          </div>
        </div>
      </section>
      
    </main>
  );
};

export default Index;
