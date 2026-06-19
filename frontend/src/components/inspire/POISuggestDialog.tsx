import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, Loader2, PencilLine, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { POI, createPOISuggestion } from "@/services/poiService";
import { getLocalizedLabel } from "@/utils/multilingualHelpers";
import { useBudgetSettings } from "@/hooks/useBudgetSettings";
import { useActivitySettings } from "@/hooks/useActivitySettings";
import { useCulinarySettings } from "@/hooks/useCulinarySettings";
import { useAccommodationSettings } from "@/hooks/useAccommodationSettings";
import { useDifficultyLevels } from "@/hooks/useDifficultyLevels";
import { MediaUploader } from "@/components/media/MediaUploader";

interface Props {
  children?: React.ReactNode;   // déclencheur (optionnel : mode contrôlé sinon)
  poi: POI;                     // POI déjà persisté (UUID)
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}

type TaxItem = { id?: string | number; code?: string } & Record<string, any>;

const sameSet = (a: string[] = [], b: string[] = []) =>
  a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

const asStr = (v: any) => (v === undefined || v === null ? "" : String(v));

/** Section repliable légère (sans dépendance externe). */
const Section: React.FC<{ title: string; defaultOpen?: boolean; children: React.ReactNode }> = ({ title, defaultOpen, children }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border rounded-lg">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium"
      >
        <span>{title}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  );
};

