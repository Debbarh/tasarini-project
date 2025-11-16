import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";

interface SaveItineraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (title: string, description?: string) => Promise<boolean>;
  loading?: boolean;
}

const SaveItineraryDialog = ({ 
  open, 
  onOpenChange, 
  onSave, 
  loading = false 
}: SaveItineraryDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;

    setSaving(true);
    const success = await onSave(title.trim(), description.trim() || undefined);
    setSaving(false);

    if (success) {
      setTitle("");
      setDescription("");
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Sauvegarder l'itinéraire
          </DialogTitle>
          <DialogDescription>
            Donnez un nom à votre itinéraire pour le retrouver facilement plus tard.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">
              Titre de l'itinéraire <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Ex: Escapade au Maroc - Fès 3 jours"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Description (optionnelle)</Label>
            <Textarea
              id="description"
              placeholder="Notes personnelles sur ce voyage..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!title.trim() || saving || loading}
          >
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveItineraryDialog;