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
import { Plus, Edit, Trash2, Save, X, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAccommodationSettings } from '@/hooks/useAccommodationSettings';
import { accommodationSettingsService } from '@/services/accommodationSettingsService';

export const AccommodationManagement = () => {
  const { toast } = useToast();
  const { 
    accommodationTypes, 
    accommodationAmenities, 
    accommodationLocations,
    accommodationAccessibility,
    accommodationSecurity,
    accommodationAmbiance,
    loading,
    refetch 
  } = useAccommodationSettings();
  
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('types');

  type EntityKey =
    | 'accommodation_types'
    | 'accommodation_amenities'
    | 'accommodation_locations'
    | 'accommodation_accessibility'
    | 'accommodation_security'
    | 'accommodation_ambiance';

  const entityHandlers: Record<
    EntityKey,
    {
      create: (payload: any) => Promise<any>;
      update: (id: string, payload: any) => Promise<any>;
      delete: (id: string) => Promise<void>;
    }
  > = {
    accommodation_types: {
      create: accommodationSettingsService.createType,
      update: accommodationSettingsService.updateType,
      delete: accommodationSettingsService.deleteType,
    },
    accommodation_amenities: {
      create: accommodationSettingsService.createAmenity,
      update: accommodationSettingsService.updateAmenity,
      delete: accommodationSettingsService.deleteAmenity,
    },
    accommodation_locations: {
      create: accommodationSettingsService.createLocation,
      update: accommodationSettingsService.updateLocation,
      delete: accommodationSettingsService.deleteLocation,
    },
    accommodation_accessibility: {
      create: accommodationSettingsService.createAccessibility,
      update: accommodationSettingsService.updateAccessibility,
      delete: accommodationSettingsService.deleteAccessibility,
    },
    accommodation_security: {
      create: accommodationSettingsService.createSecurity,
      update: accommodationSettingsService.updateSecurity,
      delete: accommodationSettingsService.deleteSecurity,
    },
    accommodation_ambiance: {
      create: accommodationSettingsService.createAmbiance,
      update: accommodationSettingsService.updateAmbiance,
      delete: accommodationSettingsService.deleteAmbiance,
    },
  };

  const sanitizePayload = (data: Record<string, any>) => {
    const payload = { ...data };
    delete payload.id;
    return payload;
  };

  const handleSave = async (entity: EntityKey, data: any) => {
    try {
      const handlers = entityHandlers[entity];
      if (!handlers) throw new Error('Entité inconnue');

      if (data.id) {
        await handlers.update(data.id, sanitizePayload(data));
        toast({ title: "Élément mis à jour avec succès" });
      } else {
        await handlers.create(sanitizePayload(data));
        toast({ title: "Élément créé avec succès" });
      }
      setEditingItem(null);
      setIsDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (entity: EntityKey, id: string) => {
    try {
      const handlers = entityHandlers[entity];
      if (!handlers) throw new Error('Entité inconnue');
      await handlers.delete(id);
      toast({ title: "Élément supprimé avec succès" });
      refetch();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer",
        variant: "destructive"
      });
    }
  };

  const toggleActive = async (entity: EntityKey, id: string, isActive: boolean) => {
    try {
      const handlers = entityHandlers[entity];
      if (!handlers) throw new Error('Entité inconnue');
      await handlers.update(id, { is_active: !isActive });
      toast({ title: "Statut mis à jour avec succès" });
      refetch();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour",
        variant: "destructive"
      });
    }
  };

  const StandardForm = ({ table }: { table: EntityKey }) => (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      handleSave(table, {
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

  const AmenityForm = () => (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      handleSave('accommodation_amenities', {
        id: editingItem?.id,
        code: formData.get('code'),
        label_fr: formData.get('label_fr'),
        label_en: formData.get('label_en'),
        description_fr: formData.get('description_fr'),
        description_en: formData.get('description_en'),
        icon_emoji: formData.get('icon_emoji'),
        category: formData.get('category'),
        is_active: editingItem?.is_active ?? true,
        display_order: parseInt(formData.get('display_order') as string) || 0
      });
    }} className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="code">Code</Label>
          <Input name="code" defaultValue={editingItem?.code} required />
        </div>
        <div>
          <Label htmlFor="icon_emoji">Emoji</Label>
          <Input name="icon_emoji" defaultValue={editingItem?.icon_emoji} />
        </div>
        <div>
          <Label htmlFor="category">Catégorie</Label>
          <Input name="category" defaultValue={editingItem?.category} placeholder="comfort, wellness, connectivity..." />
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

  const renderTable = (data: any[], tableName: EntityKey, title: string, hasCategory = false) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Dialog open={isDialogOpen && activeTab === tableName.split('_')[1]} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingItem(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Modifier' : 'Ajouter'} {title.toLowerCase().slice(0, -1)}
              </DialogTitle>
            </DialogHeader>
            {hasCategory ? <AmenityForm /> : <StandardForm table={tableName} />}
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
              <TableCell>{item.label_en}</TableCell>
              <TableCell>{item.icon_emoji}</TableCell>
              {hasCategory && <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>}
              <TableCell>{item.display_order}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={() => toggleActive(tableName, item.id, item.is_active)}
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
                    onClick={() => handleDelete(tableName, item.id)}
                  >
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
            {renderTable(accommodationTypes, 'accommodation_types', 'Types d\'Hébergement')}
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
    </Card>
  );
};
