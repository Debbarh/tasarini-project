import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  itemName: string;
  itemType: 'POI' | 'restaurant' | 'accommodation' | 'activity' | 'point';
  warningText?: string;
  requireConfirmation?: boolean;
}

export const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType,
  warningText,
  requireConfirmation = false,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  const handleConfirm = async () => {
    if (requireConfirmation && confirmationText !== 'SUPPRIMER') {
      return;
    }

    setIsDeleting(true);
    try {
      await onConfirm();
      handleClose();
    } catch (error) {
      console.error('Error during deletion:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmationText('');
      onClose();
    }
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'POI':
        return 'point d\'intérêt';
      case 'restaurant':
        return 'restaurant';
      case 'accommodation':
        return 'hébergement';
      case 'activity':
        return 'activité';
      case 'point':
        return 'point d\'intérêt';
      default:
        return 'élément';
    }
  };

  const canConfirm = !requireConfirmation || confirmationText === 'SUPPRIMER';

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle className="text-left">
                {title}
              </AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-left mt-4">
            <div className="space-y-3">
              <p>
                Vous êtes sur le point de supprimer définitivement le {getItemTypeLabel(itemType)} :
              </p>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-foreground">"{itemName}"</p>
              </div>
              <div className="space-y-2">
                <p className="text-destructive font-medium">
                  ⚠️ Cette action est irréversible
                </p>
                <p>
                  Une fois supprimé, cet élément ne pourra pas être récupéré. Toutes les données associées seront perdues.
                </p>
                {warningText && (
                  <p className="text-orange-600 font-medium">
                    {warningText}
                  </p>
                )}
              </div>
            </div>
          </AlertDialogDescription>

          {requireConfirmation && (
            <div className="mt-4 space-y-2">
              <Label htmlFor="confirmation" className="text-sm font-medium">
                Pour confirmer la suppression, tapez <span className="font-bold">SUPPRIMER</span> ci-dessous :
              </Label>
              <Input
                id="confirmation"
                type="text"
                placeholder="Tapez SUPPRIMER"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                disabled={isDeleting}
                className="mt-1"
              />
            </div>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={isDeleting} onClick={handleClose}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={!canConfirm || isDeleting}
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Suppression...
              </>
            ) : (
              'Supprimer définitivement'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};