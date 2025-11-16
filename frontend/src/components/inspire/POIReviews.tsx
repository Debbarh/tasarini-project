import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Star, MessageCircle, Trash2, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { reviewService } from '@/services/reviewService';

interface Review {
  id: string;
  reviewer: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_detail?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface POIReviewsProps {
  touristPointId: string;
  children: React.ReactNode;
}

export const POIReviews: React.FC<POIReviewsProps> = ({
  touristPointId,
  children
}) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: ''
  });

  useEffect(() => {
    if (open) {
      fetchReviews();
    }
  }, [open, touristPointId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const data = await reviewService.getReviewsForPOI(touristPointId);
      setReviews(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des avis:', error);
      toast.error('Erreur lors du chargement des avis');
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    if (!user) {
      toast.error('Vous devez être connecté pour laisser un avis');
      return;
    }

    if (!newReview.comment.trim()) {
      toast.error('Veuillez ajouter un commentaire');
      return;
    }

    setSubmitting(true);
    try {
      await reviewService.createReview({
        tourist_point: touristPointId,
        rating: newReview.rating,
        comment: newReview.comment.trim()
      });

      toast.success('Avis ajouté avec succès !');
      setNewReview({ rating: 5, comment: '' });
      fetchReviews(); // Refresh reviews
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout de l\'avis:', error);
      if (error.status === 400 || error.payload?.tourist_point) {
        toast.error('Vous avez déjà laissé un avis pour ce lieu');
      } else {
        toast.error('Erreur lors de l\'ajout de l\'avis');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateReview = async () => {
    if (!editingReview || !user) return;

    setSubmitting(true);
    try {
      await reviewService.updateReview(editingReview.id, {
        rating: newReview.rating,
        comment: newReview.comment.trim()
      });

      toast.success('Avis mis à jour avec succès !');
      setEditingReview(null);
      setNewReview({ rating: 5, comment: '' });
      fetchReviews();
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour de l\'avis');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteReview = async (reviewId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet avis ?')) return;

    try {
      await reviewService.deleteReview(reviewId);
      toast.success('Avis supprimé');
      fetchReviews();
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const startEditing = (review: Review) => {
    setEditingReview(review);
    setNewReview({
      rating: review.rating,
      comment: review.comment
    });
  };

  const cancelEditing = () => {
    setEditingReview(null);
    setNewReview({ rating: 5, comment: '' });
  };

  const renderStars = (rating: number, interactive = false) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating 
                ? 'text-yellow-500 fill-current' 
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
            onClick={() => interactive && setNewReview(prev => ({ ...prev, rating: star }))}
          />
        ))}
      </div>
    );
  };

  const userReview = reviews.find(review => review.reviewer === String(user?.id));
  const canAddReview = user && !userReview;
  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Avis et commentaires
          </DialogTitle>
          <DialogDescription>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2">
                {renderStars(Math.round(averageRating))}
                <span>
                  {averageRating.toFixed(1)}/5 ({reviews.length} avis)
                </span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Formulaire d'ajout/modification d'avis */}
          {user && (canAddReview || editingReview) && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">
                  {editingReview ? 'Modifier votre avis' : 'Laisser un avis'}
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Note</Label>
                    {renderStars(newReview.rating, true)}
                  </div>
                  
                  <div>
                    <Label htmlFor="comment" className="text-sm">Commentaire</Label>
                    <Textarea
                      id="comment"
                      value={newReview.comment}
                      onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                      placeholder="Partagez votre expérience..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      onClick={editingReview ? updateReview : submitReview}
                      disabled={submitting}
                      size="sm"
                    >
                      {submitting 
                        ? (editingReview ? 'Mise à jour...' : 'Ajout...') 
                        : (editingReview ? 'Mettre à jour' : 'Publier')
                      }
                    </Button>
                    {editingReview && (
                      <Button 
                        variant="outline" 
                        onClick={cancelEditing}
                        size="sm"
                      >
                        Annuler
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Liste des avis */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucun avis pour le moment</p>
                <p className="text-sm">Soyez le premier à partager votre expérience !</p>
              </div>
            ) : (
              reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                         <div className="flex items-center gap-2 mb-1">
                           <span className="font-medium">
                             Utilisateur
                           </span>
                           {renderStars(review.rating)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      {String(user?.id) === review.reviewer && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(review)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteReview(review.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm">{review.comment}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};