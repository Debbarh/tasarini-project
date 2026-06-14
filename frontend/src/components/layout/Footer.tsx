import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2 } from "lucide-react";

const Footer = () => {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <img
              src="/brand/070b3052-89a5-4274-add2-2a60a3411cf2.png"
              alt="Tasarini"
              className="h-10 w-auto"
              width="40"
              height="40"
              loading="lazy"
              decoding="async"
            />
            <p className="text-sm text-muted-foreground max-w-xs">
              {t('footer.tagline', 'Inspiration, planification et réservation de voyage, propulsées par l’IA.')}
            </p>
          </div>

          {/* Discover */}
          <nav className="space-y-3">
            <h3 className="text-sm font-semibold">{t('footer.discover', 'Découvrir')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/plan" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('home.planTrip', 'Planifier un voyage')}
                </Link>
              </li>
              <li>
                <Link to="/inspire" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('navigation.exploreWorld', 'Explorer le monde')}
                </Link>
              </li>
              <li>
                <Link to="/travel-stories" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('navigation.travelStories', 'Récits de voyage')}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Company */}
          <nav className="space-y-3">
            <h3 className="text-sm font-semibold">{t('footer.company', 'Entreprise')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/partner-application"
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Building2 className="w-4 h-4" />
                  {t('footer.becomePartner', 'Devenir partenaire')}
                </Link>
              </li>
              <li>
                <a
                  href="mailto:contact@tasarini.com"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t('footer.contact', 'Contact')}
                </a>
              </li>
            </ul>
          </nav>

          {/* Legal */}
          <nav className="space-y-3">
            <h3 className="text-sm font-semibold">{t('footer.legal', 'Légal')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/legal/terms" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.terms', 'Conditions générales')}
                </Link>
              </li>
              <li>
                <Link to="/legal/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.privacy', 'Politique de confidentialité')}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          © {year} TASARINI. {t('footer.rights', 'Tous droits réservés.')}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
