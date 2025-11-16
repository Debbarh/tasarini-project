import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Star, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PartnerRegistrationForm from '@/components/partner/PartnerRegistrationForm';

const PartnerApplication: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  // Si l'utilisateur est déjà connecté, le rediriger vers le centre partenaire
  if (user) {
    return <Navigate to="/partner-center" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Building2 className="w-12 h-12 text-primary" />
          <h1 className="text-4xl font-bold">{t('partnerApplication.title')}</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          {t('partnerApplication.subtitle')}
        </p>
      </div>

      {/* Avantages du partenariat */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <Card className="text-center hover:shadow-lg transition-shadow">
          <CardContent className="p-8">
            <Users className="w-12 h-12 mx-auto mb-4 text-blue-500" />
            <h3 className="text-xl font-semibold mb-3">{t('partnerApplication.benefits.visibility.title')}</h3>
            <p className="text-muted-foreground">
              {t('partnerApplication.benefits.visibility.description')}
            </p>
          </CardContent>
        </Card>
        
        <Card className="text-center hover:shadow-lg transition-shadow">
          <CardContent className="p-8">
            <Star className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-xl font-semibold mb-3">{t('partnerApplication.benefits.priority.title')}</h3>
            <p className="text-muted-foreground">
              {t('partnerApplication.benefits.priority.description')}
            </p>
          </CardContent>
        </Card>
        
        <Card className="text-center hover:shadow-lg transition-shadow">
          <CardContent className="p-8">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-xl font-semibold mb-3">{t('partnerApplication.benefits.analytics.title')}</h3>
            <p className="text-muted-foreground">
              {t('partnerApplication.benefits.analytics.description')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Statistiques */}
      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl p-8 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-primary mb-2">10K+</div>
            <div className="text-muted-foreground">{t('partnerApplication.stats.travelers')}</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary mb-2">500+</div>
            <div className="text-muted-foreground">{t('partnerApplication.stats.pois')}</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary mb-2">50+</div>
            <div className="text-muted-foreground">{t('partnerApplication.stats.destinations')}</div>
          </div>
        </div>
      </div>

      {/* Processus d'inscription */}
      <Card className="max-w-4xl mx-auto mb-12">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('partnerApplication.process.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h4 className="font-semibold mb-2">{t('partnerApplication.process.step1.title')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('partnerApplication.process.step1.description')}
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h4 className="font-semibold mb-2">{t('partnerApplication.process.step2.title')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('partnerApplication.process.step2.description')}
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h4 className="font-semibold mb-2">{t('partnerApplication.process.step3.title')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('partnerApplication.process.step3.description')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire d'inscription partenaire */}
      <PartnerRegistrationForm />
    </div>
  );
};

export default PartnerApplication;