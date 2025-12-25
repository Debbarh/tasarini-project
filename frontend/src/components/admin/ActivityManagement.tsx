import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Save, X, Activity, Zap, Heart, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useActivitySettings } from "@/hooks/useActivitySettings";
import { activityAdminService, ActivityCategory, ActivityIntensityLevel, ActivityInterest, ActivityAvoidance } from "@/services/activityAdminService";
import { getLocalizedLabel } from "@/utils/multilingualHelpers";

const LANGUAGE_CODES = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'hi', 'ar'] as const;
type LanguageCode = typeof LANGUAGE_CODES[number];
type LanguageOption = { code: LanguageCode; label: string; required?: boolean };
type LabelField = `label_${LanguageCode}`;
type DescriptionField = `description_${LanguageCode}`;

const ADDITIONAL_LANGUAGES: LanguageOption[] = [
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

const LABEL_LANG_OPTIONS: LanguageOption[] = [
  { code: 'fr', label: 'Français', required: true },
  { code: 'en', label: 'Anglais' },
  ...ADDITIONAL_LANGUAGES,
];

const DESCRIPTION_LANG_OPTIONS: LanguageOption[] = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'Anglais' },
  ...ADDITIONAL_LANGUAGES,
];

type CategoryFormState = {
  id?: string;
  code: string;
  icon_emoji: string;
  icon_name: string;
  color_class: string;
  display_order: number;
  is_active: boolean;
} & Record<LabelField, string> & Record<DescriptionField, string>;

type IntensityFormState = {
  id?: string;
  code: string;
  icon_emoji: string;
  level_value: number;
  display_order: number;
  is_active: boolean;
} & Record<LabelField, string> & Record<DescriptionField, string>;

type TaxonomyFormState = {
  id?: string;
  code: string;
  category: string;
  display_order: number;
  is_active: boolean;
} & Record<LabelField, string> & Record<DescriptionField, string>;

const createTranslationState = () => ({
  ...(LANGUAGE_CODES.reduce((acc, code) => ({ ...acc, [`label_${code}`]: "" }), {}) as Record<LabelField, string>),
  ...(LANGUAGE_CODES.reduce((acc, code) => ({ ...acc, [`description_${code}`]: "" }), {}) as Record<DescriptionField, string>),
});

const createDefaultCategoryForm = (): CategoryFormState => ({
  ...createTranslationState(),
  code: "",
  icon_emoji: "",
  icon_name: "",
  color_class: "",
  display_order: 0,
  is_active: true,
});

const createDefaultIntensityForm = (): IntensityFormState => ({
  ...createTranslationState(),
  code: "",
  icon_emoji: "",
  level_value: 1,
  display_order: 0,
  is_active: true,
});

const createDefaultTaxonomyForm = (): TaxonomyFormState => ({
  ...createTranslationState(),
  code: "",
  category: "",
  display_order: 0,
  is_active: true,
});

const mapCategoryToForm = (item?: ActivityCategory | null): CategoryFormState => {
  const base = createDefaultCategoryForm();
  if (!item) return base;
  const next = { ...base, id: item.id, code: item.code, icon_emoji: item.icon_emoji || "", icon_name: item.icon_name || "", color_class: item.color_class || "", display_order: item.display_order || 0, is_active: item.is_active ?? true };
  LANGUAGE_CODES.forEach((code) => {
    const labelKey = `label_${code}` as LabelField;
    const descKey = `description_${code}` as DescriptionField;
    next[labelKey] = item[labelKey] || "";
    next[descKey] = item[descKey] || "";
  });
  return next;
};

const mapIntensityToForm = (item?: ActivityIntensityLevel | null): IntensityFormState => {
  const base = createDefaultIntensityForm();
  if (!item) return base;
  const next = { ...base, id: item.id, code: item.code, icon_emoji: item.icon_emoji || "", level_value: item.level_value || 1, display_order: item.display_order || 0, is_active: item.is_active ?? true };
  LANGUAGE_CODES.forEach((code) => {
    const labelKey = `label_${code}` as LabelField;
    const descKey = `description_${code}` as DescriptionField;
    next[labelKey] = item[labelKey] || "";
    next[descKey] = item[descKey] || "";
  });
  return next;
};

