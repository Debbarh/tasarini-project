import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Phone, Mail, Globe, Clock } from 'lucide-react';
import { UnifiedPOIFormData } from '@/types/poi-form';

interface ContactSectionProps {
  formData: UnifiedPOIFormData;
  updateField: <K extends keyof UnifiedPOIFormData>(field: K, value: UnifiedPOIFormData[K]) => void;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export const ContactSection: React.FC<ContactSectionProps> = ({
  formData,
  updateField,
  errors,
  warnings
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Informations de contact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="contact_phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Téléphone
          </Label>
          <Input
            id="contact_phone"
            type="tel"
            value={formData.contact_phone}
            onChange={(e) => updateField('contact_phone', e.target.value)}
            placeholder="+33 1 23 45 67 89"
            className={errors.contact_phone ? 'border-destructive' : ''}
          />
          {errors.contact_phone && (
            <p className="text-sm text-destructive mt-1">{errors.contact_phone}</p>
          )}
        </div>

        <div>
          <Label htmlFor="contact_email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </Label>
          <Input
            id="contact_email"
            type="email"
            value={formData.contact_email}
            onChange={(e) => updateField('contact_email', e.target.value)}
            placeholder="contact@exemple.fr"
            className={errors.contact_email ? 'border-destructive' : ''}
          />
          {errors.contact_email && (
            <p className="text-sm text-destructive mt-1">{errors.contact_email}</p>
          )}
        </div>

        <div>
          <Label htmlFor="website_url" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Site web
          </Label>
          <Input
            id="website_url"
            type="url"
            value={formData.website_url}
            onChange={(e) => updateField('website_url', e.target.value)}
            placeholder="https://www.exemple.fr"
            className={errors.website_url ? 'border-destructive' : ''}
          />
          {errors.website_url && (
            <p className="text-sm text-destructive mt-1">{errors.website_url}</p>
          )}
        </div>

        {/* Opening hours are now handled by OpeningHoursSection in UnifiedPOIForm */}

        {warnings.contact && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">{warnings.contact}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};