import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, UserMinus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/integrations/api/client';

interface Follow {
  id: string;
  follower_username: string;
  following_username: string;
  follower_display_name: string;
  following_display_name: string;
  follower: string;
  following: string;
  created_at: string;
}

export const FollowersFollowing: React.FC = () => {
  const [followers, setFollowers] = useState<Follow[]>([]);
  const [following, setFollowing] = useState<Follow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFollowData();
  }, []);

  const fetchFollowData = async () => {
    setLoading(true);
    try {
      const [followersData, followingData] = await Promise.all([
        apiClient.get<Follow[]>('accounts/follows/followers/'),
        apiClient.get<Follow[]>('accounts/follows/following/')
      ]);
      setFollowers(followersData || []);
      setFollowing(followingData || []);
    } catch (error) {
      console.error('Error fetching follow data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (username: string) => {
    try {
      await apiClient.post('accounts/follows/unfollow/', { username });
      toast.success(`Vous ne suivez plus ${username}`);
      fetchFollowData();
    } catch (error) {
      console.error('Error unfollowing:', error);
      toast.error('Erreur lors de l\'action');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Réseau Social
        </CardTitle>
        <CardDescription>
          Gérez vos abonnés et abonnements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="following" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="following">
              Abonnements <Badge className="ml-2" variant="secondary">{following.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="followers">
              Abonnés <Badge className="ml-2" variant="secondary">{followers.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="following" className="space-y-4">
            {following.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Vous ne suivez personne pour le moment</p>
              </div>
            ) : (
              <div className="space-y-3">
                {following.map((follow) => (
                  <div
                    key={follow.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={''} alt={follow.following_display_name} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-white">
                          {getInitials(follow.following_display_name || follow.following_username)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {follow.following_display_name || follow.following_username}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @{follow.following_username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Depuis le {formatDate(follow.created_at)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnfollow(follow.following_username)}
                    >
                      <UserMinus className="w-4 h-4 mr-1" />
                      Ne plus suivre
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="followers" className="space-y-4">
            {followers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Personne ne vous suit pour le moment</p>
              </div>
            ) : (
              <div className="space-y-3">
                {followers.map((follow) => (
                  <div
                    key={follow.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={''} alt={follow.follower_display_name} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-white">
                          {getInitials(follow.follower_display_name || follow.follower_username)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {follow.follower_display_name || follow.follower_username}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @{follow.follower_username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Depuis le {formatDate(follow.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
