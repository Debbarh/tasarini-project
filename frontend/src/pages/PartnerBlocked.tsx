import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const PartnerBlocked: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: user?.email || '',
    subject: t('partnerBlocked.contact.subjectDefault'),
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
      
      toast.success(t('partnerBlocked.toast.success'));
      
      // Réinitialiser le formulaire sauf l'email
      setFormData(prev => ({
        ...prev,
        name: '',
        subject: t('partnerBlocked.contact.subjectDefault'),
        message: ''
      }));
    } catch (error) {
      toast.error(t('partnerBlocked.toast.error'));
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
              {t('partnerBlocked.pageTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              {t('partnerBlocked.description')}
            </p>
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm text-destructive">
                <strong>{t('partnerBlocked.reasons.title')}</strong>
              </p>
              <ul className="text-sm text-destructive mt-2 text-left list-disc list-inside">
                <li>{t('partnerBlocked.reasons.incorrect')}</li>
                <li>{t('partnerBlocked.reasons.terms')}</li>
                <li>{t('partnerBlocked.reasons.suspicious')}</li>
                <li>{t('partnerBlocked.reasons.criteria')}</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Formulaire de contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              {t('partnerBlocked.contact.title')}
            </CardTitle>
            <p className="text-muted-foreground">
              {t('partnerBlocked.contact.subtitle')}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('partnerBlocked.contact.nameLabel')} {t('partnerBlocked.contact.required')}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    required
                    placeholder={t('partnerBlocked.contact.namePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('partnerBlocked.contact.emailLabel')} {t('partnerBlocked.contact.required')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    required
                    placeholder={t('partnerBlocked.contact.emailPlaceholder')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">{t('partnerBlocked.contact.subjectLabel')} {t('partnerBlocked.contact.required')}</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => updateFormData('subject', e.target.value)}
                  required
                  placeholder={t('partnerBlocked.contact.subjectPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">{t('partnerBlocked.contact.messageLabel')} {t('partnerBlocked.contact.required')}</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => updateFormData('message', e.target.value)}
                  required
                  rows={6}
                  placeholder={t('partnerBlocked.contact.messagePlaceholder')}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  t('partnerBlocked.contact.submitting')
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {t('partnerBlocked.contact.submitButton')}
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
                <strong>{t('partnerBlocked.info.responseTime')}</strong> {t('partnerBlocked.info.responseTimeText')}
              </p>
              <p className="mt-2">
                {t('partnerBlocked.info.urgentQuestion')}
                <br />
                <strong>{t('partnerBlocked.info.supportEmail')}</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PartnerBlocked;