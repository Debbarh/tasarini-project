import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCulinarySettings } from '@/hooks/useCulinarySettings';
import { culinaryAdminService } from '@/services/culinaryAdminService';

export const CulinaryManagement = () => {
  const { toast } = useToast();
  const { 
    dietaryRestrictions, 
    cuisineTypes, 
    adventureLevels,
    restaurantCategories,
    loading,
    refetch 
  } = useCulinarySettings();
  
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dietary');

  type CulinaryType = 'dietary' | 'cuisine' | 'adventure' | 'restaurant';

  const createMap = {
    dietary: culinaryAdminService.createDietaryRestriction,
    cuisine: culinaryAdminService.createCuisineType,
    adventure: culinaryAdminService.createAdventureLevel,
    restaurant: culinaryAdminService.createRestaurantCategory,
  } as const;

  const updateMap = {
    dietary: culinaryAdminService.updateDietaryRestriction,
    cuisine: culinaryAdminService.updateCuisineType,
    adventure: culinaryAdminService.updateAdventureLevel,
    restaurant: culinaryAdminService.updateRestaurantCategory,
  } as const;

  const deleteMap = {
    dietary: culinaryAdminService.deleteDietaryRestriction,
    cuisine: culinaryAdminService.deleteCuisineType,
    adventure: culinaryAdminService.deleteAdventureLevel,
    restaurant: culinaryAdminService.deleteRestaurantCategory,
  } as const;

  const messages = {
    dietary: {
      create: "Restriction alimentaire ajoutée avec succès",
      update: "Restriction alimentaire mise à jour avec succès",
      toggle: "Statut de la restriction mis à jour",
      delete: "Restriction alimentaire supprimée",
    },
    cuisine: {
      create: "Type de cuisine ajouté avec succès",
      update: "Type de cuisine mis à jour avec succès",
      toggle: "Statut du type de cuisine mis à jour",
      delete: "Type de cuisine supprimé",
    },
    adventure: {
      create: "Niveau d'aventure ajouté avec succès",
      update: "Niveau d'aventure mis à jour avec succès",
      toggle: "Statut du niveau d'aventure mis à jour",
      delete: "Niveau d'aventure supprimé",
    },
    restaurant: {
      create: "Catégorie de restaurant ajoutée avec succès",
      update: "Catégorie de restaurant mise à jour avec succès",
      toggle: "Statut de la catégorie mis à jour",
      delete: "Catégorie de restaurant supprimée",
    },
  } as const;

  const handleSubmit = async (type: CulinaryType, data: any) => {
    const { id, ...payload } = data;
    try {
      if (id) {
        await updateMap[type](id, payload);
        toast({ title: messages[type].update });
      } else {
        await createMap[type](payload);
        toast({ title: messages[type].create });
      }
      setEditingItem(null);
      setIsDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de sauvegarder l'élément",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (type: CulinaryType, id: string, isActive: boolean) => {
    try {
      await updateMap[type](id, { is_active: !isActive });
      toast({ title: messages[type].toggle });
      refetch();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (type: CulinaryType, id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) return;
    try {
      await deleteMap[type](id);
      toast({ title: messages[type].delete });
      refetch();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de supprimer l'élément",
        variant: "destructive",
      });
    }
  };

  const DietaryRestrictionsForm = () => (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      handleSubmit('dietary', {
        id: editingItem?.id,
        code: formData.get('code'),
        label_fr: formData.get('label_fr'),
        label_en: formData.get('label_en'),
        description_fr: formData.get('description_fr'),
        description_en: formData.get('description_en'),
        icon_emoji: formData.get('icon_emoji'),
        is_active: editingItem?.is_active ?? true,
        display_order: parseInt(formData.get('display_order') as string) || 0
      });
    }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">Code</Label>
          <Input name="code" defaultValue={editingItem?.code} required />
        </div>
        <div>
          <Label htmlFor="icon_emoji">Emoji</Label>
          <Input name="icon_emoji" defaultValue={editingItem?.icon_emoji} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="label_fr">Label FR</Label>
          <Input name="label_fr" defaultValue={editingItem?.label_fr} required />
        </div>
        <div>
          <Label htmlFor="label_en">Label EN</Label>
          <Input name="label_en" defaultValue={editingItem?.label_en} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="description_fr">Description FR</Label>
          <Input name="description_fr" defaultValue={editingItem?.description_fr} />
        </div>
        <div>
          <Label htmlFor="description_en">Description EN</Label>
          <Input name="description_en" defaultValue={editingItem?.description_en} />
        </div>
      </div>
      <div>
        <Label htmlFor="display_order">Ordre d'affichage</Label>
        <Input name="display_order" type="number" defaultValue={editingItem?.display_order || 0} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
          <X className="h-4 w-4 mr-2" />
          Annuler
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          Sauvegarder
        </Button>
      </div>
    </form>
  );

  const CuisineTypesForm = () => (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      handleSubmit('cuisine', {
        id: editingItem?.id,
        code: formData.get('code'),
        label_fr: formData.get('label_fr'),
        label_en: formData.get('label_en'),
        description_fr: formData.get('description_fr'),
        description_en: formData.get('description_en'),
        region: formData.get('region'),
        is_active: editingItem?.is_active ?? true,
        display_order: parseInt(formData.get('display_order') as string) || 0
      });
    }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">Code</Label>
          <Input name="code" defaultValue={editingItem?.code} required />
        </div>
        <div>
          <Label htmlFor="region">Région</Label>
          <Input name="region" defaultValue={editingItem?.region} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="label_fr">Label FR</Label>
          <Input name="label_fr" defaultValue={editingItem?.label_fr} required />
        </div>
        <div>
          <Label htmlFor="label_en">Label EN</Label>
          <Input name="label_en" defaultValue={editingItem?.label_en} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="description_fr">Description FR</Label>
          <Input name="description_fr" defaultValue={editingItem?.description_fr} />
        </div>
        <div>
          <Label htmlFor="description_en">Description EN</Label>
          <Input name="description_en" defaultValue={editingItem?.description_en} />
        </div>
      </div>
      <div>
        <Label htmlFor="display_order">Ordre d'affichage</Label>
        <Input name="display_order" type="number" defaultValue={editingItem?.display_order || 0} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
          <X className="h-4 w-4 mr-2" />
          Annuler
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          Sauvegarder
        </Button>
      </div>
    </form>
  );

  const AdventureLevelsForm = () => (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      handleSubmit('adventure', {
        id: editingItem?.id,
        code: formData.get('code'),
        label_fr: formData.get('label_fr'),
        label_en: formData.get('label_en'),
        description_fr: formData.get('description_fr'),
        description_en: formData.get('description_en'),
        level_value: parseInt(formData.get('level_value') as string),
        is_active: editingItem?.is_active ?? true,
        display_order: parseInt(formData.get('display_order') as string) || 0
      });
    }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">Code</Label>
          <Input name="code" defaultValue={editingItem?.code} required />
        </div>
        <div>
          <Label htmlFor="level_value">Valeur du niveau</Label>
          <Input name="level_value" type="number" defaultValue={editingItem?.level_value} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="label_fr">Label FR</Label>
          <Input name="label_fr" defaultValue={editingItem?.label_fr} required />
        </div>
        <div>
          <Label htmlFor="label_en">Label EN</Label>
          <Input name="label_en" defaultValue={editingItem?.label_en} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="description_fr">Description FR</Label>
          <Input name="description_fr" defaultValue={editingItem?.description_fr} />
        </div>
        <div>
          <Label htmlFor="description_en">Description EN</Label>
          <Input name="description_en" defaultValue={editingItem?.description_en} />
        </div>
      </div>
      <div>
        <Label htmlFor="display_order">Ordre d'affichage</Label>
        <Input name="display_order" type="number" defaultValue={editingItem?.display_order || 0} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
          <X className="h-4 w-4 mr-2" />
          Annuler
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          Sauvegarder
        </Button>
      </div>
    </form>
  );

  const RestaurantCategoriesForm = () => (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      handleSubmit('restaurant', {
        id: editingItem?.id,
        code: formData.get('code'),
        label_fr: formData.get('label_fr'),
        label_en: formData.get('label_en'),
        description_fr: formData.get('description_fr'),
        description_en: formData.get('description_en'),
        icon_emoji: formData.get('icon_emoji'),
        price_range_min: parseInt(formData.get('price_range_min') as string) || null,
        price_range_max: parseInt(formData.get('price_range_max') as string) || null,
        is_active: editingItem?.is_active ?? true,
        display_order: parseInt(formData.get('display_order') as string) || 0
      });
    }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">Code</Label>
          <Input name="code" defaultValue={editingItem?.code} required />
        </div>
        <div>
          <Label htmlFor="icon_emoji">Emoji</Label>
          <Input name="icon_emoji" defaultValue={editingItem?.icon_emoji} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="label_fr">Label FR</Label>
          <Input name="label_fr" defaultValue={editingItem?.label_fr} required />
        </div>
        <div>
          <Label htmlFor="label_en">Label EN</Label>
          <Input name="label_en" defaultValue={editingItem?.label_en} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="description_fr">Description FR</Label>
          <Input name="description_fr" defaultValue={editingItem?.description_fr} />
        </div>
        <div>
          <Label htmlFor="description_en">Description EN</Label>
          <Input name="description_en" defaultValue={editingItem?.description_en} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="price_range_min">Prix min (€)</Label>
          <Input name="price_range_min" type="number" defaultValue={editingItem?.price_range_min || ''} />
        </div>
        <div>
          <Label htmlFor="price_range_max">Prix max (€)</Label>
          <Input name="price_range_max" type="number" defaultValue={editingItem?.price_range_max || ''} />
        </div>
        <div>
          <Label htmlFor="display_order">Ordre d'affichage</Label>
          <Input name="display_order" type="number" defaultValue={editingItem?.display_order || 0} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
          <X className="h-4 w-4 mr-2" />
          Annuler
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          Sauvegarder
        </Button>
      </div>
    </form>
  );

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des Préférences Culinaires</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dietary">Restrictions Alimentaires</TabsTrigger>
            <TabsTrigger value="cuisine">Types de Cuisine</TabsTrigger>
            <TabsTrigger value="adventure">Niveaux d'Aventure</TabsTrigger>
            <TabsTrigger value="categories">Catégories Restaurant</TabsTrigger>
          </TabsList>

          <TabsContent value="dietary" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Restrictions Alimentaires</h3>
              <Dialog open={isDialogOpen && activeTab === 'dietary'} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingItem(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? 'Modifier' : 'Ajouter'} une restriction alimentaire
                    </DialogTitle>
                  </DialogHeader>
                  <DietaryRestrictionsForm />
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Label FR</TableHead>
                  <TableHead>Label EN</TableHead>
                  <TableHead>Emoji</TableHead>
                  <TableHead>Ordre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dietaryRestrictions.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.code}</TableCell>
                    <TableCell>{item.label_fr}</TableCell>
                    <TableCell>{item.label_en}</TableCell>
                    <TableCell>{item.icon_emoji}</TableCell>
                    <TableCell>{item.display_order}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={() => handleToggleActive('dietary', item.id, item.is_active)}
                        />
                        <Badge variant={item.is_active ? "default" : "secondary"}>
                          {item.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingItem(item);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete('dietary', item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="cuisine" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Types de Cuisine</h3>
              <Dialog open={isDialogOpen && activeTab === 'cuisine'} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingItem(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? 'Modifier' : 'Ajouter'} un type de cuisine
                    </DialogTitle>
                  </DialogHeader>
                  <CuisineTypesForm />
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Label FR</TableHead>
                  <TableHead>Label EN</TableHead>
                  <TableHead>Région</TableHead>
                  <TableHead>Ordre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cuisineTypes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.code}</TableCell>
                    <TableCell>{item.label_fr}</TableCell>
                    <TableCell>{item.label_en}</TableCell>
                    <TableCell>{item.region}</TableCell>
                    <TableCell>{item.display_order}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={() => handleToggleActive('cuisine', item.id, item.is_active)}
                        />
                        <Badge variant={item.is_active ? "default" : "secondary"}>
                          {item.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingItem(item);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete('cuisine', item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="adventure" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Niveaux d'Aventure Culinaire</h3>
              <Dialog open={isDialogOpen && activeTab === 'adventure'} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingItem(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? 'Modifier' : 'Ajouter'} un niveau d'aventure
                    </DialogTitle>
                  </DialogHeader>
                  <AdventureLevelsForm />
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Label FR</TableHead>
                  <TableHead>Label EN</TableHead>
                  <TableHead>Valeur</TableHead>
                  <TableHead>Ordre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adventureLevels.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.code}</TableCell>
                    <TableCell>{item.label_fr}</TableCell>
                    <TableCell>{item.label_en}</TableCell>
                    <TableCell>{item.level_value}</TableCell>
                    <TableCell>{item.display_order}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={() => handleToggleActive('adventure', item.id, item.is_active)}
                        />
                        <Badge variant={item.is_active ? "default" : "secondary"}>
                          {item.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingItem(item);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete('adventure', item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Catégories de Restaurant</h3>
              <Dialog open={isDialogOpen && activeTab === 'categories'} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingItem(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? 'Modifier' : 'Ajouter'} une catégorie de restaurant
                    </DialogTitle>
                  </DialogHeader>
                  <RestaurantCategoriesForm />
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Label FR</TableHead>
                  <TableHead>Label EN</TableHead>
                  <TableHead>Emoji</TableHead>
                  <TableHead>Prix (€)</TableHead>
                  <TableHead>Ordre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restaurantCategories.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.code}</TableCell>
                    <TableCell>{item.label_fr}</TableCell>
                    <TableCell>{item.label_en}</TableCell>
                    <TableCell>{item.icon_emoji}</TableCell>
                    <TableCell>
                      {item.price_range_min && item.price_range_max ? 
                        `${item.price_range_min}-${item.price_range_max}` : 
                        '-'
                      }
                    </TableCell>
                    <TableCell>{item.display_order}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={() => handleToggleActive('restaurant', item.id, item.is_active)}
                        />
                        <Badge variant={item.is_active ? "default" : "secondary"}>
                          {item.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingItem(item);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete('restaurant', item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
