import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Users, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { travelGroupService, TravelGroupType, TravelGroupSubtype, TravelGroupConfiguration } from "@/services/travelGroupService";

type TypeFormState = Omit<TravelGroupType, "id" | "configuration">;
type SubtypeFormState = Omit<TravelGroupSubtype, "id" | "travel_group_type_detail">;
type ConfigFormState = Omit<TravelGroupConfiguration, "id" | "travel_group_type_detail">;

const defaultTypeForm: TypeFormState = {
  code: "",
  label_fr: "",
  label_en: "",
  description_fr: "",
  description_en: "",
  icon: "Users",
  color: "#3B82F6",
  is_active: true,
  display_order: 0,
};

const defaultSubtypeForm: SubtypeFormState = {
  travel_group_type: "",
  code: "",
  label_fr: "",
  label_en: "",
  description_fr: "",
  description_en: "",
  icon: "UserCheck",
  is_active: true,
  display_order: 0,
};

const defaultConfigForm: ConfigFormState = {
  travel_group_type: "",
  has_fixed_size: false,
  fixed_size: null,
  min_size: null,
  max_size: null,
  default_size: null,
  allows_children: true,
  min_child_age: null,
  max_child_age: null,
  requires_size_input: true,
};

export const TravelGroupManagement = () => {
  const { toast } = useToast();
  const [types, setTypes] = useState<TravelGroupType[]>([]);
  const [subtypes, setSubtypes] = useState<TravelGroupSubtype[]>([]);
  const [configurations, setConfigurations] = useState<TravelGroupConfiguration[]>([]);
  const [loading, setLoading] = useState(true);

  const [typeForm, setTypeForm] = useState<TypeFormState>(defaultTypeForm);
  const [subtypeForm, setSubtypeForm] = useState<SubtypeFormState>(defaultSubtypeForm);
  const [configForm, setConfigForm] = useState<ConfigFormState>(defaultConfigForm);

  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingSubtypeId, setEditingSubtypeId] = useState<string | null>(null);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);

  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [subtypeDialogOpen, setSubtypeDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [typeData, subtypeData, configData] = await Promise.all([
        travelGroupService.listTypes(),
        travelGroupService.listSubtypes(),
        travelGroupService.listConfigs(),
      ]);
      setTypes(typeData || []);
      setSubtypes(subtypeData || []);
      setConfigurations(configData || []);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les groupes de voyage",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startCreateType = () => {
    setEditingTypeId(null);
    setTypeForm(defaultTypeForm);
    setTypeDialogOpen(true);
  };

  const startEditType = (type: TravelGroupType) => {
    setEditingTypeId(type.id);
    setTypeForm({
      code: type.code,
      label_fr: type.label_fr,
      label_en: type.label_en ?? "",
      description_fr: type.description_fr ?? "",
      description_en: type.description_en ?? "",
      icon: type.icon ?? "Users",
      color: type.color ?? "#3B82F6",
      is_active: type.is_active,
      display_order: type.display_order,
    });
    setTypeDialogOpen(true);
  };

  const handleSaveType = async () => {
    try {
      if (editingTypeId) {
        await travelGroupService.updateType(editingTypeId, typeForm);
        toast({ title: "Type mis à jour" });
      } else {
        await travelGroupService.createType(typeForm);
        toast({ title: "Type créé" });
      }
      setTypeDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de sauvegarder le type",
        variant: "destructive",
      });
    }
  };

  const startCreateSubtype = () => {
    setEditingSubtypeId(null);
    setSubtypeForm({
      ...defaultSubtypeForm,
      travel_group_type: types[0]?.id || "",
    });
    setSubtypeDialogOpen(true);
  };

  const startEditSubtype = (subtype: TravelGroupSubtype) => {
    setEditingSubtypeId(subtype.id);
    setSubtypeForm({
      travel_group_type: subtype.travel_group_type,
      code: subtype.code,
      label_fr: subtype.label_fr,
      label_en: subtype.label_en ?? "",
      description_fr: subtype.description_fr ?? "",
      description_en: subtype.description_en ?? "",
      icon: subtype.icon ?? "UserCheck",
      is_active: subtype.is_active,
      display_order: subtype.display_order,
    });
    setSubtypeDialogOpen(true);
  };

  const handleSaveSubtype = async () => {
    try {
      if (editingSubtypeId) {
        await travelGroupService.updateSubtype(editingSubtypeId, subtypeForm);
        toast({ title: "Sous-type mis à jour" });
      } else {
        await travelGroupService.createSubtype(subtypeForm);
        toast({ title: "Sous-type créé" });
      }
      setSubtypeDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de sauvegarder le sous-type",
        variant: "destructive",
      });
    }
  };

  const startCreateConfig = () => {
    setEditingConfigId(null);
    setConfigForm({
      ...defaultConfigForm,
      travel_group_type: types[0]?.id || "",
    });
    setConfigDialogOpen(true);
  };

  const startEditConfig = (config: TravelGroupConfiguration) => {
    setEditingConfigId(config.id);
    setConfigForm({
      travel_group_type: config.travel_group_type,
      has_fixed_size: config.has_fixed_size,
      fixed_size: config.fixed_size,
      min_size: config.min_size,
      max_size: config.max_size,
      default_size: config.default_size,
      allows_children: config.allows_children,
      min_child_age: config.min_child_age,
      max_child_age: config.max_child_age,
      requires_size_input: config.requires_size_input,
    });
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = async () => {
    const payload = {
      ...configForm,
      fixed_size: configForm.has_fixed_size ? configForm.fixed_size : null,
    };
    try {
      if (editingConfigId) {
        await travelGroupService.updateConfig(editingConfigId, payload);
        toast({ title: "Configuration mise à jour" });
      } else {
        await travelGroupService.createConfig(payload);
        toast({ title: "Configuration créée" });
      }
      setConfigDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de sauvegarder la configuration",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (type: "groupType" | "subtype", id: string, current: boolean) => {
    try {
      if (type === "groupType") {
        await travelGroupService.updateType(id, { is_active: !current });
      } else {
        await travelGroupService.updateSubtype(id, { is_active: !current });
      }
      fetchData();
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (type: "groupType" | "subtype" | "config", id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) return;
    try {
      if (type === "groupType") {
        await travelGroupService.deleteType(id);
      } else if (type === "subtype") {
        await travelGroupService.deleteSubtype(id);
      } else {
        await travelGroupService.deleteConfig(id);
      }
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de supprimer l'élément",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Chargement des groupes de voyage…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Types */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Types de voyageurs
          </CardTitle>
          <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={startCreateType}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTypeId ? "Modifier le type" : "Nouveau type"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <InputField label="Code" value={typeForm.code} onChange={(value) => setTypeForm((prev) => ({ ...prev, code: value }))} required />
                <InputField label="Label FR" value={typeForm.label_fr} onChange={(value) => setTypeForm((prev) => ({ ...prev, label_fr: value }))} required />
                <InputField label="Label EN" value={typeForm.label_en} onChange={(value) => setTypeForm((prev) => ({ ...prev, label_en: value }))} />
                <TextareaField label="Description FR" value={typeForm.description_fr} onChange={(value) => setTypeForm((prev) => ({ ...prev, description_fr: value }))} />
                <TextareaField label="Description EN" value={typeForm.description_en} onChange={(value) => setTypeForm((prev) => ({ ...prev, description_en: value }))} />
                <InputField label="Icône" value={typeForm.icon || ""} onChange={(value) => setTypeForm((prev) => ({ ...prev, icon: value }))} />
                <InputField label="Couleur hex" value={typeForm.color || ""} onChange={(value) => setTypeForm((prev) => ({ ...prev, color: value }))} />
                <InputField
                  label="Ordre d'affichage"
                  type="number"
                  value={typeForm.display_order}
                  onChange={(value) => setTypeForm((prev) => ({ ...prev, display_order: Number(value) }))}
                />
                <SwitchField label="Actif" checked={typeForm.is_active} onChange={(checked) => setTypeForm((prev) => ({ ...prev, is_active: checked }))} />
                <DialogActions
                  onCancel={() => setTypeDialogOpen(false)}
                  onSave={handleSaveType}
                  saveLabel={editingTypeId ? "Mettre à jour" : "Créer"}
                />
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((type) => (
                <TableRow key={type.id}>
                  <TableCell>{type.code}</TableCell>
                  <TableCell>{type.label_fr}</TableCell>
                  <TableCell className="max-w-md">{type.description_fr}</TableCell>
                  <TableCell>
                    <Badge variant={type.is_active ? "default" : "secondary"}>{type.is_active ? "Actif" : "Inactif"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleToggleActive("groupType", type.id, type.is_active)}>
                        {type.is_active ? "Désactiver" : "Activer"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => startEditType(type)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete("groupType", type.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sous-types */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Sous-types de voyageurs
          </CardTitle>
          <Dialog open={subtypeDialogOpen} onOpenChange={setSubtypeDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={startCreateSubtype}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un sous-type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSubtypeId ? "Modifier le sous-type" : "Nouveau sous-type"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Type parent</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                    value={subtypeForm.travel_group_type}
                    onChange={(e) => setSubtypeForm((prev) => ({ ...prev, travel_group_type: e.target.value }))}
                  >
                    {types.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label_fr}
                      </option>
                    ))}
                  </select>
                </div>
                <InputField label="Code" value={subtypeForm.code} onChange={(value) => setSubtypeForm((prev) => ({ ...prev, code: value }))} required />
                <InputField label="Label FR" value={subtypeForm.label_fr} onChange={(value) => setSubtypeForm((prev) => ({ ...prev, label_fr: value }))} required />
                <InputField label="Label EN" value={subtypeForm.label_en} onChange={(value) => setSubtypeForm((prev) => ({ ...prev, label_en: value }))} />
                <TextareaField label="Description FR" value={subtypeForm.description_fr} onChange={(value) => setSubtypeForm((prev) => ({ ...prev, description_fr: value }))} />
                <TextareaField label="Description EN" value={subtypeForm.description_en} onChange={(value) => setSubtypeForm((prev) => ({ ...prev, description_en: value }))} />
                <InputField label="Icône" value={subtypeForm.icon || ""} onChange={(value) => setSubtypeForm((prev) => ({ ...prev, icon: value }))} />
                <InputField
                  label="Ordre d'affichage"
                  type="number"
                  value={subtypeForm.display_order}
                  onChange={(value) => setSubtypeForm((prev) => ({ ...prev, display_order: Number(value) }))}
                />
                <SwitchField label="Actif" checked={subtypeForm.is_active} onChange={(checked) => setSubtypeForm((prev) => ({ ...prev, is_active: checked }))} />
                <DialogActions
                  onCancel={() => setSubtypeDialogOpen(false)}
                  onSave={handleSaveSubtype}
                  saveLabel={editingSubtypeId ? "Mettre à jour" : "Créer"}
                />
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type parent</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subtypes.map((subtype) => {
                const parentType = types.find((type) => type.id === subtype.travel_group_type);
                return (
                  <TableRow key={subtype.id}>
                    <TableCell>{parentType?.label_fr || "-"}</TableCell>
                    <TableCell>{subtype.code}</TableCell>
                    <TableCell>{subtype.label_fr}</TableCell>
                    <TableCell>
                      <Badge variant={subtype.is_active ? "default" : "secondary"}>{subtype.is_active ? "Actif" : "Inactif"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleToggleActive("subtype", subtype.id, subtype.is_active)}>
                          {subtype.is_active ? "Désactiver" : "Activer"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => startEditSubtype(subtype)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete("subtype", subtype.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Configurations */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Configurations</CardTitle>
          <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={startCreateConfig}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une configuration
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingConfigId ? "Modifier la configuration" : "Nouvelle configuration"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Type associé</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                    value={configForm.travel_group_type}
                    onChange={(e) => setConfigForm((prev) => ({ ...prev, travel_group_type: e.target.value }))}
                  >
                    {types.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label_fr}
                      </option>
                    ))}
                  </select>
                </div>
                <SwitchField
                  label="Taille fixe"
                  description="Applique une taille identique pour tous les groupes."
                  checked={configForm.has_fixed_size}
                  onChange={(checked) => setConfigForm((prev) => ({ ...prev, has_fixed_size: checked }))}
                />
                {configForm.has_fixed_size ? (
                  <InputField
                    label="Taille fixe"
                    type="number"
                    value={configForm.fixed_size ?? ""}
                    onChange={(value) =>
                      setConfigForm((prev) => ({ ...prev, fixed_size: value === "" ? null : Number(value) }))
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <InputField
                      label="Taille minimum"
                      type="number"
                      value={configForm.min_size ?? ""}
                      onChange={(value) =>
                        setConfigForm((prev) => ({ ...prev, min_size: value === "" ? null : Number(value) }))
                      }
                    />
                    <InputField
                      label="Taille maximum"
                      type="number"
                      value={configForm.max_size ?? ""}
                      onChange={(value) =>
                        setConfigForm((prev) => ({ ...prev, max_size: value === "" ? null : Number(value) }))
                      }
                    />
                    <InputField
                      label="Taille par défaut"
                      type="number"
                      value={configForm.default_size ?? ""}
                      onChange={(value) =>
                        setConfigForm((prev) => ({ ...prev, default_size: value === "" ? null : Number(value) }))
                      }
                    />
                  </div>
                )}
                <SwitchField
                  label="Demander une taille précise"
                  description="Affiche un champ obligatoire lors de la réservation."
                  checked={configForm.requires_size_input}
                  onChange={(checked) => setConfigForm((prev) => ({ ...prev, requires_size_input: checked }))}
                />
                <SwitchField
                  label="Autoriser les enfants"
                  checked={configForm.allows_children}
                  onChange={(checked) => setConfigForm((prev) => ({ ...prev, allows_children: checked }))}
                />
                {configForm.allows_children && (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <InputField
                      label="Âge minimum (ans)"
                      type="number"
                      value={configForm.min_child_age ?? ""}
                      onChange={(value) =>
                        setConfigForm((prev) => ({ ...prev, min_child_age: value === "" ? null : Number(value) }))
                      }
                    />
                    <InputField
                      label="Âge maximum (ans)"
                      type="number"
                      value={configForm.max_child_age ?? ""}
                      onChange={(value) =>
                        setConfigForm((prev) => ({ ...prev, max_child_age: value === "" ? null : Number(value) }))
                      }
                    />
                  </div>
                )}
                <DialogActions
                  onCancel={() => setConfigDialogOpen(false)}
                  onSave={handleSaveConfig}
                  saveLabel={editingConfigId ? "Mettre à jour" : "Créer"}
                />
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {configurations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune configuration enregistrée.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>Enfants</TableHead>
                  <TableHead>Saisie</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configurations.map((config) => {
                  const parentType = types.find((type) => type.id === config.travel_group_type);
                  return (
                    <TableRow key={config.id}>
                      <TableCell>
                        <div className="font-medium">{parentType?.label_fr || "Type supprimé"}</div>
                        <p className="text-xs text-muted-foreground">{parentType?.code}</p>
                      </TableCell>
                      <TableCell>
                        {config.has_fixed_size
                          ? `${config.fixed_size ?? "?"} voyageurs`
                          : `${config.min_size ?? "?"} - ${config.max_size ?? "?"} (défaut ${config.default_size ?? "?"})`}
                      </TableCell>
                      <TableCell>
                        {config.allows_children
                          ? `Oui${
                              config.min_child_age !== null && config.max_child_age !== null
                                ? ` (${config.min_child_age}-${config.max_child_age} ans)`
                                : ""
                            }`
                          : "Non"}
                      </TableCell>
                      <TableCell>{config.requires_size_input ? "Obligatoire" : "Optionnel"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => startEditConfig(config)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete("config", config.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

interface InputFieldProps {
  label: string;
  value: string | number | null;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}

const InputField = ({ label, value, onChange, type = "text", required = false }: InputFieldProps) => (
  <div className="space-y-1">
    <Label className="text-sm font-medium">
      {label}
      {required && <span className="ml-1 text-destructive">*</span>}
    </Label>
    <Input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} required={required} />
  </div>
);

interface TextareaFieldProps {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
}

const TextareaField = ({ label, value, onChange }: TextareaFieldProps) => (
  <div className="space-y-1">
    <Label className="text-sm font-medium">{label}</Label>
    <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
  </div>
);

interface SwitchFieldProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const SwitchField = ({ label, description, checked, onChange }: SwitchFieldProps) => (
  <div className="flex items-center justify-between rounded-lg border p-3">
    <div>
      <p className="text-sm font-medium leading-none">{label}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

interface DialogActionsProps {
  onCancel: () => void;
  onSave: () => void;
  saveLabel: string;
}

const DialogActions = ({ onCancel, onSave, saveLabel }: DialogActionsProps) => (
  <div className="flex justify-end gap-2 pt-2">
    <Button variant="outline" onClick={onCancel}>
      Annuler
    </Button>
    <Button onClick={onSave}>{saveLabel}</Button>
  </div>
);

export default TravelGroupManagement;
