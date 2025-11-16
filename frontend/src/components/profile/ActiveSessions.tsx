import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Monitor, Smartphone, Tablet, MapPin, Clock, LogOut, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/integrations/api/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Session {
  id: string;
  device_type: string;
  browser: string;
  os: string;
  ip_address: string;
  location?: string;
  is_current: boolean;
  last_activity: string;
  created_at: string;
}

export const ActiveSessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Session[]>('accounts/sessions/');
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Erreur lors du chargement des sessions');
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    if (!confirm('Voulez-vous vraiment déconnecter cette session ?')) {
      return;
    }

    try {
      setRevoking(sessionId);
      await apiClient.delete(`accounts/sessions/${sessionId}/`);
      toast.success('Session déconnectée avec succès');
      fetchSessions();
    } catch (error) {
      console.error('Error revoking session:', error);
      toast.error('Erreur lors de la déconnexion de la session');
    } finally {
      setRevoking(null);
    }
  };

  const revokeAllOtherSessions = async () => {
    if (!confirm('Voulez-vous déconnecter toutes les autres sessions ? Vous resterez connecté sur cet appareil.')) {
      return;
    }

    try {
      setLoading(true);
      await apiClient.post('accounts/sessions/revoke-all-others/');
      toast.success('Toutes les autres sessions ont été déconnectées');
      fetchSessions();
    } catch (error) {
      console.error('Error revoking sessions:', error);
      toast.error('Erreur lors de la déconnexion des sessions');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-5 w-5 text-blue-500" />;
      case 'tablet':
        return <Tablet className="h-5 w-5 text-purple-500" />;
      default:
        return <Monitor className="h-5 w-5 text-green-500" />;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays} jours`;

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  if (loading && sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessions actives</CardTitle>
          <CardDescription>Chargement...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sessions actives</CardTitle>
            <CardDescription>
              Gérez vos sessions de connexion actives sur différents appareils
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchSessions}
              disabled={loading}
            >
              Recharger
            </Button>
            {sessions.filter(s => !s.is_current).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={revokeAllOtherSessions}
                disabled={loading}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Déconnecter les autres
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Aucune session active trouvée.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {sessions.map((session, index) => (
              <div key={session.id}>
                {index > 0 && <Separator />}
                <div className="flex items-start gap-4 py-3">
                  <div className="mt-1">{getDeviceIcon(session.device_type)}</div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {session.browser} sur {session.os}
                      </span>
                      {session.is_current && (
                        <Badge variant="default" className="text-xs">
                          Session actuelle
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{session.ip_address}</span>
                        {session.location && <span className="text-xs">({session.location})</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDateTime(session.last_activity)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Connecté depuis le {new Date(session.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  {!session.is_current && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revokeSession(session.id)}
                      disabled={revoking === session.id}
                      className="text-destructive hover:text-destructive"
                    >
                      {revoking === session.id ? (
                        'Déconnexion...'
                      ) : (
                        <>
                          <LogOut className="h-4 w-4 mr-1" />
                          Déconnecter
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Separator />

        <div className="pt-2">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Conseil de sécurité :</strong> Si vous voyez une session que vous ne reconnaissez pas,
            déconnectez-la immédiatement et changez votre mot de passe.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
