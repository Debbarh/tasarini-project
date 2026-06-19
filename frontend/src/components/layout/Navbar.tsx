import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSelector } from "@/components/ui/language-selector";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationDialog } from "@/components/notifications/NotificationDialog";
import { LogOut, User, Building2, Bell, Menu, X, Bookmark } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const Navbar = () => {
  const { user, profile, signOut, hasRole } = useAuth();
  const { getUnreadCount } = useNotifications();
  const { settings } = useSystemSettings();
  const { t } = useTranslation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const unreadCount = getUnreadCount();

  // Helper pour obtenir les initiales de l'utilisateur
  const getInitials = () => {
    if (!user) return 'U';
    const name = user.display_name || user.email || 'User';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const NavigationLinks = ({ mobile = false, onLinkClick = () => {} }) => (
    <div className={mobile ? "flex flex-col space-y-4 py-4" : "hidden gap-4 lg:gap-6 md:flex"}>
      {settings.planYourTripEnabled && (
        <NavLink
          to="/plan"
          className={({isActive}) => `${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"} whitespace-nowrap ${mobile ? "text-lg" : ""}`}
          onClick={onLinkClick}
        >
          {t('navigation.createTrip')}
        </NavLink>
      )}
      {settings.beInspiredEnabled && (
        <NavLink
          to="/inspire"
          className={({isActive}) => `${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"} whitespace-nowrap ${mobile ? "text-lg" : ""}`}
          onClick={onLinkClick}
        >
          {t('navigation.exploreWorld')}
        </NavLink>
      )}
      {settings.travelStoriesEnabled && (
        <NavLink
          to="/travel-stories"
          className={({isActive}) => `${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"} whitespace-nowrap ${mobile ? "text-lg" : ""}`}
          onClick={onLinkClick}
        >
          {t('navigation.travelStories')}
        </NavLink>
      )}
      {user && settings.beInspiredEnabled && (
        <NavLink
          to="/my-discoveries"
          className={({isActive}) => `${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"} whitespace-nowrap ${mobile ? "text-lg" : ""}`}
          onClick={onLinkClick}
        >
          {t('navigation.myTreasures')}
        </NavLink>
      )}
      {hasRole('partner') && (
        <NavLink 
          to="/partner-center" 
          className={({isActive}) => `${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"} whitespace-nowrap ${mobile ? "text-lg" : ""}`}
          onClick={onLinkClick}
        >
          {t('navigation.partnerSpace')}
        </NavLink>
      )}
      {hasRole('admin') && (
        <NavLink 
          to="/admin" 
          className={({isActive}) => `${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"} whitespace-nowrap ${mobile ? "text-lg" : ""}`}
          onClick={onLinkClick}
        >
          {t('navigation.administration')}
        </NavLink>
      )}
    </div>
  );
  return (
    <header className="w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex items-center justify-between py-3 sm:py-4 px-4">
        <Link to="/" className="flex items-center">
          <img
            src="/brand/070b3052-89a5-4274-add2-2a60a3411cf2.png"
            alt="Logo"
            className="h-12 sm:h-16 w-auto"
            width="64"
            height="64"
            loading="eager"
            decoding="async"
          />
        </Link>
        
        {/* Desktop Navigation */}
        <NavigationLinks />
        
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Contrôles desktop uniquement (déplacés dans le menu sur mobile) */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <LanguageSelector variant="compact" />
          </div>

          {/* Mobile Menu Button */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="sm" className="p-2">
                <Menu className="w-5 h-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="text-left">Navigation</SheetTitle>
              </SheetHeader>

              {/* Thème + langue dans le menu sur mobile */}
              <div className="flex items-center gap-3 py-4 border-b">
                <ThemeToggle />
                <LanguageSelector variant="compact" />
              </div>

              {/* Mobile Navigation Links */}
              <NavigationLinks mobile onLinkClick={() => setIsMobileMenuOpen(false)} />
              
              {/* Mobile User Section */}
              {user ? (
                <div className="border-t pt-4 mt-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile?.avatar_url} alt={user.display_name || user.email} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-white">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium truncate">{user.display_name || user.email}</p>
                      <div className="flex gap-2 mt-1">
                        {hasRole('admin') && (
                          <span className="px-2 py-1 text-xs bg-destructive/10 text-destructive rounded-full">
                            Admin
                          </span>
                        )}
                        {hasRole('professional') && (
                          <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                            Pro
                          </span>
                        )}
                        {hasRole('partner') && (
                          <span className="px-2 py-1 text-xs bg-blue-500/10 text-blue-600 rounded-full">
                            Partenaire
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    asChild
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Link to="/profile">
                      <User className="w-4 h-4 mr-2" />
                      {t('navigation.myProfile')}
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Link to="/saved-itineraries">
                      <Bookmark className="w-4 h-4 mr-2" />
                      {t('navigation.savedItineraries', 'Mes itinéraires')}
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      signOut();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('navigation.logout')}
                  </Button>
                </div>
              ) : (
                <div className="border-t pt-4 mt-4">
                  <Button 
                    asChild 
                    className="w-full"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Link to="/auth">
                      {t('navigation.login')}
                    </Link>
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
          
          {/* Desktop User Actions */}
          {user ? (
            <div className="hidden md:flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(true)}
                aria-label={t('navigation.notifications')}
                className="relative p-2"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>

              {/* Profile dropdown: regroupe avatar, identité, rôle, profil et déconnexion */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" aria-label={t('navigation.myProfile')} className="gap-2 p-1 sm:pl-1 sm:pr-2 rounded-full">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={profile?.avatar_url} alt={user.display_name || user.email} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-primary-glow text-white">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden lg:inline max-w-[140px] truncate text-sm">
                      {user.display_name || user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium truncate">{user.display_name || user.email}</span>
                      <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {hasRole('admin') && (
                          <span className="px-2 py-0.5 text-xs bg-destructive/10 text-destructive rounded-full">Admin</span>
                        )}
                        {hasRole('professional') && (
                          <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">Pro</span>
                        )}
                        {hasRole('partner') && (
                          <span className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-600 rounded-full">Partenaire</span>
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      {t('navigation.myProfile')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/saved-itineraries" className="cursor-pointer">
                      <Bookmark className="w-4 h-4 mr-2" />
                      {t('navigation.savedItineraries', 'Mes itinéraires')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('navigation.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button asChild size="sm" className="px-3 sm:px-4 hidden md:flex">
              <Link to="/auth">
                <span className="hidden sm:inline">{t('navigation.login')}</span>
                <span className="sm:hidden">Login</span>
              </Link>
            </Button>
          )}
          
          {/* Mobile Notification and User Info */}
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(true)}
              aria-label={t('navigation.notifications')}
              className="relative p-2 md:hidden"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </nav>
      
      <NotificationDialog
        open={showNotifications}
        onOpenChange={setShowNotifications}
      />
    </header>
  );
};

export default Navbar;