const mapTaxonomyToForm = (item?: ActivityInterest | ActivityAvoidance | null): TaxonomyFormState => {
  const base = createDefaultTaxonomyForm();
  if (!item) return base;
  const next = { ...base, id: item.id, code: item.code, category: item.category || "", display_order: item.display_order || 0, is_active: item.is_active ?? true };
  LANGUAGE_CODES.forEach((code) => {
    const labelKey = `label_${code}` as LabelField;
    const descKey = `description_${code}` as DescriptionField;
    next[labelKey] = item[labelKey] || "";
    next[descKey] = item[descKey] || "";
  });
  return next;
};

type DialogState = { entity: 'category' | 'intensity' | 'interest' | 'avoidance'; mode: 'create' | 'edit' };

export const ActivityManagement = () => {
  const { categories, intensityLevels, interests, avoidances, loading, refetch } = useActivitySettings();
  const { i18n } = useTranslation();

  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(createDefaultCategoryForm);
  const [intensityForm, setIntensityForm] = useState<IntensityFormState>(createDefaultIntensityForm);
  const [interestForm, setInterestForm] = useState<TaxonomyFormState>(createDefaultTaxonomyForm);
  const [avoidanceForm, setAvoidanceForm] = useState<TaxonomyFormState>(createDefaultTaxonomyForm);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const openDialog = (entity: DialogState['entity'], item?: ActivityCategory | ActivityIntensityLevel | ActivityInterest | ActivityAvoidance) => {
    if (entity === 'category') {
      setCategoryForm(mapCategoryToForm(item as ActivityCategory));
    } else if (entity === 'intensity') {
      setIntensityForm(mapIntensityToForm(item as ActivityIntensityLevel));
    } else if (entity === 'interest') {
      setInterestForm(mapTaxonomyToForm(item as ActivityInterest));
    } else {
      setAvoidanceForm(mapTaxonomyToForm(item as ActivityAvoidance));
    }
    setDialog({ entity, mode: item ? 'edit' : 'create' });
  };

  const closeDialog = () => {
    setDialog(null);
    setCategoryForm(createDefaultCategoryForm());
    setIntensityForm(createDefaultIntensityForm());
    setInterestForm(createDefaultTaxonomyForm());
    setAvoidanceForm(createDefaultTaxonomyForm());
  };

  const saveCategory = async () => {
    const { id, ...payload } = categoryForm;
    try {
      if (dialog?.mode === 'edit' && id) {
        await activityAdminService.updateCategory(id, payload);
        toast.success("Catégorie mise à jour");
      } else {
        await activityAdminService.createCategory(payload);
        toast.success("Catégorie créée");
      }
      closeDialog();
      refetch();
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la sauvegarde");
    }
  };

  const saveIntensity = async () => {
    const { id, ...payload } = intensityForm;
    try {
      if (dialog?.mode === 'edit' && id) {
        await activityAdminService.updateIntensityLevel(id, payload);
        toast.success("Niveau d'intensité mis à jour");
      } else {
        await activityAdminService.createIntensityLevel(payload);
        toast.success("Niveau d'intensité créé");
      }
      closeDialog();
      refetch();
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la sauvegarde");
    }
  };

  const saveTaxonomy = async (entity: 'interest' | 'avoidance') => {
    const form = entity === 'interest' ? interestForm : avoidanceForm;
    const { id, category, ...rest } = form;
    const payload = { ...rest, category: category || null };
    try {
      if (entity === 'interest') {
        if (dialog?.mode === 'edit' && id) {
          await activityAdminService.updateInterest(id, payload);
          toast.success("Centre d'intérêt mis à jour");
        } else {
          await activityAdminService.createInterest(payload);
          toast.success("Centre d'intérêt créé");
        }
      } else {
        if (dialog?.mode === 'edit' && id) {
          await activityAdminService.updateAvoidance(id, payload);
          toast.success("Élément à éviter mis à jour");
        } else {
          await activityAdminService.createAvoidance(payload);
          toast.success("Élément à éviter créé");
        }
      }
      closeDialog();
      refetch();
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la sauvegarde");
    }
  };

  const handleDelete = async (entity: DialogState['entity'], id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) return;
    try {
      if (entity === 'category') await activityAdminService.deleteCategory(id);
      else if (entity === 'intensity') await activityAdminService.deleteIntensityLevel(id);
      else if (entity === 'interest') await activityAdminService.deleteInterest(id);
      else await activityAdminService.deleteAvoidance(id);
      toast.success("Élément supprimé");
      refetch();
    } catch {
      toast.error("Suppression impossible");
    }
  };

  const toggleStatus = async (entity: DialogState['entity'], itemId: string, current: boolean) => {
    try {
      const payload = { is_active: !current };
      if (entity === 'category') await activityAdminService.updateCategory(itemId, payload);
      else if (entity === 'intensity') await activityAdminService.updateIntensityLevel(itemId, payload);
      else if (entity === 'interest') await activityAdminService.updateInterest(itemId, payload);
      else await activityAdminService.updateAvoidance(itemId, payload);
      toast.success("Statut mis à jour");
      refetch();
    } catch {
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const renderStatusCell = (entity: DialogState['entity'], item: { id: string; is_active: boolean }) => (
    <div className="flex items-center gap-2">
      <Switch checked={item.is_active} onCheckedChange={() => toggleStatus(entity, item.id, item.is_active)} />
      <Badge variant={item.is_active ? "default" : "secondary"}>
        {item.is_active ? "Actif" : "Inactif"}
      </Badge>
    </div>
  );

  if (loading) {
    return <div className="flex justify-center p-8">Chargement…</div>;
  }

  const dialogTitleMap = {
    category: "catégorie d'activité",
    intensity: "niveau d'intensité",
    interest: "centre d'intérêt",
    avoidance: "élément à éviter",
  } as const;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gestion des Activités</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="categories" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="categories" className="flex items-center gap-2"><Activity className="h-4 w-4" />Catégories</TabsTrigger>
              <TabsTrigger value="intensity" className="flex items-center gap-2"><Zap className="h-4 w-4" />Intensité</TabsTrigger>
              <TabsTrigger value="interests" className="flex items-center gap-2"><Heart className="h-4 w-4" />Centres d’intérêt</TabsTrigger>
              <TabsTrigger value="avoidances" className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />À éviter</TabsTrigger>
            </TabsList>

            <TabsContent value="categories">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Catégories d’activités</CardTitle>
                  <Button onClick={() => openDialog('category')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Libellé</TableHead>
                        <TableHead>Emoji / Icone</TableHead>
                        <TableHead>Couleur</TableHead>
                        <TableHead>Ordre</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell>{category.code}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{getLocalizedLabel(category, i18n.language)}</span>
                              <span className="text-xs text-muted-foreground">{category.label_fr}</span>
                            </div>
                          </TableCell>
                          <TableCell>{category.icon_emoji || category.icon_name || '—'}</TableCell>
                          <TableCell>{category.color_class || '—'}</TableCell>
                          <TableCell>{category.display_order}</TableCell>
                          <TableCell>{renderStatusCell('category', category)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => openDialog('category', category)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDelete('category', category.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="intensity">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Niveaux d’intensité</CardTitle>
                  <Button onClick={() => openDialog('intensity')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Libellé</TableHead>
                        <TableHead>Emoji</TableHead>
                        <TableHead>Valeur</TableHead>
                        <TableHead>Ordre</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {intensityLevels.map((level) => (
                        <TableRow key={level.id}>
                          <TableCell>{level.code}</TableCell>
                          <TableCell>{getLocalizedLabel(level, i18n.language)}</TableCell>
                          <TableCell>{level.icon_emoji || '—'}</TableCell>
                          <TableCell>{level.level_value}</TableCell>
                          <TableCell>{level.display_order}</TableCell>
                          <TableCell>{renderStatusCell('intensity', level)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => openDialog('intensity', level)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDelete('intensity', level.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interests">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Centres d’intérêt</CardTitle>
                  <Button onClick={() => openDialog('interest')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Libellé</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Ordre</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {interests.map((interest) => (
                        <TableRow key={interest.id}>
                          <TableCell>{interest.code}</TableCell>
                          <TableCell>{getLocalizedLabel(interest, i18n.language)}</TableCell>
                          <TableCell>
                            {interest.category_detail ? (
                              <Badge variant="outline">{getLocalizedLabel(interest.category_detail, i18n.language)}</Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell>{interest.display_order}</TableCell>
                          <TableCell>{renderStatusCell('interest', interest)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => openDialog('interest', interest)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDelete('interest', interest.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="avoidances">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Éléments à éviter</CardTitle>
                  <Button onClick={() => openDialog('avoidance')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Libellé</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Ordre</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {avoidances.map((avoidance) => (
                        <TableRow key={avoidance.id}>
                          <TableCell>{avoidance.code}</TableCell>
                          <TableCell>{getLocalizedLabel(avoidance, i18n.language)}</TableCell>
                          <TableCell>
                            {avoidance.category_detail ? (
                              <Badge variant="outline">{getLocalizedLabel(avoidance.category_detail, i18n.language)}</Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell>{avoidance.display_order}</TableCell>
                          <TableCell>{renderStatusCell('avoidance', avoidance)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => openDialog('avoidance', avoidance)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDelete('avoidance', avoidance.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!dialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-3xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === 'edit' ? 'Modifier' : 'Ajouter'} {dialog ? dialogTitleMap[dialog.entity] : ''}
            </DialogTitle>
            <DialogDescription>
              Renseignez les libellés dans les 11 langues pour alimenter le Plan Your Trip.
            </DialogDescription>
          </DialogHeader>

          {dialog?.entity === 'category' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Code" value={categoryForm.code} onChange={(value) => setCategoryForm({ ...categoryForm, code: value })} required />
                <InputField label="Emoji" value={categoryForm.icon_emoji} onChange={(value) => setCategoryForm({ ...categoryForm, icon_emoji: value })} />
                <InputField label="Icône Lucide" value={categoryForm.icon_name} onChange={(value) => setCategoryForm({ ...categoryForm, icon_name: value })} />
                <InputField label="Classe couleur" value={categoryForm.color_class} onChange={(value) => setCategoryForm({ ...categoryForm, color_class: value })} />
                <InputField label="Ordre d'affichage" type="number" value={categoryForm.display_order} onChange={(value) => setCategoryForm({ ...categoryForm, display_order: Number(value) || 0 })} />
                <SwitchField label="Actif" checked={categoryForm.is_active} onChange={(checked) => setCategoryForm({ ...categoryForm, is_active: checked })} />
              </div>

              <TranslationFieldGrid
                title="Libellés"
                languages={LABEL_LANG_OPTIONS}
                valueGetter={(code) => categoryForm[`label_${code}` as LabelField]}
                onChange={(code, value) => setCategoryForm((prev) => ({ ...prev, [`label_${code}`]: value } as CategoryFormState))}
              />

              <TranslationFieldGrid
                title="Descriptions"
                languages={DESCRIPTION_LANG_OPTIONS}
                valueGetter={(code) => categoryForm[`description_${code}` as DescriptionField]}
                onChange={(code, value) => setCategoryForm((prev) => ({ ...prev, [`description_${code}`]: value } as CategoryFormState))}
                textarea
              />

              <DialogActions onCancel={closeDialog} onSave={saveCategory} />
            </div>
          )}

          {dialog?.entity === 'intensity' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Code" value={intensityForm.code} onChange={(value) => setIntensityForm({ ...intensityForm, code: value })} required />
                <InputField label="Emoji" value={intensityForm.icon_emoji} onChange={(value) => setIntensityForm({ ...intensityForm, icon_emoji: value })} />
                <InputField label="Valeur" type="number" value={intensityForm.level_value} onChange={(value) => setIntensityForm({ ...intensityForm, level_value: Number(value) || 1 })} />
                <InputField label="Ordre d'affichage" type="number" value={intensityForm.display_order} onChange={(value) => setIntensityForm({ ...intensityForm, display_order: Number(value) || 0 })} />
                <SwitchField label="Actif" checked={intensityForm.is_active} onChange={(checked) => setIntensityForm({ ...intensityForm, is_active: checked })} />
              </div>

              <TranslationFieldGrid
                title="Libellés"
                languages={LABEL_LANG_OPTIONS}
                valueGetter={(code) => intensityForm[`label_${code}` as LabelField]}
                onChange={(code, value) => setIntensityForm((prev) => ({ ...prev, [`label_${code}`]: value } as IntensityFormState))}
              />

              <TranslationFieldGrid
                title="Descriptions"
                languages={DESCRIPTION_LANG_OPTIONS}
                valueGetter={(code) => intensityForm[`description_${code}` as DescriptionField]}
                onChange={(code, value) => setIntensityForm((prev) => ({ ...prev, [`description_${code}`]: value } as IntensityFormState))}
                textarea
              />

              <DialogActions onCancel={closeDialog} onSave={saveIntensity} />
            </div>
          )}

          {dialog?.entity === 'interest' && (
            <TaxonomyDialogContent
              formState={interestForm}
              setFormState={setInterestForm}
              categories={categories}
              onSave={() => saveTaxonomy('interest')}
              onCancel={closeDialog}
            />
          )}

          {dialog?.entity === 'avoidance' && (
            <TaxonomyDialogContent
              formState={avoidanceForm}
              setFormState={setAvoidanceForm}
              categories={categories}
              onSave={() => saveTaxonomy('avoidance')}
              onCancel={closeDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

interface InputFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}

const InputField = ({ label, value, onChange, type = "text", required = false }: InputFieldProps) => (
  <div className="space-y-1">
    <Label>{label}{required && <span className="text-destructive">*</span>}</Label>
    <Input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} required={required} />
  </div>
);

interface SwitchFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const SwitchField = ({ label, checked, onChange }: SwitchFieldProps) => (
  <div className="flex items-center justify-between rounded-lg border p-3">
    <Label>{label}</Label>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

interface DialogActionsProps {
  onCancel: () => void;
  onSave: () => void;
}

const DialogActions = ({ onCancel, onSave }: DialogActionsProps) => (
  <div className="flex justify-end gap-2">
    <Button variant="outline" onClick={onCancel}>
      <X className="h-4 w-4 mr-1" /> Annuler
    </Button>
    <Button onClick={onSave}>
      <Save className="h-4 w-4 mr-1" /> Enregistrer
    </Button>
  </div>
);

interface TranslationFieldGridProps {
  title: string;
  description?: string;
  languages: ReadonlyArray<LanguageOption>;
  valueGetter: (code: LanguageCode) => string;
  onChange: (code: LanguageCode, value: string) => void;
  textarea?: boolean;
}

const TranslationFieldGrid = ({ title, description, languages, valueGetter, onChange, textarea = false }: TranslationFieldGridProps) => (
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

interface TaxonomyDialogProps {
  formState: TaxonomyFormState;
  setFormState: (state: TaxonomyFormState) => void;
  categories: ActivityCategory[];
  onSave: () => void;
  onCancel: () => void;
}

const TaxonomyDialogContent = ({ formState, setFormState, categories, onSave, onCancel }: TaxonomyDialogProps) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <InputField label="Code" value={formState.code} onChange={(value) => setFormState({ ...formState, code: value })} required />
      <div className="space-y-1">
        <Label>Catégorie (optionnel)</Label>
        <Select
          value={formState.category || "none"}
          onValueChange={(value) => setFormState({ ...formState, category: value === "none" ? "" : value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Associer à une catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucune</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.label_fr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <InputField label="Ordre d'affichage" type="number" value={formState.display_order} onChange={(value) => setFormState({ ...formState, display_order: Number(value) || 0 })} />
      <SwitchField label="Actif" checked={formState.is_active} onChange={(checked) => setFormState({ ...formState, is_active: checked })} />
    </div>

    <TranslationFieldGrid
      title="Libellés"
      languages={LABEL_LANG_OPTIONS}
      valueGetter={(code) => formState[`label_${code}` as LabelField]}
      onChange={(code, value) => setFormState((prev) => ({ ...prev, [`label_${code}`]: value } as TaxonomyFormState))}
    />

    <TranslationFieldGrid
      title="Descriptions"
      languages={DESCRIPTION_LANG_OPTIONS}
      valueGetter={(code) => formState[`description_${code}` as DescriptionField]}
      onChange={(code, value) => setFormState((prev) => ({ ...prev, [`description_${code}`]: value } as TaxonomyFormState))}
      textarea
    />

    <DialogActions onCancel={onCancel} onSave={onSave} />
  </div>
);
