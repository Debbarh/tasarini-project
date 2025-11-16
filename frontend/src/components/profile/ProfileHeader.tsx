import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Heart, BookOpen, FileText } from 'lucide-react';

interface ProfileHeaderProps {
  user: {
    display_name?: string;
    email?: string;
    role?: string;
  };
  profile?: {
    avatar_url?: string;
    bio?: string;
    created_at?: string;
    phone_number?: string;
  };
  stats?: {
    stories?: number;
    favorites?: number;
    bookings?: number;
    bookmarks?: number;
  };
}

export const ProfileHeader = ({ user, profile, stats }: ProfileHeaderProps) => {
  const getInitials = () => {
    const name = user?.display_name || user?.email || 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'partner':
        return 'default';
      case 'admin':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'partner':
        return 'Partenaire';
      case 'admin':
        return 'Administrateur';
      default:
        return 'Voyageur';
    }
  };

  const formatMemberSince = (date?: string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  return (
    <Card className="mb-6 overflow-hidden border-none shadow-lg bg-gradient-to-br from-primary/5 via-background to-background">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
          {/* Avatar Section */}
          <div className="relative">
            <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-xl ring-2 ring-primary/20">
              <AvatarImage src={profile?.avatar_url} alt={user?.display_name} />
              <AvatarFallback className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-primary to-primary-glow text-white">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-1 shadow-md">
              <Badge variant={getRoleBadgeVariant(user?.role)} className="text-xs px-2 py-0.5">
                {getRoleLabel(user?.role)}
              </Badge>
            </div>
          </div>

          {/* User Info Section */}
          <div className="flex-1 space-y-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {user?.display_name || 'Utilisateur'}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">{user?.email}</p>
            </div>

            {profile?.bio && (
              <p className="text-foreground/80 max-w-2xl line-clamp-2">
                {profile.bio}
              </p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {profile?.created_at && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>Membre depuis {formatMemberSince(profile.created_at)}</span>
                </div>
              )}
              {profile?.phone_number && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.phone_number}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
            <div className="flex flex-col items-center p-4 rounded-lg bg-background/50 border border-border/50 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold text-foreground">
                  {stats?.stories || 0}
                </span>
              </div>
              <span className="text-xs text-muted-foreground text-center">Stories</span>
            </div>

            <div className="flex flex-col items-center p-4 rounded-lg bg-background/50 border border-border/50 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="h-4 w-4 text-rose-500" />
                <span className="text-2xl font-bold text-foreground">
                  {stats?.favorites || 0}
                </span>
              </div>
              <span className="text-xs text-muted-foreground text-center">Favoris</span>
            </div>

            <div className="flex flex-col items-center p-4 rounded-lg bg-background/50 border border-border/50 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="h-4 w-4 text-blue-500" />
                <span className="text-2xl font-bold text-foreground">
                  {stats?.bookmarks || 0}
                </span>
              </div>
              <span className="text-xs text-muted-foreground text-center">Sauvegardés</span>
            </div>

            <div className="flex flex-col items-center p-4 rounded-lg bg-background/50 border border-border/50 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-emerald-500" />
                <span className="text-2xl font-bold text-foreground">
                  {stats?.bookings || 0}
                </span>
              </div>
              <span className="text-xs text-muted-foreground text-center">Voyages</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
