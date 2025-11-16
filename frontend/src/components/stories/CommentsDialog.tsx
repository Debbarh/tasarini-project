import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Send } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { storyService, StoryComment } from "@/services/storyService";

interface CommentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string | number;
  storyTitle: string;
}

export const CommentsDialog = ({ isOpen, onClose, storyId, storyTitle }: CommentsDialogProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && storyId) {
      fetchComments();
    }
  }, [isOpen, storyId]);

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const data = await storyService.fetchComments(storyId);
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Impossible de charger les commentaires');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await storyService.addComment(storyId, newComment.trim());

      setNewComment("");
      fetchComments(); // Refresh comments
      toast.success('Commentaire ajouté !');
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error('Impossible d\'ajouter le commentaire');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAuthorName = (comment: StoryComment) => {
    if (comment.author_name) {
      return comment.author_name;
    }
    return 'Voyageur';
  };

  const getAuthorInitials = (comment: StoryComment) => {
    if (comment.author_name) {
      const parts = comment.author_name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0] || ''}${parts[1][0] || ''}` || 'V';
      }
      return parts[0][0] || 'V';
    }
    return 'V';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Commentaires - {storyTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground">
              Chargement des commentaires...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun commentaire pour le moment.</p>
              <p className="text-sm">Soyez le premier à partager votre avis !</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className="text-xs">
                    {getAuthorInitials(comment)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {getAuthorName(comment)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), "dd MMM à HH:mm", { locale: fr })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {user && (
          <div className="border-t pt-4 space-y-3">
            <Textarea
              placeholder="Partagez votre avis sur cette story..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none"
              maxLength={500}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {newComment.length}/500 caractères
              </span>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
                size="sm"
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Envoi...' : 'Commenter'}
              </Button>
            </div>
          </div>
        )}

        {!user && (
          <div className="border-t pt-4 text-center text-muted-foreground">
            <p>Connectez-vous pour commenter cette story</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
