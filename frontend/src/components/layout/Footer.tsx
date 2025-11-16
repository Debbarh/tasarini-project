import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2 } from "lucide-react";

const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <img
              src="/lovable-uploads/070b3052-89a5-4274-add2-2a60a3411cf2.png"
              alt="Logo"
              className="h-8 w-auto"
              width="32"
              height="32"
              loading="lazy"
              decoding="async"
            />
            <span className="text-sm text-muted-foreground">
              {t('footer.copyright')}
            </span>
          </div>
          
          <div className="flex items-center gap-6">
            <Link 
              to="/partner-application" 
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Building2 className="w-4 h-4" />
              {t('footer.becomePartner')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;