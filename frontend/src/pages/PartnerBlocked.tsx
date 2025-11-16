import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const PartnerBlocked: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: user?.email || '',
    subject: 'Demande de réévaluation de mon compte partenaire',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Ici vous pouvez ajouter l'envoi d'email via un edge function
      // Pour l'instant, on simule l'envoi
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Votre message a été envoyé. Nous vous répondrons dans les plus brefs délais.');
      
      // Réinitialiser le formulaire sauf l'email
      setFormData(prev => ({
        ...prev,
        name: '',
        subject: 'Demande de réévaluation de mon compte partenaire',
        message: ''
      }));
    } catch (error) {
      toast.error('Erreur lors de l\'envoi du message. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Message d'avertissement */}
        <Card className="border-destructive">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center gap-2 justify-center text-destructive">
              <AlertTriangle className="w-6 h-6" />
              Compte Partenaire Bloqué
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Votre candidature partenaire a été refusée ou votre compte a été suspendu. 
              Si vous pensez qu'il s'agit d'une erreur, vous pouvez nous contacter via le formulaire ci-dessous.
            </p>
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm text-destructive">
                <strong>Raisons possibles :</strong>
              </p>
              <ul className="text-sm text-destructive mt-2 text-left list-disc list-inside">
                <li>Informations incorrectes ou incomplètes</li>
                <li>Non-respect des conditions d'utilisation</li>
                <li>Activité suspecte détectée</li>
                <li>Critères de partenariat non respectés</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Formulaire de contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Contacter l'Administration
            </CardTitle>
            <p className="text-muted-foreground">
              Expliquez votre situation et nous examinerons votre demande.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    required
                    placeholder="Votre nom complet"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    required
                    placeholder="votre@email.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Sujet *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => updateFormData('subject', e.target.value)}
                  required
                  placeholder="Objet de votre demande"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => updateFormData('message', e.target.value)}
                  required
                  rows={6}
                  placeholder="Décrivez votre situation et les raisons pour lesquelles votre compte devrait être réévalué..."
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  'Envoi en cours...'
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer ma demande
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Information supplémentaire */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p>
                <strong>Temps de réponse :</strong> Nous nous efforçons de répondre sous 48-72 heures.
              </p>
              <p className="mt-2">
                Pour des questions urgentes, vous pouvez également nous contacter à :
                <br />
                <strong>support@voyageai.com</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PartnerBlocked;