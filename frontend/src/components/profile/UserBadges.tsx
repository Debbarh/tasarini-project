import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Award,
  Trophy,
  Book,
  Plane,
  Map,
  Globe,
  Calendar,
  Clipboard,
  Heart,
  Bookmark
} from 'lucide-react';

interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}

interface UserBadgesProps {
  badges: BadgeData[];
}

const iconMap: Record<string, React.ReactNode> = {
  book: <Book className="w-6 h-6" />,
  award: <Award className="w-6 h-6" />,
  trophy: <Trophy className="w-6 h-6" />,
  plane: <Plane className="w-6 h-6" />,
  map: <Map className="w-6 h-6" />,
  globe: <Globe className="w-6 h-6" />,
  calendar: <Calendar className="w-6 h-6" />,
  clipboard: <Clipboard className="w-6 h-6" />,
  heart: <Heart className="w-6 h-6" />,
  bookmark: <Bookmark className="w-6 h-6" />,
};

export const UserBadges: React.FC<UserBadgesProps> = ({ badges }) => {
  if (badges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Badges & Réalisations
          </CardTitle>
          <CardDescription>
            Débloquez des badges en utilisant la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            Continuez à explorer pour débloquer votre premier badge !
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Badges & Réalisations
            </CardTitle>
            <CardDescription>
              Vous avez débloqué {badges.length} badge{badges.length > 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {badges.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="relative group"
            >
              <div className="flex flex-col items-center p-4 border rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 hover:shadow-md transition-all">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform shadow-lg">
                  {iconMap[badge.icon] || <Award className="w-6 h-6" />}
                </div>
                <h3 className="font-semibold text-center text-sm mb-1">
                  {badge.name}
                </h3>
                <p className="text-xs text-muted-foreground text-center">
                  {badge.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
