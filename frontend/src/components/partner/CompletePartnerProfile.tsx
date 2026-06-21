import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CountrySelect } from '@/components/ui/country-select';
import { CitySelect } from '@/components/ui/city-select';
import { toast } from 'sonner';
import {
  Building2, MapPin, Phone, ShieldCheck, ClipboardCheck,
  ChevronRight, ChevronLeft, CheckCircle, AlertCircle, Loader2, Upload, FileCheck2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import {
  partnerService,
  type PartnerProfile,
  type PartnerKYC,
  type PartnerKYCDocType,
} from '@/services/partnerService';

const CATEGORIES = [
  'accommodation', 'restaurant', 'cafe', 'bar', 'activity', 'museum', 'shop', 'transport', 'service', 'other',
];

const KYC_DOCS: { type: PartnerKYCDocType; required: boolean }[] = [
  { type: 'business_registration', required: true },
  { type: 'representative_id', required: true },
  { type: 'bank_rib', required: true },
  { type: 'proof_of_address', required: false },
];

const CompletePartnerProfile: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [kyc, setKyc] = useState<PartnerKYC | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Form state (établissement / localisation / contact)
  const [form, setForm] = useState({
    company_name: '', business_category: '', description: '',
    country: '', country_name: '', city: '', city_name: '',
    address: '', postal_code: '', contact_phone: '', website: '',
    facebook: '', instagram: '',
  });
  // KYC form state
  const [kycForm, setKycForm] = useState({
    legal_name: '', legal_form: '', registration_number: '', vat_number: '', tax_id: '',
    registered_address: '', rep_full_name: '', rep_date_of_birth: '', rep_nationality: '',
  });

  const TOTAL_STEPS = 5;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, k] = await Promise.all([
        partnerService.getMyProfile(),
        partnerService.getMyKyc().catch(() => null),
      ]);
      setProfile(p);
      setKyc(k);
      if (p) {
        const md: any = p.metadata || {};
        setForm({
          company_name: p.company_name || '',
          business_category: (p as any).business_category || '',
          description: (p as any).description || md.description || '',
          country: (p as any).country || '',
          country_name: (p as any).country_name || '',
          city: (p as any).city || '',
          city_name: (p as any).city_name || '',
          address: (p as any).address || '',
          postal_code: (p as any).postal_code || '',
          contact_phone: (p as any).contact_phone || '',
          website: p.website || '',
          facebook: md.social_media?.facebook || '',
          instagram: md.social_media?.instagram || '',
        });
        // Si déjà soumis/approuvé, rediriger vers l'espace partenaire.
        if (p.status && !['draft', 'rejected'].includes(p.status)) {
          navigate('/partner-center');
          return;
        }
      }
      if (k) {
        setKycForm({
          legal_name: k.legal_name || '', legal_form: k.legal_form || '',
          registration_number: k.registration_number || '', vat_number: k.vat_number || '',
          tax_id: k.tax_id || '', registered_address: k.registered_address || '',
          rep_full_name: k.rep_full_name || '', rep_date_of_birth: k.rep_date_of_birth || '',
          rep_nationality: k.rep_nationality || '',
        });
      }
    } catch (e) {
      toast.error(t('partnerOnboarding.errors.loadError', 'Impossible de charger votre profil.'));
    } finally {
      setLoading(false);
    }
  }, [navigate, t]);

  useEffect(() => { if (user) load(); }, [user, load]);

  const setF = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));
  const setK = (k: string, v: string) => setKycForm((s) => ({ ...s, [k]: v }));

  // Persiste l'étape courante côté serveur (brouillon).
  const saveProfileStep = async () => {
    if (!profile) return false;
    setSaving(true);
    try {
      const updated = await partnerService.updateProfile(profile.id, {
        company_name: form.company_name,
        business_category: form.business_category,
        description: form.description,
        country: form.country || null,
        city: form.city || null,
        address: form.address,
        postal_code: form.postal_code,
        contact_phone: form.contact_phone,
        website: form.website || null,
        metadata: { ...(profile.metadata || {}), social_media: { facebook: form.facebook, instagram: form.instagram } },
      });
      setProfile(updated);
      return true;
    } catch {
      toast.error(t('partnerOnboarding.errors.saveError', 'Échec de l’enregistrement.'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveKyc = async () => {
    setSaving(true);
    try {
      const updated = await partnerService.updateMyKyc({
        legal_name: kycForm.legal_name, legal_form: kycForm.legal_form,
        registration_number: kycForm.registration_number, vat_number: kycForm.vat_number,
        tax_id: kycForm.tax_id, registered_address: kycForm.registered_address,
        rep_full_name: kycForm.rep_full_name,
        rep_date_of_birth: kycForm.rep_date_of_birth || null,
        rep_nationality: kycForm.rep_nationality,
        registration_country: form.country || null,
      });
      setKyc(updated);
      return true;
    } catch {
      toast.error(t('partnerOnboarding.errors.saveError', 'Échec de l’enregistrement.'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const validateStep = (s: number): string[] => {
    const e: string[] = [];
    if (s === 1) {
      if (!form.company_name.trim()) e.push(t('partnerOnboarding.errors.companyRequired', 'Le nom de l’établissement est requis.'));
      if (!form.business_category) e.push(t('partnerOnboarding.errors.categoryRequired', 'La catégorie est requise.'));
    }
    if (s === 2) {
      if (!form.country) e.push(t('partnerOnboarding.errors.countryRequired', 'Le pays est requis.'));
      if (!form.city) e.push(t('partnerOnboarding.errors.cityRequired', 'La ville est requise.'));
    }
    if (s === 3) {
      if (!form.contact_phone.trim()) e.push(t('partnerOnboarding.errors.phoneRequired', 'Le téléphone est requis.'));
    }
    if (s === 4) {
      if (!kycForm.legal_name.trim()) e.push(t('partnerOnboarding.errors.legalNameRequired', 'La raison sociale est requise.'));
      if (!kycForm.registration_number.trim()) e.push(t('partnerOnboarding.errors.regNumRequired', 'Le numéro d’immatriculation est requis.'));
      if (!kycForm.rep_full_name.trim()) e.push(t('partnerOnboarding.errors.repRequired', 'Le représentant légal est requis.'));
      const have = new Set((kyc?.documents || []).map((d) => d.doc_type));
      for (const d of KYC_DOCS.filter((x) => x.required)) {
        if (!have.has(d.type)) e.push(t('partnerOnboarding.errors.docRequired', 'Document requis manquant : {{doc}}', { doc: t(`partnerOnboarding.docs.${d.type}`, d.type) }));
      }
    }
    return e;
  };

  const next = async () => {
    const e = validateStep(step);
    if (e.length) { setErrors(e); return; }
    setErrors([]);
    const ok = step === 4 ? await saveKyc() : await saveProfileStep();
    if (!ok) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const prev = () => { setErrors([]); setStep((s) => Math.max(s - 1, 1)); };

  const handleUpload = async (docType: PartnerKYCDocType, file: File) => {
    setSaving(true);
    try {
      await partnerService.uploadKycDocument(docType, file);
      const refreshed = await partnerService.getMyKyc();
      setKyc(refreshed);
      toast.success(t('partnerOnboarding.kyc.uploaded', 'Document téléversé.'));
    } catch (err: any) {
      toast.error(err?.payload?.detail || t('partnerOnboarding.errors.uploadError', 'Échec du téléversement.'));
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!profile) return;
    // valide toutes les étapes
    const allErr = [1, 2, 3, 4].flatMap(validateStep);
    if (allErr.length) { setErrors(allErr); setStep(1); return; }
    setSaving(true);
    try {
      await partnerService.submitProfile(profile.id);
      toast.success(t('partnerOnboarding.submitted', 'Profil soumis ! Notre équipe va vérifier votre dossier.'));
      navigate('/partner-center');
    } catch (err: any) {
      toast.error(err?.payload?.detail || t('partnerOnboarding.errors.submitError', 'Échec de la soumission.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const stepMeta = [
    { n: 1, label: t('partnerOnboarding.stepTitles.establishment', 'Établissement'), icon: <Building2 className="w-4 h-4" /> },
    { n: 2, label: t('partnerOnboarding.stepTitles.location', 'Localisation'), icon: <MapPin className="w-4 h-4" /> },
    { n: 3, label: t('partnerOnboarding.stepTitles.contact', 'Contact'), icon: <Phone className="w-4 h-4" /> },
    { n: 4, label: t('partnerOnboarding.stepTitles.kyc', 'Vérification (KYC)'), icon: <ShieldCheck className="w-4 h-4" /> },
    { n: 5, label: t('partnerOnboarding.stepTitles.review', 'Récapitulatif'), icon: <ClipboardCheck className="w-4 h-4" /> },
  ];

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('partnerOnboarding.wizard.title', 'Complétez votre profil partenaire')}</CardTitle>
          <Badge variant="outline">{t('partnerOnboarding.wizard.stepOf', 'Étape {{n}}/{{total}}', { n: step, total: TOTAL_STEPS })}</Badge>
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} className="mt-3" />
        <div className="flex flex-wrap gap-2 mt-3">
          {stepMeta.map((s) => (
            <div key={s.n} className={`flex items-center gap-1 text-xs ${step === s.n ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              {s.icon}{s.label}
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {kyc?.status === 'rejected' && kyc.rejection_reason && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('partnerOnboarding.kyc.rejected', 'Dossier KYC à corriger :')}</strong> {kyc.rejection_reason}
            </AlertDescription>
          </Alert>
        )}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 text-sm">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Étape 1 — Établissement */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('partnerOnboarding.fields.companyName', 'Nom de l’établissement')} *</Label>
              <Input value={form.company_name} onChange={(e) => setF('company_name', e.target.value)} placeholder="Hôtel des Roses…" />
            </div>
            <div className="space-y-2">
              <Label>{t('partnerOnboarding.fields.category', 'Catégorie')} *</Label>
              <Select value={form.business_category} onValueChange={(v) => setF('business_category', v)}>
                <SelectTrigger><SelectValue placeholder={t('partnerOnboarding.fields.categoryPlaceholder', 'Sélectionnez une catégorie')} /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(`partnerOnboarding.categories.${c}`, c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('partnerOnboarding.fields.description', 'Description')}</Label>
              <Textarea value={form.description} onChange={(e) => setF('description', e.target.value)} rows={4}
                placeholder={t('partnerOnboarding.fields.descriptionPlaceholder', 'Présentez votre établissement…')} />
            </div>
          </div>
        )}

        {/* Étape 2 — Localisation */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('partnerOnboarding.fields.country', 'Pays')} *</Label>
              <CountrySelect className="w-full" value={form.country_name}
                onValueChange={(name, id) => setForm((s) => ({ ...s, country_name: name, country: id || '', city: '', city_name: '' }))} />
            </div>
            <div className="space-y-2">
              <Label>{t('partnerOnboarding.fields.city', 'Ville')} *</Label>
              <CitySelect className="w-full" value={form.city_name} countryId={form.country} countryName={form.country_name}
                onValueChange={(name, id) => setForm((s) => ({ ...s, city_name: name, city: id || '' }))} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>{t('partnerOnboarding.fields.address', 'Adresse')}</Label>
                <Input value={form.address} onChange={(e) => setF('address', e.target.value)} placeholder="12 rue…" />
              </div>
              <div className="space-y-2">
                <Label>{t('partnerOnboarding.fields.postalCode', 'Code postal')}</Label>
                <Input value={form.postal_code} onChange={(e) => setF('postal_code', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Étape 3 — Contact */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('partnerOnboarding.fields.phone', 'Téléphone de contact')} *</Label>
              <Input value={form.contact_phone} onChange={(e) => setF('contact_phone', e.target.value)} placeholder="+33 1 23 45 67 89" />
            </div>
            <div className="space-y-2">
              <Label>{t('partnerOnboarding.fields.website', 'Site web')}</Label>
              <Input value={form.website} onChange={(e) => setF('website', e.target.value)} placeholder="https://…" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Facebook</Label>
                <Input value={form.facebook} onChange={(e) => setF('facebook', e.target.value)} placeholder="https://facebook.com/…" />
              </div>
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input value={form.instagram} onChange={(e) => setF('instagram', e.target.value)} placeholder="https://instagram.com/…" />
              </div>
            </div>
          </div>
        )}

        {/* Étape 4 — KYC / KYB */}
        {step === 4 && (
          <div className="space-y-5">
            <Alert className="bg-blue-50 border-blue-200">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                {t('partnerOnboarding.kyc.intro', 'Pour des raisons légales et de facturation, nous vérifions l’identité de votre entreprise. Ces informations restent confidentielles.')}
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('partnerOnboarding.fields.legalName', 'Raison sociale')} *</Label>
                <Input value={kycForm.legal_name} onChange={(e) => setK('legal_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('partnerOnboarding.fields.legalForm', 'Forme juridique')}</Label>
                <Input value={kycForm.legal_form} onChange={(e) => setK('legal_form', e.target.value)} placeholder="SARL, SA, auto-entrepreneur…" />
              </div>
              <div className="space-y-2">
                <Label>{t('partnerOnboarding.fields.registrationNumber', 'N° d’immatriculation')} *</Label>
                <Input value={kycForm.registration_number} onChange={(e) => setK('registration_number', e.target.value)} placeholder="SIREN/SIRET, ICE/RC…" />
              </div>
              <div className="space-y-2">
                <Label>{t('partnerOnboarding.fields.vatNumber', 'N° TVA')}</Label>
                <Input value={kycForm.vat_number} onChange={(e) => setK('vat_number', e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t('partnerOnboarding.fields.registeredAddress', 'Adresse du siège')}</Label>
                <Input value={kycForm.registered_address} onChange={(e) => setK('registered_address', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('partnerOnboarding.fields.repName', 'Représentant légal')} *</Label>
                <Input value={kycForm.rep_full_name} onChange={(e) => setK('rep_full_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('partnerOnboarding.fields.repDob', 'Date de naissance du représentant')}</Label>
                <Input type="date" value={kycForm.rep_date_of_birth} onChange={(e) => setK('rep_date_of_birth', e.target.value)} max={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="space-y-2">
                <Label>{t('partnerOnboarding.fields.repNationality', 'Nationalité du représentant')}</Label>
                <Input value={kycForm.rep_nationality} onChange={(e) => setK('rep_nationality', e.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base">{t('partnerOnboarding.kyc.documents', 'Documents justificatifs')}</Label>
              {KYC_DOCS.map((d) => {
                const uploaded = (kyc?.documents || []).find((x) => x.doc_type === d.type);
                return (
                  <div key={d.type} className="flex items-center justify-between border rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      {uploaded ? <FileCheck2 className="w-4 h-4 text-green-600" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                      <span>{t(`partnerOnboarding.docs.${d.type}`, d.type)}{d.required ? ' *' : ''}</span>
                      {uploaded && <span className="text-xs text-muted-foreground truncate max-w-[160px]">— {uploaded.original_name}</span>}
                    </div>
                    <label className="cursor-pointer">
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(d.type, f); e.currentTarget.value = ''; }} />
                      <span className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        <Upload className="w-3.5 h-3.5" /> {uploaded ? t('partnerOnboarding.kyc.replace', 'Remplacer') : t('partnerOnboarding.kyc.upload', 'Téléverser')}
                      </span>
                    </label>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground">{t('partnerOnboarding.kyc.formats', 'Formats acceptés : PDF ou image, 10 Mo max.')}</p>
            </div>
          </div>
        )}

        {/* Étape 5 — Récapitulatif */}
        {step === 5 && (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 text-sm">
                {t('partnerOnboarding.review.intro', 'Vérifiez vos informations puis soumettez votre dossier. Après validation par notre équipe, votre fiche établissement sera créée et vous pourrez la configurer.')}
              </AlertDescription>
            </Alert>
            <div className="text-sm space-y-1.5 border rounded-lg p-4">
              <div className="flex justify-between"><span className="text-muted-foreground">{t('partnerOnboarding.fields.companyName', 'Établissement')}</span><span className="font-medium">{form.company_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('partnerOnboarding.fields.category', 'Catégorie')}</span><span>{t(`partnerOnboarding.categories.${form.business_category}`, form.business_category)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('partnerOnboarding.fields.city', 'Ville')}</span><span>{form.city_name}, {form.country_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('partnerOnboarding.fields.phone', 'Téléphone')}</span><span>{form.contact_phone}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('partnerOnboarding.fields.legalName', 'Raison sociale')}</span><span>{kycForm.legal_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">KYC</span><span>{t('partnerOnboarding.kyc.docsCount', '{{n}} document(s)', { n: kyc?.documents?.length || 0 })}</span></div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" onClick={prev} disabled={step === 1 || saving}>
            <ChevronLeft className="w-4 h-4 mr-1" /> {t('partnerOnboarding.wizard.back', 'Retour')}
          </Button>
          {step < TOTAL_STEPS ? (
            <Button onClick={next} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{t('partnerOnboarding.wizard.next', 'Continuer')} <ChevronRight className="w-4 h-4 ml-1" /></>}
            </Button>
          ) : (
            <Button onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{t('partnerOnboarding.wizard.submit', 'Soumettre mon dossier')} <CheckCircle className="w-4 h-4 ml-1" /></>}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CompletePartnerProfile;
