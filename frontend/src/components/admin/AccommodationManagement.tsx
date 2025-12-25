import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Save, X, Home, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAccommodationSettings } from '@/hooks/useAccommodationSettings';
import { accommodationSettingsService, AccommodationTaxonomyEntry } from '@/services/accommodationSettingsService';
import { getLocalizedLabel } from '@/utils/multilingualHelpers';

type EntityKey =
  | 'accommodation_types'
  | 'accommodation_amenities'
  | 'accommodation_locations'
  | 'accommodation_accessibility'
  | 'accommodation_security'
  | 'accommodation_ambiance';

const LANGUAGE_CODES = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'hi', 'ar'] as const;
type LanguageCode = typeof LANGUAGE_CODES[number];
type LanguageOption = { code: LanguageCode; label: string; required?: boolean };
type LabelField = `label_${LanguageCode}`;
type DescriptionField = `description_${LanguageCode}`;

type AccommodationFormState = {
  id?: string;
  code: string;
  icon_emoji: string;
  display_order: number;
  is_active: boolean;
  category: string;
} & Record<LabelField, string> &
  Record<DescriptionField, string>;

const ADDITIONAL_LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'es', label: 'Espagnol' },
  { code: 'de', label: 'Allemand' },
  { code: 'it', label: 'Italien' },
  { code: 'pt', label: 'Portugais' },
  { code: 'ru', label: 'Russe' },
  { code: 'ja', label: 'Japonais' },
  { code: 'zh', label: 'Chinois' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabe' },
];

const LABEL_LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'fr', label: 'Français', required: true },
  { code: 'en', label: 'Anglais' },
  ...ADDITIONAL_LANGUAGE_OPTIONS,
];

const DESCRIPTION_LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'Anglais' },
  ...ADDITIONAL_LANGUAGE_OPTIONS,
];

const ENTITY_METADATA: Record<
  EntityKey,
  { title: string; singular: string; description: string; hasCategory?: boolean }
> = {
  accommodation_types: {
    title: "Types d'Hébergement",
    singular: "type d'hébergement",
    description: 'Ajoutez les déclinaisons multilingues du type.',
  },
  accommodation_amenities: {
    title: 'Commodités',
    singular: 'commodité',
    description: 'Décrivez les commodités dans les 11 langues supportées.',
    hasCategory: true,
  },
  accommodation_locations: {
    title: 'Emplacements',
    singular: "préférence d'emplacement",
    description: 'Ces emplacements aident les voyageurs à filtrer leurs choix.',
  },
  accommodation_accessibility: {
    title: 'Accessibilité',
    singular: "option d'accessibilité",
    description: 'Décrivez les options disponibles pour l’accessibilité.',
  },
  accommodation_security: {
    title: 'Sécurité',
    singular: 'caractéristique de sécurité',
    description: 'Communiquez les mesures de sécurité dans toutes les langues.',
  },
  accommodation_ambiance: {
    title: 'Ambiance',
    singular: 'ambiance',
    description: "Précisez l'expérience ressentie.",
  },
};

const createDefaultFormState = (): AccommodationFormState => {
  const labels = LANGUAGE_CODES.reduce((acc, code) => {
    acc[`label_${code}` as LabelField] = '';
    return acc;
  }, {} as Record<LabelField, string>);

  const descriptions = LANGUAGE_CODES.reduce((acc, code) => {
    acc[`description_${code}` as DescriptionField] = '';
    return acc;
  }, {} as Record<DescriptionField, string>);

  return {
    id: undefined,
    code: '',
    icon_emoji: '',
    display_order: 0,
    is_active: true,
    category: '',
    ...labels,
    ...descriptions,
  };
};

