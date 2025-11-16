import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Save, X, Activity, Zap, Heart, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useActivitySettings, ActivityCategory, ActivityIntensityLevel, ActivityInterest, ActivityAvoidance } from "@/hooks/useActivitySettings";
import { activityAdminService } from "@/services/activityAdminService";

export const ActivityManagement = () => {
  const { categories, intensityLevels, interests, avoidances, loading, refetch } = useActivitySettings();
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingIntensity, setEditingIntensity] = useState<string | null>(null);
  const [editingInterest, setEditingInterest] = useState<string | null>(null);
  const [editingAvoidance, setEditingAvoidance] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingIntensity, setIsAddingIntensity] = useState(false);
  const [isAddingInterest, setIsAddingInterest] = useState(false);
  const [isAddingAvoidance, setIsAddingAvoidance] = useState(false);

  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    code: '', label_fr: '', label_en: '', description_fr: '', description_en: '',
    icon_emoji: '', icon_name: '', color_class: '', display_order: 0
  });

  // Intensity form state
  const [intensityForm, setIntensityForm] = useState({
    code: '', label_fr: '', label_en: '', description_fr: '', description_en: '',
    icon_emoji: '', level_value: 1, display_order: 0
  });

  // Interest form state
  const [interestForm, setInterestForm] = useState({
    code: '', label_fr: '', label_en: '', description_fr: '', description_en: '',
    category: '', display_order: 0
  });

  // Avoidance form state
  const [avoidanceForm, setAvoidanceForm] = useState({
    code: '', label_fr: '', label_en: '', description_fr: '', description_en: '',
    category: '', display_order: 0
  });

  const resetCategoryForm = () => {
    setCategoryForm({
      code: '', label_fr: '', label_en: '', description_fr: '', description_en: '',
      icon_emoji: '', icon_name: '', color_class: '', display_order: 0
    });
  };

  const resetIntensityForm = () => {
    setIntensityForm({
      code: '', label_fr: '', label_en: '', description_fr: '', description_en: '',
      icon_emoji: '', level_value: 1, display_order: 0
    });
  };

  const resetInterestForm = () => {
    setInterestForm({
      code: '', label_fr: '', label_en: '', description_fr: '', description_en: '',
      category: '', display_order: 0
    });
  };

  const resetAvoidanceForm = () => {
    setAvoidanceForm({
      code: '', label_fr: '', label_en: '', description_fr: '', description_en: '',
      category: '', display_order: 0
    });
  };

  const handleSaveCategory = async () => {
    try {
      if (isAddingCategory) {
        await activityAdminService.createCategory(categoryForm);
        toast.success("Catégorie d'activité ajoutée avec succès");
      } else if (editingCategory) {
        await activityAdminService.updateCategory(editingCategory, categoryForm);
        toast.success("Catégorie d'activité mise à jour avec succès");
      }

      setIsAddingCategory(false);
      setEditingCategory(null);
      resetCategoryForm();
      refetch();
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la sauvegarde");
    }
  };

  const handleSaveIntensity = async () => {
    try {
      if (isAddingIntensity) {
        await activityAdminService.createIntensityLevel(intensityForm);
        toast.success("Niveau d'intensité ajouté avec succès");
      } else if (editingIntensity) {
        await activityAdminService.updateIntensityLevel(editingIntensity, intensityForm);
        toast.success("Niveau d'intensité mis à jour avec succès");
      }

      setIsAddingIntensity(false);
      setEditingIntensity(null);
      resetIntensityForm();
      refetch();
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la sauvegarde");
    }
  };

  const handleSaveInterest = async () => {
    try {
      if (isAddingInterest) {
        await activityAdminService.createInterest(interestForm);
        toast.success("Centre d'intérêt ajouté avec succès");
      } else if (editingInterest) {
        await activityAdminService.updateInterest(editingInterest, interestForm);
        toast.success("Centre d'intérêt mis à jour avec succès");
      }

      setIsAddingInterest(false);
      setEditingInterest(null);
      resetInterestForm();
      refetch();
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la sauvegarde");
    }
  };

  const handleSaveAvoidance = async () => {
    try {
      if (isAddingAvoidance) {
        await activityAdminService.createAvoidance(avoidanceForm);
        toast.success("Élément à éviter ajouté avec succès");
      } else if (editingAvoidance) {
        await activityAdminService.updateAvoidance(editingAvoidance, avoidanceForm);
        toast.success("Élément à éviter mis à jour avec succès");
      }

      setIsAddingAvoidance(false);
      setEditingAvoidance(null);
      resetAvoidanceForm();
      refetch();
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la sauvegarde");
    }
  };

  const handleToggleActive = async (
    type: 'category' | 'intensity' | 'interest' | 'avoidance',
    id: string,
    currentStatus: boolean,
  ) => {
    try {
      if (type === 'category') {
        await activityAdminService.updateCategory(id, { is_active: !currentStatus });
      } else if (type === 'intensity') {
        await activityAdminService.updateIntensityLevel(id, { is_active: !currentStatus });
      } else if (type === 'interest') {
        await activityAdminService.updateInterest(id, { is_active: !currentStatus });
      } else {
        await activityAdminService.updateAvoidance(id, { is_active: !currentStatus });
      }
      toast.success("Statut mis à jour avec succès");
      refetch();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const handleDelete = async (type: 'category' | 'intensity' | 'interest' | 'avoidance', id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) return;

    try {
      if (type === 'category') {
        await activityAdminService.deleteCategory(id);
      } else if (type === 'intensity') {
        await activityAdminService.deleteIntensityLevel(id);
      } else if (type === 'interest') {
        await activityAdminService.deleteInterest(id);
      } else {
        await activityAdminService.deleteAvoidance(id);
      }
      toast.success("Élément supprimé avec succès");
      refetch();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const startEditCategory = (category: ActivityCategory) => {
    setCategoryForm({
      code: category.code,
      label_fr: category.label_fr,
      label_en: category.label_en,
      description_fr: category.description_fr || '',
      description_en: category.description_en || '',
      icon_emoji: category.icon_emoji || '',
      icon_name: category.icon_name || '',
      color_class: category.color_class || '',
      display_order: category.display_order
    });
    setEditingCategory(category.id);
  };

  const startEditIntensity = (intensity: ActivityIntensityLevel) => {
    setIntensityForm({
      code: intensity.code,
      label_fr: intensity.label_fr,
      label_en: intensity.label_en,
      description_fr: intensity.description_fr || '',
      description_en: intensity.description_en || '',
      icon_emoji: intensity.icon_emoji || '',
      level_value: intensity.level_value,
      display_order: intensity.display_order
    });
    setEditingIntensity(intensity.id);
  };

  const startEditInterest = (interest: ActivityInterest) => {
    setInterestForm({
      code: interest.code,
      label_fr: interest.label_fr,
      label_en: interest.label_en,
      description_fr: interest.description_fr || '',
      description_en: interest.description_en || '',
      category: interest.category || '',
      display_order: interest.display_order
    });
    setEditingInterest(interest.id);
  };

  const startEditAvoidance = (avoidance: ActivityAvoidance) => {
    setAvoidanceForm({
      code: avoidance.code,
      label_fr: avoidance.label_fr,
      label_en: avoidance.label_en,
      description_fr: avoidance.description_fr || '',
      description_en: avoidance.description_en || '',
      category: avoidance.category || '',
      display_order: avoidance.display_order
    });
    setEditingAvoidance(avoidance.id);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestion des Activités</h2>
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Catégories
          </TabsTrigger>
          <TabsTrigger value="intensity" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Intensité
          </TabsTrigger>
          <TabsTrigger value="interests" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Intérêts
          </TabsTrigger>
          <TabsTrigger value="avoidances" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            À éviter
          </TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Catégories d'activités</CardTitle>
              <Button onClick={() => setIsAddingCategory(true)} disabled={isAddingCategory}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une catégorie
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAddingCategory && (
                <Card className="border-dashed">
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="code">Code</Label>
                        <Input
                          id="code"
                          value={categoryForm.code}
                          onChange={(e) => setCategoryForm({...categoryForm, code: e.target.value})}
                          placeholder="ex: culture"
                        />
                      </div>
                      <div>
                        <Label htmlFor="label_fr">Libellé (FR)</Label>
                        <Input
                          id="label_fr"
                          value={categoryForm.label_fr}
                          onChange={(e) => setCategoryForm({...categoryForm, label_fr: e.target.value})}
                          placeholder="ex: Culture & Histoire"
                        />
                      </div>
                      <div>
                        <Label htmlFor="label_en">Libellé (EN)</Label>
                        <Input
                          id="label_en"
                          value={categoryForm.label_en}
                          onChange={(e) => setCategoryForm({...categoryForm, label_en: e.target.value})}
                          placeholder="ex: Culture & History"
                        />
                      </div>
                      <div>
                        <Label htmlFor="icon_emoji">Emoji/Icône</Label>
                        <Input
                          id="icon_emoji"
                          value={categoryForm.icon_emoji}
                          onChange={(e) => setCategoryForm({...categoryForm, icon_emoji: e.target.value})}
                          placeholder="ex: 🏛️"
                        />
                      </div>
                      <div>
                        <Label htmlFor="icon_name">Nom d'icône Lucide</Label>
                        <Input
                          id="icon_name"
                          value={categoryForm.icon_name}
                          onChange={(e) => setCategoryForm({...categoryForm, icon_name: e.target.value})}
                          placeholder="ex: BookOpen"
                        />
                      </div>
                      <div>
                        <Label htmlFor="color_class">Classes CSS couleur</Label>
                        <Input
                          id="color_class"
                          value={categoryForm.color_class}
                          onChange={(e) => setCategoryForm({...categoryForm, color_class: e.target.value})}
                          placeholder="ex: bg-purple-100 text-purple-700"
                        />
                      </div>
                      <div>
                        <Label htmlFor="display_order">Ordre d'affichage</Label>
                        <Input
                          id="display_order"
                          type="number"
                          value={categoryForm.display_order}
                          onChange={(e) => setCategoryForm({...categoryForm, display_order: parseInt(e.target.value)})}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveCategory}>
                        <Save className="h-4 w-4 mr-2" />
                        Sauvegarder
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setIsAddingCategory(false);
                        resetCategoryForm();
                      }}>
                        <X className="h-4 w-4 mr-2" />
                        Annuler
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {categories.map((category) => (
                <Card key={category.id}>
                  <CardContent className="p-4">
                    {editingCategory === category.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`edit-code-${category.id}`}>Code</Label>
                            <Input
                              id={`edit-code-${category.id}`}
                              value={categoryForm.code}
                              onChange={(e) => setCategoryForm({...categoryForm, code: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edit-label_fr-${category.id}`}>Libellé (FR)</Label>
                            <Input
                              id={`edit-label_fr-${category.id}`}
                              value={categoryForm.label_fr}
                              onChange={(e) => setCategoryForm({...categoryForm, label_fr: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleSaveCategory}>
                            <Save className="h-4 w-4 mr-2" />
                            Sauvegarder
                          </Button>
                          <Button variant="outline" onClick={() => {
                            setEditingCategory(null);
                            resetCategoryForm();
                          }}>
                            <X className="h-4 w-4 mr-2" />
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {category.icon_emoji && <span className="text-xl">{category.icon_emoji}</span>}
                          <div>
                            <h3 className="font-medium">{category.label_fr}</h3>
                            <p className="text-sm text-muted-foreground">Code: {category.code}</p>
                          </div>
                          <Badge variant={category.is_active ? "default" : "secondary"}>
                            {category.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={category.is_active}
                            onCheckedChange={() => handleToggleActive('category', category.id, category.is_active)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditCategory(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete('category', category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Intensity Levels Tab */}
        <TabsContent value="intensity">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Niveaux d'intensité</CardTitle>
              <Button onClick={() => setIsAddingIntensity(true)} disabled={isAddingIntensity}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un niveau
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Similar structure for intensity levels */}
              {intensityLevels.map((level) => (
                <Card key={level.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {level.icon_emoji && <span className="text-xl">{level.icon_emoji}</span>}
                        <div>
                          <h3 className="font-medium">{level.label_fr}</h3>
                          <p className="text-sm text-muted-foreground">
                            Code: {level.code} | Valeur: {level.level_value}
                          </p>
                        </div>
                        <Badge variant={level.is_active ? "default" : "secondary"}>
                          {level.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={level.is_active}
                          onCheckedChange={() => handleToggleActive('intensity', level.id, level.is_active)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditIntensity(level)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete('intensity', level.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interests Tab */}
        <TabsContent value="interests">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Centres d'intérêt</CardTitle>
              <Button onClick={() => setIsAddingInterest(true)} disabled={isAddingInterest}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un intérêt
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Similar structure for interests */}
              {interests.map((interest) => (
                <Card key={interest.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{interest.label_fr}</h3>
                        <p className="text-sm text-muted-foreground">
                          Code: {interest.code} {interest.category && `| Catégorie: ${interest.category}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={interest.is_active ? "default" : "secondary"}>
                          {interest.is_active ? "Actif" : "Inactif"}
                        </Badge>
                        <Switch
                          checked={interest.is_active}
                          onCheckedChange={() => handleToggleActive('interest', interest.id, interest.is_active)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditInterest(interest)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete('interest', interest.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Avoidances Tab */}
        <TabsContent value="avoidances">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Éléments à éviter</CardTitle>
              <Button onClick={() => setIsAddingAvoidance(true)} disabled={isAddingAvoidance}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un élément
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Similar structure for avoidances */}
              {avoidances.map((avoidance) => (
                <Card key={avoidance.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{avoidance.label_fr}</h3>
                        <p className="text-sm text-muted-foreground">
                          Code: {avoidance.code} {avoidance.category && `| Catégorie: ${avoidance.category}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={avoidance.is_active ? "default" : "secondary"}>
                          {avoidance.is_active ? "Actif" : "Inactif"}
                        </Badge>
                        <Switch
                          checked={avoidance.is_active}
                          onCheckedChange={() => handleToggleActive('avoidance', avoidance.id, avoidance.is_active)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditAvoidance(avoidance)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete('avoidance', avoidance.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
