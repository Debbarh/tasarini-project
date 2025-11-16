import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AlertTriangle, Check, X, Flag, MessageSquare, MapPin, 
  Calendar, User, Star, ExternalLink
} from 'lucide-react';
import { adminPoiService } from '@/services/adminPoiService';
import { storyService } from '@/services/storyService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ReviewToModerate {
  id: string;
  content: string;
  rating?: number | null;
  created_at: string;
  reviewer_email?: string;
  tourist_point_name?: string;
  tourist_point_id?: string;
  is_flagged: boolean;
  flag_reason?: string;
}

interface POIToModerate {
  id: string;
  name: string;
  description: string;
  created_at: string;
  owner_email?: string;
  is_verified: boolean;
  is_active: boolean;
  rating?: number;
  review_count?: number;
  tags: string[];
  reported_count: number;
  status?: string;
}

interface ModerationStats {
  pending_reviews: number;
  pending_pois: number;
  flagged_content: number;
  moderated_today: number;
}

export const BeInspiredModeration = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reviewsToModerate, setReviewsToModerate] = useState<ReviewToModerate[]>([]);
  const [poisToModerate, setPoisToModerate] = useState<POIToModerate[]>([]);
  const [stats, setStats] = useState<ModerationStats>({
    pending_reviews: 0,
    pending_pois: 0,
    flagged_content: 0,
    moderated_today: 0
  });
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [moderationNote, setModerationNote] = useState('');

  useEffect(() => {
    loadModerationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadModerationData = async () => {
    setLoading(true);
    try {
      const [reviews, pois] = await Promise.all([fetchReviewsToModerate(), fetchPOIsToModerate()]);
      setReviewsToModerate(reviews);
      setPoisToModerate(pois);
      recomputeStats(reviews, pois, 0);
    } catch (error) {
      console.error('Erreur lors du chargement des données de modération:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de modération",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewsToModerate = async (): Promise<ReviewToModerate[]> => {
    const stories = await storyService.fetchStories({ sort: 'newest', limit: 40 });
    return (stories ?? [])
      .filter((story) => !story.is_verified)
      .map((story) => ({
        id: String(story.id),
        content: story.content || story.title || '',
        rating: Math.min(5, Math.max(1, Math.round((story.likes_count ?? 0) / 5))) || null,
        created_at: story.created_at,
        reviewer_email: story.author_name ?? `Utilisateur #${story.author}`,
        tourist_point_name: story.location_name ?? 'Non renseigné',
        tourist_point_id: story.tourist_point ? String(story.tourist_point) : undefined,
        is_flagged: (story.story_type ?? '').includes('flagged') || !story.is_verified,
        flag_reason: (story.tags ?? []).includes('flagged') ? 'Signalé par la communauté' : undefined
      }));
  };

  const fetchPOIsToModerate = async (): Promise<POIToModerate[]> => {
    const data = await adminPoiService.list({ ordering: '-created_at', is_verified: false });
    return (data ?? []).map((poi) => ({
      id: poi.id,
      name: poi.name ?? 'Point d’intérêt',
      description: poi.description ?? '',
      created_at: poi.created_at,
      owner_email: poi.owner_detail?.email,
      is_verified: poi.is_verified,
      is_active: poi.is_active,
      rating: poi.rating ?? 0,
      review_count: poi.review_count ?? 0,
      tags: (poi.tags ?? []).map((tag: any) => tag.label_fr ?? tag.code ?? tag).slice(0, 6),
      reported_count: Number((poi.metadata ?? {}).reported_count ?? (poi.metadata ?? {}).reports ?? 0),
      status: poi.status_enum
    }));
  };

  const recomputeStats = (
    updatedReviews: ReviewToModerate[],
    updatedPois: POIToModerate[],
    moderatedIncrement: number
  ) => {
    const flaggedReviews = updatedReviews.filter((review) => review.is_flagged).length;
    const flaggedPois = updatedPois.filter((poi) => poi.reported_count > 0).length;
    setStats((prev) => ({
      pending_reviews: updatedReviews.length,
      pending_pois: updatedPois.length,
      flagged_content: flaggedReviews + flaggedPois,
      moderated_today: (prev?.moderated_today ?? 0) + moderatedIncrement
    }));
  };

  const moderateReview = async (reviewId: string, action: 'approve' | 'reject', note?: string) => {
    try {
      const numericId = Number(reviewId);
      if (Number.isNaN(numericId)) {
        throw new Error('Identifiant de contenu invalide');
      }
      if (action === 'approve') {
        await storyService.updateStory(numericId, { is_verified: true, is_public: true });
      } else {
        await storyService.updateStory(numericId, { is_public: false, is_verified: false });
      }

      toast({
        title: action === 'approve' ? "Avis approuvé" : "Avis rejeté",
        description: `Le contenu a été ${action === 'approve' ? 'validé' : 'retiré'}${note ? ` (${note})` : ''}`
      });

      const updatedReviews = reviewsToModerate.filter((review) => review.id !== reviewId);
      setReviewsToModerate(updatedReviews);
      recomputeStats(updatedReviews, poisToModerate, 1);
      setModerationNote('');
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Impossible de modérer l'avis",
        variant: "destructive"
      });
    }
  };

  const moderatePOI = async (poiId: string, action: 'approve' | 'reject', note?: string) => {
    try {
      await adminPoiService.moderate(poiId, {
        status: action === 'approve' ? 'approved' : 'rejected',
        reason: note ?? '',
        admin_message: note
      });

      toast({
        title: action === 'approve' ? "POI approuvé" : "POI rejeté",
        description: `Le point d'intérêt a été ${action === 'approve' ? 'approuvé' : 'rejeté'}`
      });

      const updatedPois = poisToModerate.filter((poi) => poi.id !== poiId);
      setPoisToModerate(updatedPois);
      recomputeStats(reviewsToModerate, updatedPois, 1);
      setModerationNote('');
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Impossible de modérer le POI",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold">Modération du contenu</h3>
        <p className="text-muted-foreground">
          Gestion et validation du contenu généré par les utilisateurs
        </p>
      </div>

      {/* Stats de modération */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avis en attente</p>
                <p className="text-2xl font-bold">{stats.pending_reviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">POIs en attente</p>
                <p className="text-2xl font-bold">{stats.pending_pois}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Contenu signalé</p>
                <p className="text-2xl font-bold">{stats.flagged_content}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Modéré aujourd'hui</p>
                <p className="text-2xl font-bold">{stats.moderated_today}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenu principal */}
      <Tabs defaultValue="reviews" className="space-y-6">
        <TabsList>
          <TabsTrigger value="reviews" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Avis à modérer ({reviewsToModerate.length})
          </TabsTrigger>
          <TabsTrigger value="pois" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            POIs à valider ({poisToModerate.length})
          </TabsTrigger>
        </TabsList>

        {/* Modération des avis */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Avis en attente de modération</CardTitle>
            </CardHeader>
            <CardContent>
              {reviewsToModerate.length === 0 ? (
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertDescription>
                    Aucun avis en attente de modération. Excellent travail !
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Avis</TableHead>
                        <TableHead>POI</TableHead>
                        <TableHead>Auteur</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviewsToModerate.map((review) => (
                        <TableRow key={review.id}>
                          <TableCell>
                            <div className="max-w-xs">
                              <div className="flex items-center gap-1 mb-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i < (review.rating ?? 0)
                                        ? 'fill-yellow-400 text-yellow-400' 
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <p className="text-sm truncate">{review.content}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{review.tourist_point_name ?? 'Non renseigné'}</span>
                          </TableCell>
                          <TableCell>{review.reviewer_email ?? 'Utilisateur inconnu'}</TableCell>
                          <TableCell>
                            {format(new Date(review.created_at), 'dd/MM/yyyy', { locale: fr })}
                          </TableCell>
                          <TableCell>
                            {review.is_flagged ? (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <Flag className="w-3 h-3" />
                                Signalé
                              </Badge>
                            ) : (
                              <Badge variant="secondary">En attente</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    Détails
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Modération d'avis</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-medium">Avis complet :</h4>
                                      <p className="text-sm text-muted-foreground">{review.content}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium">Note de modération :</h4>
                                      <Textarea
                                        value={moderationNote}
                                        onChange={(e) => setModerationNote(e.target.value)}
                                        placeholder="Optionnel : raison de la décision..."
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => moderateReview(review.id, 'approve', moderationNote)}
                                        className="flex items-center gap-1"
                                      >
                                        <Check className="w-4 h-4" />
                                        Approuver
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        onClick={() => moderateReview(review.id, 'reject', moderationNote)}
                                        className="flex items-center gap-1"
                                      >
                                        <X className="w-4 h-4" />
                                        Rejeter
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validation des POIs */}
        <TabsContent value="pois">
          <Card>
            <CardHeader>
              <CardTitle>Points d'intérêt à valider</CardTitle>
            </CardHeader>
            <CardContent>
              {poisToModerate.length === 0 ? (
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertDescription>
                    Aucun point d'intérêt en attente de validation.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Propriétaire</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>Avis</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Signalements</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {poisToModerate.map((poi) => (
                        <TableRow key={poi.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{poi.name}</p>
                              <div className="flex gap-1 mt-1">
                                {poi.tags.slice(0, 2).map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{poi.owner_email ?? 'Non attribué'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              {poi.rating.toFixed(1)}
                            </div>
                          </TableCell>
                          <TableCell>{poi.review_count}</TableCell>
                          <TableCell>
                            {format(new Date(poi.created_at), 'dd/MM/yyyy', { locale: fr })}
                          </TableCell>
                          <TableCell>
                            {poi.reported_count > 0 ? (
                              <Badge variant="destructive">{poi.reported_count}</Badge>
                            ) : (
                              <Badge variant="secondary">0</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    Examiner
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Validation du POI</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-medium">Description :</h4>
                                      <p className="text-sm text-muted-foreground">{poi.description}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium">Tags :</h4>
                                      <div className="flex gap-1 flex-wrap">
                                        {poi.tags.map(tag => (
                                          <Badge key={tag} variant="outline">{tag}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-medium">Note de validation :</h4>
                                      <Textarea
                                        value={moderationNote}
                                        onChange={(e) => setModerationNote(e.target.value)}
                                        placeholder="Optionnel : commentaires pour la validation..."
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => moderatePOI(poi.id, 'approve', moderationNote)}
                                        className="flex items-center gap-1"
                                      >
                                        <Check className="w-4 h-4" />
                                        Approuver
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        onClick={() => moderatePOI(poi.id, 'reject', moderationNote)}
                                        className="flex items-center gap-1"
                                      >
                                        <X className="w-4 h-4" />
                                        Rejeter
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