/** Groupe de puces multi-sélection (valeur = code). */
const ChipGroup: React.FC<{ items: TaxItem[]; selected: string[]; onToggle: (code: string) => void; lang: string }> = ({ items, selected, onToggle, lang }) => (
  <div className="flex flex-wrap gap-1.5">
    {items.map((it) => {
      const code = String(it.code ?? it.id ?? "");
      const active = selected.includes(code);
      return (
        <button
          key={code}
          type="button"
          onClick={() => onToggle(code)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
        >
          {getLocalizedLabel(it, lang) || code}
        </button>
      );
    })}
  </div>
);

/** Sélecteur de niveau (valeur = id). */
const LevelSelect: React.FC<{ items: TaxItem[]; value: string; onChange: (v: string) => void; placeholder: string; lang: string }> = ({ items, value, onChange, placeholder, lang }) => (
  <Select value={value || undefined} onValueChange={onChange}>
    <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
    <SelectContent>
      {items.map((it) => (
        <SelectItem key={String(it.id)} value={String(it.id)}>{getLocalizedLabel(it, lang) || String(it.code ?? it.id)}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);

/**
 * Suggérer une amélioration (wiki, modérée). Formulaire enrichi pré-rempli : on
 * n'envoie que les champs RÉELLEMENT modifiés dans proposed_changes.
 * Mapping de stockage identique à POICreationForm (taxonomies par code, niveaux par id).
 */
export const POISuggestDialog = ({ children, poi, open: openProp, onOpenChange }: Props) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = (o: boolean) => { onOpenChange ? onOpenChange(o) : setInternalOpen(o); };
  const [submitting, setSubmitting] = useState(false);

  const { budgetLevels } = useBudgetSettings();
  const { difficultyLevels } = useDifficultyLevels();
  const { categories: activityCategories, intensityLevels, interests, avoidances } = useActivitySettings();
  const { cuisineTypes, dietaryRestrictions, adventureLevels, restaurantCategories } = useCulinarySettings();
  const {
    accommodationTypes, accommodationAmenities, accommodationLocations,
    accommodationAccessibility, accommodationSecurity, accommodationAmbiance,
  } = useAccommodationSettings();

  const meta: any = poi.metadata || {};

  const initial = useMemo(() => ({
    name: poi.name || "",
    description: poi.description || "",
    address: poi.address || "",
    contact_phone: poi.contact_phone || "",
    website_url: poi.website_url || "",
    opening_hours: (poi as any).opening_hours || meta.opening_hours || "",
    is_restaurant: !!poi.is_restaurant,
    is_accommodation: !!poi.is_accommodation,
    is_activity: !!poi.is_activity,
    budget_level_id: asStr(poi.budget_level_id),
    difficulty_level_id: asStr(poi.difficulty_level_id),
    is_wheelchair_accessible: !!poi.is_wheelchair_accessible,
    has_accessible_parking: !!poi.has_accessible_parking,
    has_accessible_restrooms: !!poi.has_accessible_restrooms,
    has_audio_guide: !!poi.has_audio_guide,
    has_sign_language_support: !!poi.has_sign_language_support,
    cuisine_types: poi.cuisine_types || [],
    dietary_restrictions_supported: poi.dietary_restrictions_supported || [],
    restaurant_categories: poi.restaurant_categories || [],
    culinary_adventure_level_id: asStr(poi.culinary_adventure_level_id),
    accommodation_types: poi.accommodation_types || [],
    accommodation_amenities: poi.accommodation_amenities || [],
    accommodation_locations: poi.accommodation_locations || [],
    accommodation_accessibility: poi.accommodation_accessibility || [],
    accommodation_security: poi.accommodation_security || [],
    accommodation_ambiance: poi.accommodation_ambiance || [],
    activity_categories: poi.activity_categories || [],
    activity_interests: poi.activity_interests || [],
    activity_avoidances: poi.activity_avoidances || [],
    activity_intensity_level_id: asStr(poi.activity_intensity_level_id),
    recommendation_level: Number(meta.recommendation_level) || 0,
  }), [poi]);

  const [form, setForm] = useState(initial);
  const [photos, setPhotos] = useState<string[]>([]); // ajouts (additifs) → media_images
  const [comment, setComment] = useState("");

  // Réinitialise quand on change de POI.
  React.useEffect(() => { setForm(initial); setPhotos([]); setComment(""); }, [initial]);

  const set = (k: keyof typeof initial, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const toggleArr = (k: keyof typeof initial, code: string) =>
    setForm((p) => {
      const cur = (p[k] as string[]) || [];
      return { ...p, [k]: cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code] };
    });

  const STR_FIELDS: (keyof typeof initial)[] = ["name", "description", "address", "contact_phone", "website_url", "opening_hours", "budget_level_id", "difficulty_level_id", "culinary_adventure_level_id", "activity_intensity_level_id"];
  const BOOL_FIELDS: (keyof typeof initial)[] = ["is_restaurant", "is_accommodation", "is_activity", "is_wheelchair_accessible", "has_accessible_parking", "has_accessible_restrooms", "has_audio_guide", "has_sign_language_support"];
  const ARR_FIELDS: (keyof typeof initial)[] = ["cuisine_types", "dietary_restrictions_supported", "restaurant_categories", "accommodation_types", "accommodation_amenities", "accommodation_locations", "accommodation_accessibility", "accommodation_security", "accommodation_ambiance", "activity_categories", "activity_interests", "activity_avoidances"];

  const buildChanges = (): Record<string, any> => {
    const changes: Record<string, any> = {};
    STR_FIELDS.forEach((k) => { if (asStr(form[k]) !== asStr(initial[k]) && asStr(form[k]) !== "") changes[k] = form[k]; });
    BOOL_FIELDS.forEach((k) => { if (form[k] !== initial[k]) changes[k] = form[k]; });
    ARR_FIELDS.forEach((k) => { if (!sameSet(form[k] as string[], initial[k] as string[])) changes[k] = form[k]; });
    if (form.recommendation_level && form.recommendation_level !== initial.recommendation_level) changes.recommendation_level = form.recommendation_level;
    if (photos.length > 0) changes.media_images = photos.slice(0, 3);
    return changes;
  };

  const submit = async () => {
    const changes = buildChanges();
    if (Object.keys(changes).length === 0) {
      toast.error(t("beInspired.suggest.noChange", "Modifiez au moins un champ."));
      return;
    }
    setSubmitting(true);
    try {
      await createPOISuggestion(poi.id, changes, comment.trim());
      toast.success(t("beInspired.suggest.success", "Merci ! Votre suggestion sera examinée."));
      setOpen(false);
      setComment("");
      setPhotos([]);
    } catch (e: any) {
      toast.error(e?.payload?.detail || e?.message || t("beInspired.suggest.error", "Impossible d'envoyer la suggestion."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-3xl w-[95vw] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PencilLine className="w-5 h-5 text-primary" />
            {t("beInspired.suggest.title", "Suggérer une amélioration")}
          </DialogTitle>
          <DialogDescription>
            {t("beInspired.suggest.desc", { name: poi.name, defaultValue: "Proposez des corrections pour « {{name}} ». Validées par notre équipe avant publication." })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Infos générales */}
          <Section title={t("beInspired.suggest.sectionInfo", "Informations")} defaultOpen>
            <div>
              <Label htmlFor="sg-name">{t("beInspired.suggest.name", "Nom")}</Label>
              <Input id="sg-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="sg-desc">{t("beInspired.suggest.description", "Description")}</Label>
              <Textarea id="sg-desc" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="sg-addr">{t("beInspired.suggest.address", "Adresse")}</Label>
              <Input id="sg-addr" value={form.address} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sg-phone">{t("beInspired.suggest.phone", "Téléphone")}</Label>
                <Input id="sg-phone" value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="sg-hours">{t("beInspired.suggest.hours", "Horaires")}</Label>
                <Input id="sg-hours" value={form.opening_hours} onChange={(e) => set("opening_hours", e.target.value)} placeholder="Mo-Fr 09:00-18:00" />
              </div>
            </div>
            <div>
              <Label htmlFor="sg-web">{t("beInspired.suggest.website", "Site web")}</Label>
              <Input id="sg-web" type="url" value={form.website_url} onChange={(e) => set("website_url", e.target.value)} placeholder="https://…" />
            </div>
          </Section>

          {/* Photos */}
          <Section title={t("beInspired.suggest.sectionPhotos", "Photos (1 à 3)")}>
            <p className="text-xs text-muted-foreground">{t("beInspired.suggest.photosHint", "Ajoutez jusqu'à 3 photos du lieu.")}</p>
            <MediaUploader
              maxFiles={3}
              initialImages={[]}
              onMediaChange={(imgs) => setPhotos(imgs.slice(0, 3))}
            />
          </Section>

          {/* Type & budget & difficulté */}
          <Section title={t("beInspired.suggest.sectionType", "Type & tarif")}>
            <div className="space-y-2">
              {([["is_activity", t("beInspired.suggest.isActivity", "Activité / à faire")], ["is_restaurant", t("beInspired.suggest.isRestaurant", "Restaurant")], ["is_accommodation", t("beInspired.suggest.isAccommodation", "Hébergement")]] as const).map(([k, label]) => (
                <div key={k} className="flex items-center justify-between">
                  <Label htmlFor={`sg-${k}`} className="text-sm font-normal">{label}</Label>
                  <Switch id={`sg-${k}`} checked={form[k] as boolean} onCheckedChange={(v) => set(k, v)} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("beInspired.suggest.budget", "Budget")}</Label>
                <LevelSelect items={budgetLevels} value={form.budget_level_id} onChange={(v) => set("budget_level_id", v)} placeholder={t("beInspired.suggest.choose", "Choisir")} lang={lang} />
              </div>
              <div>
                <Label>{t("beInspired.suggest.difficulty", "Difficulté")}</Label>
                <LevelSelect items={difficultyLevels} value={form.difficulty_level_id} onChange={(v) => set("difficulty_level_id", v)} placeholder={t("beInspired.suggest.choose", "Choisir")} lang={lang} />
              </div>
            </div>
          </Section>

          {/* Accessibilité */}
          <Section title={t("beInspired.suggest.sectionAccessibility", "Accessibilité")}>
            <div className="space-y-2">
              {([["is_wheelchair_accessible", t("beInspired.suggest.wheelchair", "Accès fauteuil roulant")], ["has_accessible_parking", t("beInspired.suggest.parking", "Parking accessible")], ["has_accessible_restrooms", t("beInspired.suggest.restrooms", "Toilettes accessibles")], ["has_audio_guide", t("beInspired.suggest.audioGuide", "Audioguide")], ["has_sign_language_support", t("beInspired.suggest.signLanguage", "Langue des signes")]] as const).map(([k, label]) => (
                <div key={k} className="flex items-center justify-between">
                  <Label htmlFor={`sg-${k}`} className="text-sm font-normal">{label}</Label>
                  <Switch id={`sg-${k}`} checked={form[k] as boolean} onCheckedChange={(v) => set(k, v)} />
                </div>
              ))}
              {accommodationAccessibility.length > 0 && (
                <div className="pt-1">
                  <Label className="text-xs text-muted-foreground">{t("beInspired.suggest.accessibilityDetails", "Détails d'accessibilité")}</Label>
                  <ChipGroup items={accommodationAccessibility} selected={form.accommodation_accessibility} onToggle={(c) => toggleArr("accommodation_accessibility", c)} lang={lang} />
                </div>
              )}
            </div>
          </Section>

          {/* Restauration (conditionnel) */}
          {form.is_restaurant && (
            <Section title={t("beInspired.suggest.sectionCulinary", "Restauration")} defaultOpen>
              <div>
                <Label className="text-xs">{t("beInspired.suggest.cuisineTypes", "Types de cuisine")}</Label>
                <ChipGroup items={cuisineTypes} selected={form.cuisine_types} onToggle={(c) => toggleArr("cuisine_types", c)} lang={lang} />
              </div>
              <div>
                <Label className="text-xs">{t("beInspired.suggest.dietary", "Régimes alimentaires")}</Label>
                <ChipGroup items={dietaryRestrictions} selected={form.dietary_restrictions_supported} onToggle={(c) => toggleArr("dietary_restrictions_supported", c)} lang={lang} />
              </div>
              <div>
                <Label className="text-xs">{t("beInspired.suggest.restaurantCategories", "Catégories de restaurant")}</Label>
                <ChipGroup items={restaurantCategories} selected={form.restaurant_categories} onToggle={(c) => toggleArr("restaurant_categories", c)} lang={lang} />
              </div>
              <div>
                <Label className="text-xs">{t("beInspired.suggest.adventureLevel", "Niveau d'aventure culinaire")}</Label>
                <LevelSelect items={adventureLevels} value={form.culinary_adventure_level_id} onChange={(v) => set("culinary_adventure_level_id", v)} placeholder={t("beInspired.suggest.choose", "Choisir")} lang={lang} />
              </div>
            </Section>
          )}

          {/* Hébergement (conditionnel) */}
          {form.is_accommodation && (
            <Section title={t("beInspired.suggest.sectionAccommodation", "Hébergement")} defaultOpen>
              {([["accommodation_types", t("beInspired.suggest.accTypes", "Types"), accommodationTypes], ["accommodation_amenities", t("beInspired.suggest.accAmenities", "Équipements"), accommodationAmenities], ["accommodation_locations", t("beInspired.suggest.accLocations", "Emplacement"), accommodationLocations], ["accommodation_security", t("beInspired.suggest.accSecurity", "Sécurité"), accommodationSecurity], ["accommodation_ambiance", t("beInspired.suggest.accAmbiance", "Ambiance"), accommodationAmbiance]] as const).map(([k, label, items]) => (
                <div key={k}>
                  <Label className="text-xs">{label}</Label>
                  <ChipGroup items={items} selected={form[k] as string[]} onToggle={(c) => toggleArr(k, c)} lang={lang} />
                </div>
              ))}
            </Section>
          )}

          {/* Activité (conditionnel) */}
          {form.is_activity && (
            <Section title={t("beInspired.suggest.sectionActivity", "Activité")} defaultOpen>
              <div>
                <Label className="text-xs">{t("beInspired.suggest.activityCategories", "Catégories")}</Label>
                <ChipGroup items={activityCategories} selected={form.activity_categories} onToggle={(c) => toggleArr("activity_categories", c)} lang={lang} />
              </div>
              <div>
                <Label className="text-xs">{t("beInspired.suggest.activityInterests", "Centres d'intérêt")}</Label>
                <ChipGroup items={interests} selected={form.activity_interests} onToggle={(c) => toggleArr("activity_interests", c)} lang={lang} />
              </div>
              <div>
                <Label className="text-xs">{t("beInspired.suggest.activityAvoidances", "À éviter")}</Label>
                <ChipGroup items={avoidances} selected={form.activity_avoidances} onToggle={(c) => toggleArr("activity_avoidances", c)} lang={lang} />
              </div>
              <div>
                <Label className="text-xs">{t("beInspired.suggest.intensity", "Intensité")}</Label>
                <LevelSelect items={intensityLevels} value={form.activity_intensity_level_id} onChange={(v) => set("activity_intensity_level_id", v)} placeholder={t("beInspired.suggest.choose", "Choisir")} lang={lang} />
              </div>
            </Section>
          )}

          {/* Niveau de recommandation */}
          <Section title={t("beInspired.suggest.sectionRecommendation", "Niveau de recommandation")} defaultOpen>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => set("recommendation_level", n)} aria-label={`${n}/5`}>
                  <Star className={`w-6 h-6 ${n <= form.recommendation_level ? "text-yellow-500 fill-current" : "text-gray-300"}`} />
                </button>
              ))}
              {form.recommendation_level > 0 && (
                <button type="button" className="ml-2 text-xs text-muted-foreground underline" onClick={() => set("recommendation_level", 0)}>
                  {t("beInspired.suggest.clear", "Effacer")}
                </button>
              )}
            </div>
          </Section>

          <div>
            <Label htmlFor="sg-comment">{t("beInspired.suggest.comment", "Commentaire (optionnel)")}</Label>
            <Textarea id="sg-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>

          <Button className="w-full" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PencilLine className="w-4 h-4 mr-2" />}
            {t("beInspired.suggest.submit", "Envoyer la suggestion")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default POISuggestDialog;
