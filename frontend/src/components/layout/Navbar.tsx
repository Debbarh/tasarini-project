import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LanguageSelector } from "@/components/ui/language-selector";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationDialog } from "@/components/notifications/NotificationDialog";
import { LogOut, User, Building2, Bell, Menu, X } from "lucide-react";

const Navbar = () => {
  const { user, profile, signOut, hasRole } = useAuth();
  const { getUnreadCount } = useNotifications();
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
      <NavLink 
        to="/plan" 
        className={({isActive}) => `${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"} ${mobile ? "text-lg" : ""}`}
        onClick={onLinkClick}
      >
        {t('navigation.createTrip')}
      </NavLink>
      <NavLink 
        to="/inspire" 
        className={({isActive}) => `${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"} ${mobile ? "text-lg" : ""}`}
        onClick={onLinkClick}
      >
        {t('navigation.exploreWorld')}
      </NavLink>
      <NavLink 
        to="/travel-stories" 
        className={({isActive}) => `${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"} ${mobile ? "text-lg" : ""}`}
        onClick={onLinkClick}
      >
        {t('navigation.travelStories')}
      </NavLink>
      {user && (
        <NavLink 
          to="/my-discoveries" 
          className={({isActive}) => `${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"} ${mobile ? "text-lg" : ""}`}
          onClick={onLinkClick}
        >
          {t('navigation.myTreasures')}
        </NavLink>
      )}
      {hasRole('partner') && (
        <NavLink 
          to="/partner-center" 
          className={({isActive}) => `${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"} ${mobile ? "text-lg" : ""}`}
          onClick={onLinkClick}
        >
          {t('navigation.partnerSpace')}
        </NavLink>
      )}
      {hasRole('admin') && (
        <NavLink 
          to="/admin" 
          className={({isActive}) => `${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"} ${mobile ? "text-lg" : ""}`}
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
            src="/lovable-uploads/070b3052-89a5-4274-add2-2a60a3411cf2.png"
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
          <ThemeToggle />
          <LanguageSelector variant="compact" />

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
              
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="gap-1 sm:gap-2 p-2 sm:px-3"
              >
                <Link to="/profile" className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={profile?.avatar_url} alt={user.display_name || user.email} />
                    <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-primary-glow text-white">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:inline">{t('navigation.myProfile')}</span>
                </Link>
              </Button>
              
              <div className="hidden lg:flex items-center gap-2 text-sm">
                <span className="text-foreground/80 max-w-[120px] truncate">
                  {user.email}
                </span>
                {hasRole('admin') && (
                  <span className="px-2 py-1 text-xs bg-destructive/10 text-destructive rounded-full whitespace-nowrap">
                    Admin
                  </span>
                )}
                {hasRole('professional') && (
                  <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full whitespace-nowrap">
                    Pro
                  </span>
                )}
                {hasRole('partner') && (
                  <span className="px-2 py-1 text-xs bg-blue-500/10 text-blue-600 rounded-full whitespace-nowrap">
                    Partenaire
                  </span>
                )}
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={signOut}
                className="gap-1 sm:gap-2 p-2 sm:px-3"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline">{t('navigation.logout')}</span>
              </Button>
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