const mapItemToFormState = (item?: AccommodationTaxonomyEntry | null): AccommodationFormState => {
  const base = createDefaultFormState();
  if (!item) return base;

  const next: AccommodationFormState = {
    ...base,
    id: item.id,
    code: item.code ?? '',
    icon_emoji: item.icon_emoji ?? '',
    display_order: item.display_order ?? 0,
    is_active: item.is_active ?? true,
    category: item.category ?? '',
  };

  LANGUAGE_CODES.forEach((code) => {
    const labelKey = `label_${code}` as LabelField;
    const descriptionKey = `description_${code}` as DescriptionField;
    next[labelKey] = item[labelKey] ?? next[labelKey];
    next[descriptionKey] = item[descriptionKey] ?? next[descriptionKey];
  });

  return next;
};

const sanitizePayload = (entity: EntityKey, data: AccommodationFormState) => {
  const { id, ...rest } = data;
  const payload: Record<string, unknown> = { ...rest };
  if (entity !== 'accommodation_amenities') {
    delete payload.category;
  } else if (!payload.category) {
    payload.category = '';
  }
  return payload;
};

export const AccommodationManagement = () => {
  const { toast } = useToast();
  const { i18n } = useTranslation();
  const {
    accommodationTypes,
    accommodationAmenities,
    accommodationLocations,
    accommodationAccessibility,
    accommodationSecurity,
    accommodationAmbiance,
    loading,
    refetch,
  } = useAccommodationSettings();

  const [formState, setFormState] = useState<AccommodationFormState>(createDefaultFormState);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogEntity, setDialogEntity] = useState<EntityKey | null>(null);
  const [activeTab, setActiveTab] = useState('types');

  const entityHandlers: Record<
    EntityKey,
    {
      create: (payload: any) => Promise<any>;
      update: (id: string, payload: any) => Promise<any>;
      delete: (id: string) => Promise<void>;
      translate: (id: string) => Promise<any>;
    }
  > = {
    accommodation_types: {
      create: accommodationSettingsService.createType,
      update: accommodationSettingsService.updateType,
      delete: accommodationSettingsService.deleteType,
      translate: accommodationSettingsService.translateType,
    },
    accommodation_amenities: {
      create: accommodationSettingsService.createAmenity,
      update: accommodationSettingsService.updateAmenity,
      delete: accommodationSettingsService.deleteAmenity,
      translate: accommodationSettingsService.translateAmenity,
    },
    accommodation_locations: {
      create: accommodationSettingsService.createLocation,
      update: accommodationSettingsService.updateLocation,
      delete: accommodationSettingsService.deleteLocation,
      translate: accommodationSettingsService.translateLocation,
    },
    accommodation_accessibility: {
      create: accommodationSettingsService.createAccessibility,
      update: accommodationSettingsService.updateAccessibility,
      delete: accommodationSettingsService.deleteAccessibility,
      translate: accommodationSettingsService.translateAccessibility,
    },
    accommodation_security: {
      create: accommodationSettingsService.createSecurity,
      update: accommodationSettingsService.updateSecurity,
      delete: accommodationSettingsService.deleteSecurity,
      translate: accommodationSettingsService.translateSecurity,
    },
    accommodation_ambiance: {
      create: accommodationSettingsService.createAmbiance,
      update: accommodationSettingsService.updateAmbiance,
      delete: accommodationSettingsService.deleteAmbiance,
      translate: accommodationSettingsService.translateAmbiance,
    },
  };

  const openDialog = (entity: EntityKey, item?: AccommodationTaxonomyEntry | null) => {
    setDialogEntity(entity);
    setFormState(mapItemToFormState(item));
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogEntity(null);
    setFormState(createDefaultFormState());
    setIsDialogOpen(false);
  };

  const handleSave = async () => {
    if (!dialogEntity) return;

    const handlers = entityHandlers[dialogEntity];
    const payload = sanitizePayload(dialogEntity, formState);

    try {
      if (formState.id) {
        await handlers.update(formState.id, payload);
        toast({ title: 'Élément mis à jour avec succès' });
      } else {
        await handlers.create(payload);
        toast({ title: 'Élément créé avec succès' });
      }
      closeDialog();
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de sauvegarder',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (entity: EntityKey, id: string) => {
    try {
      const handlers = entityHandlers[entity];
      await handlers.delete(id);
      toast({ title: 'Élément supprimé avec succès' });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer',
        variant: 'destructive',
      });
    }
  };

  const toggleActive = async (entity: EntityKey, id: string, isActive: boolean) => {
    try {
      const handlers = entityHandlers[entity];
      await handlers.update(id, { is_active: !isActive });
      toast({ title: 'Statut mis à jour avec succès' });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour',
        variant: 'destructive',
      });
    }
  };

  const handleTranslate = async (entity: EntityKey, id: string) => {
    if (!entity) return;
    try {
      const handlers = entityHandlers[entity];
      const result = await handlers.translate(id);

      // Extract the translated object from the response
      const translatedObject = result[Object.keys(result).find(key => key.startsWith('accommodation_')) as string];
      setFormState(mapItemToFormState(translatedObject));

      toast({
        title: "✅ Traduction réussie",
        description: `${result.message} dans les langues: ${result.languages.join(", ")}`,
      });
      await refetch();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de traduire l'élément",
        variant: "destructive",
      });
    }
  };

  const handleFieldChange = <K extends keyof AccommodationFormState>(field: K, value: AccommodationFormState[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleLabelChange = (code: LanguageCode, value: string) => {
    handleFieldChange(`label_${code}` as LabelField, value);
  };

  const handleDescriptionChange = (code: LanguageCode, value: string) => {
    handleFieldChange(`description_${code}` as DescriptionField, value);
  };

  const renderFormBody = () => {
    if (!dialogEntity) return null;
    const { hasCategory } = ENTITY_METADATA[dialogEntity];

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              value={formState.code}
              required
              onChange={(e) => handleFieldChange('code', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="icon_emoji">Emoji</Label>
            <Input
              id="icon_emoji"
              value={formState.icon_emoji}
              placeholder="🏨"
              onChange={(e) => handleFieldChange('icon_emoji', e.target.value)}
            />
          </div>
        </div>

        {hasCategory && (
          <div className="space-y-1">
            <Label htmlFor="category">Catégorie</Label>
            <Input
              id="category"
              value={formState.category}
              placeholder="comfort, wellness, connectivity..."
              onChange={(e) => handleFieldChange('category', e.target.value)}
            />
          </div>
        )}

        {formState.id && dialogEntity && (
          <div className="border rounded-lg p-3 bg-blue-50 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Traduction automatique</p>
                <p className="text-xs text-gray-600 mt-1">
                  Remplir automatiquement les champs de traduction vides via LibreTranslate
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTranslate(dialogEntity, formState.id!)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Globe className="w-4 h-4 mr-1" />
                Traduire
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="display_order">Ordre d'affichage</Label>
            <Input
              id="display_order"
              type="number"
              value={formState.display_order}
              onChange={(e) => handleFieldChange('display_order', Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1">
            <Label>Statut</Label>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Rendre cet élément visible</p>
                <p className="text-xs text-muted-foreground">Contrôle également l’apparition côté front</p>
              </div>
              <Switch checked={formState.is_active} onCheckedChange={(checked) => handleFieldChange('is_active', checked)} />
            </div>
          </div>
        </div>

        <TranslationFieldGrid
          title="Libellés multilingues"
          description="Le français est obligatoire, les autres langues peuvent être traduites plus tard."
          languages={LABEL_LANGUAGE_OPTIONS}
          valueGetter={(code) => formState[`label_${code}` as LabelField]}
          onChange={handleLabelChange}
        />

        <TranslationFieldGrid
          title="Descriptions multilingues"
          description="Elles sont facultatives mais recommandées pour le SEO."
          languages={DESCRIPTION_LANGUAGE_OPTIONS}
          valueGetter={(code) => formState[`description_${code}` as DescriptionField]}
          onChange={handleDescriptionChange}
          textarea
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={closeDialog}>
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>
        </div>
      </div>
    );
  };

  const renderTable = (data: AccommodationTaxonomyEntry[], entity: EntityKey, title: string, hasCategory = false) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Button onClick={() => openDialog(entity)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Label FR</TableHead>
            <TableHead>{`Label (${i18n.language.toUpperCase()})`}</TableHead>
            <TableHead>Emoji</TableHead>
            {hasCategory && <TableHead>Catégorie</TableHead>}
            <TableHead>Ordre</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.code}</TableCell>
              <TableCell>{item.label_fr}</TableCell>
              <TableCell>{getLocalizedLabel(item, i18n.language)}</TableCell>
              <TableCell>{item.icon_emoji}</TableCell>
              {hasCategory && (
                <TableCell>
                  {item.category ? <Badge variant="outline">{item.category}</Badge> : <span className="text-muted-foreground">—</span>}
                </TableCell>
              )}
              <TableCell>{item.display_order}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Switch checked={item.is_active} onCheckedChange={() => toggleActive(entity, item.id, item.is_active)} />
                  <Badge variant={item.is_active ? 'default' : 'secondary'}>
                    {item.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openDialog(entity, item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(entity, item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  if (loading) {
    return <div>Chargement...</div>;
  }

  const dialogMeta = dialogEntity ? ENTITY_METADATA[dialogEntity] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="w-5 h-5" />
          Gestion des Paramètres d'Hébergement
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="types">Types</TabsTrigger>
            <TabsTrigger value="amenities">Commodités</TabsTrigger>
            <TabsTrigger value="locations">Emplacements</TabsTrigger>
            <TabsTrigger value="accessibility">Accessibilité</TabsTrigger>
            <TabsTrigger value="security">Sécurité</TabsTrigger>
            <TabsTrigger value="ambiance">Ambiance</TabsTrigger>
          </TabsList>

          <TabsContent value="types">
            {renderTable(accommodationTypes, 'accommodation_types', "Types d'Hébergement")}
          </TabsContent>

          <TabsContent value="amenities">
            {renderTable(accommodationAmenities, 'accommodation_amenities', 'Commodités', true)}
          </TabsContent>

          <TabsContent value="locations">
            {renderTable(accommodationLocations, 'accommodation_locations', 'Emplacements')}
          </TabsContent>

          <TabsContent value="accessibility">
            {renderTable(accommodationAccessibility, 'accommodation_accessibility', 'Accessibilité')}
          </TabsContent>

          <TabsContent value="security">
            {renderTable(accommodationSecurity, 'accommodation_security', 'Sécurité')}
          </TabsContent>

          <TabsContent value="ambiance">
            {renderTable(accommodationAmbiance, 'accommodation_ambiance', 'Ambiance')}
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={(open) => (!open ? closeDialog() : undefined)}>
        <DialogContent className="max-w-3xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formState.id ? 'Modifier' : 'Ajouter'} {dialogMeta?.singular}
            </DialogTitle>
            {dialogMeta && (
              <DialogDescription>
                {dialogMeta.description} Tous les champs sont synchronisés avec le front-office.
              </DialogDescription>
            )}
          </DialogHeader>
          {renderFormBody()}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

interface TranslationFieldGridProps {
  title: string;
  description?: string;
  languages: ReadonlyArray<LanguageOption>;
  valueGetter: (code: LanguageCode) => string;
  onChange: (code: LanguageCode, value: string) => void;
  textarea?: boolean;
}

const TranslationFieldGrid = ({
  title,
  description,
  languages,
  valueGetter,
  onChange,
  textarea = false,
}: TranslationFieldGridProps) => (
  <div className="rounded-lg border p-3 space-y-3">
    <div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {languages.map(({ code, label, required }) => (
        <div key={code} className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
            {label}
            {required && <span className="text-destructive">*</span>}
          </Label>
          {textarea ? (
            <Textarea value={valueGetter(code)} onChange={(e) => onChange(code, e.target.value)} />
          ) : (
            <Input value={valueGetter(code)} onChange={(e) => onChange(code, e.target.value)} required={required} />
          )}
        </div>
      ))}
    </div>
  </div>
);
