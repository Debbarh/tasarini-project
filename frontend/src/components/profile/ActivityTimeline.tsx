import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Book, Plane, Map } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Activity {
  type: string;
  action: string;
  title: string;
  date: string;
  icon: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

const iconMap: Record<string, React.ReactNode> = {
  book: <Book className="w-4 h-4" />,
  plane: <Plane className="w-4 h-4" />,
  map: <Map className="w-4 h-4" />,
};

const colorMap: Record<string, string> = {
  story: 'bg-purple-500',
  booking: 'bg-blue-500',
  itinerary: 'bg-green-500',
};

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Activité récente
          </CardTitle>
          <CardDescription>
            Vos 10 dernières actions sur la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            Aucune activité récente
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Activité récente
        </CardTitle>
        <CardDescription>
          Vos {activities.length} dernières actions sur la plateforme
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />

          <div className="space-y-4">
            {activities.map((activity, index) => {
              const activityDate = new Date(activity.date);
              const timeAgo = formatDistanceToNow(activityDate, {
                addSuffix: true,
                locale: fr,
              });

              return (
                <div key={index} className="relative flex items-start gap-4 pl-0">
                  {/* Timeline dot */}
                  <div
                    className={`
                      flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                      ${colorMap[activity.type] || 'bg-gray-500'}
                      text-white shadow-md z-10
                    `}
                  >
                    {iconMap[activity.icon] || <Clock className="w-4 h-4" />}
                  </div>

                  {/* Activity content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">
                          {activity.action}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activity.title}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {timeAgo}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
