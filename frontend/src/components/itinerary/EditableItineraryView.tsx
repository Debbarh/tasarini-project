import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DndContext, DragEndEvent, closestCenter, DragStartEvent, DragOverlay, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Save, Edit, GripVertical, Clock, MapPin, Euro, X, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { SavedItinerary } from '@/hooks/useSavedItineraries';
import { DailyActivity, DayItinerary } from '@/types/trip';

interface EditableItineraryViewProps {
  itinerary: SavedItinerary;
  onSave: (updatedItinerary: SavedItinerary) => void;
  onClose: () => void;
}

// Garantit un id stable sur chaque activité (l'IA peut en omettre) — requis pour
// un drag-and-drop fiable et pour cibler suppression/édition sans ambiguïté.
const ensureActivityIds = (it: SavedItinerary): SavedItinerary => ({
  ...it,
  itinerary_data: {
    ...it.itinerary_data,
    days: (it.itinerary_data?.days || []).map((d, di) => ({
      ...d,
      activities: (d.activities || []).map((a, ai) => ({
        ...a,
        id: a.id || `act_${di}_${ai}_${Math.random().toString(36).slice(2, 9)}`,
      })),
    })),
  },
});

interface SortableActivityProps {
  activity: DailyActivity;
  onEdit: (activity: DailyActivity) => void;
  onDelete: (activity: DailyActivity) => void;
}

const SortableActivity: React.FC<SortableActivityProps> = ({ activity, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card border rounded-lg p-4 mb-3"
    >
      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mt-1"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium">{activity.title}</h4>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {activity.description}
              </p>
            </div>
            <div className="flex items-center gap-1 ml-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => onEdit(activity)} aria-label={t('editor.editActivity', "Modifier l'activité")}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(activity)}
                aria-label={t('editor.deleteActivity', "Supprimer l'activité")}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {activity.time}{activity.endTime ? ` - ${activity.endTime}` : ''}
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {typeof activity.location === 'string' ? activity.location : activity.location?.name || t('editor.locationUnspecified', 'Lieu non spécifié')}
            </div>
            <div className="flex items-center gap-1">
              <Euro className="w-3 h-3" />
              {activity.cost}€
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">{activity.type}</Badge>
            <Badge variant="outline" className="text-xs">{activity.difficulty}</Badge>
            {activity.duration && <Badge variant="outline" className="text-xs">{activity.duration}</Badge>}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ActivityEditDialogProps {
  activity: DailyActivity;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedActivity: DailyActivity) => void;
}

const ActivityEditDialog: React.FC<ActivityEditDialogProps> = ({
  activity,
  isOpen,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const [editForm, setEditForm] = useState({
    title: activity.title,
    description: activity.description,
    location: activity.location,
    time: activity.time,
    endTime: activity.endTime,
    cost: activity.cost?.toString() ?? '0',
    duration: (activity.duration ?? '').toString(),
    type: activity.type,
    difficulty: activity.difficulty,
  });

  const handleSave = () => {
    const updatedActivity: DailyActivity = {
      ...activity,
      title: editForm.title,
      description: editForm.description,
      location: editForm.location,
      time: editForm.time,
      endTime: editForm.endTime,
      cost: parseFloat(editForm.cost) || 0,
      duration: editForm.duration,
      type: editForm.type,
      difficulty: editForm.difficulty as 'easy' | 'moderate' | 'hard',
    };

    onSave(updatedActivity);
    onClose();
    toast.success(t('editor.toastActivityUpdated', 'Activité mise à jour'));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('editor.editActivityTitle', "Modifier l'activité")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">{t('editor.title', 'Titre')}</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="location">{t('editor.location', 'Lieu')}</Label>
              <Input
                id="location"
                value={typeof editForm.location === 'string' ? editForm.location : editForm.location?.name || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">{t('editor.description', 'Description')}</Label>
            <Textarea
              id="description"
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label htmlFor="time">{t('editor.startTime', 'Heure début')}</Label>
              <Input id="time" type="time" value={editForm.time}
                onChange={(e) => setEditForm(prev => ({ ...prev, time: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="endTime">{t('editor.endTime', 'Heure fin')}</Label>
              <Input id="endTime" type="time" value={editForm.endTime}
                onChange={(e) => setEditForm(prev => ({ ...prev, endTime: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="cost">{t('editor.cost', 'Coût (€)')}</Label>
              <Input id="cost" type="number" value={editForm.cost}
                onChange={(e) => setEditForm(prev => ({ ...prev, cost: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="duration">{t('editor.duration', 'Durée')}</Label>
              <Input id="duration" value={editForm.duration}
                onChange={(e) => setEditForm(prev => ({ ...prev, duration: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">{t('editor.category', 'Catégorie')}</Label>
              <Input id="category" value={editForm.type}
                onChange={(e) => setEditForm(prev => ({ ...prev, type: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="difficulty">{t('editor.difficulty', 'Difficulté')}</Label>
              <select
                id="difficulty"
                value={editForm.difficulty}
                onChange={(e) => setEditForm(prev => ({ ...prev, difficulty: e.target.value as 'easy' | 'moderate' | 'hard' }))}
                className="w-full p-2 border rounded-md bg-background"
              >
                <option value="easy">{t('editor.difficultyEasy', 'Facile')}</option>
                <option value="moderate">{t('editor.difficultyModerate', 'Modéré')}</option>
                <option value="hard">{t('editor.difficultyHard', 'Difficile')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>{t('editor.cancel', 'Annuler')}</Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            {t('editor.save', 'Sauvegarder')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface DroppableDayProps {
  dayIndex: number;
  day: DayItinerary;
  children: React.ReactNode;
  onEditDay: (dayIndex: number) => void;
  onDeleteDay: (dayIndex: number) => void;
  onMoveDay: (dayIndex: number, direction: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const DroppableDay: React.FC<DroppableDayProps> = ({ dayIndex, day, children, onEditDay, onDeleteDay, onMoveDay, canMoveUp, canMoveDown }) => {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dayIndex}` });

  return (
    <Card ref={setNodeRef} className={`relative ${isOver ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Badge variant="outline">{t('editor.dayN', 'Jour {{n}}', { n: dayIndex + 1 })}</Badge>
            {day.destination} - {day.theme}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" disabled={!canMoveUp} onClick={() => onMoveDay(dayIndex, -1)} aria-label={t('editor.moveDayUp', 'Monter le jour')}>
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" disabled={!canMoveDown} onClick={() => onMoveDay(dayIndex, 1)} aria-label={t('editor.moveDayDown', 'Descendre le jour')}>
              <ChevronDown className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEditDay(dayIndex)} aria-label={t('editor.editDay', 'Modifier le jour')}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDeleteDay(dayIndex)} aria-label={t('editor.deleteDay', 'Supprimer le jour')} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {children}
      </CardContent>
    </Card>
  );
};

interface DayEditDialogProps {
  day: DayItinerary | null;
  dayIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (dayIndex: number, updatedDay: DayItinerary) => void;
}

const DayEditDialog: React.FC<DayEditDialogProps> = ({ day, dayIndex, isOpen, onClose, onSave }) => {
  const { t } = useTranslation();
  const [editForm, setEditForm] = useState({
    destination: day?.destination || '',
    theme: day?.theme || '',
  });

  React.useEffect(() => {
    if (day) setEditForm({ destination: day.destination, theme: day.theme });
  }, [day]);

  const handleSave = () => {
    if (!day) return;
    onSave(dayIndex, { ...day, destination: editForm.destination, theme: editForm.theme });
    onClose();
    toast.success(t('editor.toastDayUpdated', 'Jour mis à jour'));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('editor.editDayN', 'Modifier le jour {{n}}', { n: dayIndex + 1 })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="destination">{t('editor.destination', 'Destination')}</Label>
            <Input id="destination" value={editForm.destination}
              onChange={(e) => setEditForm(prev => ({ ...prev, destination: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="theme">{t('editor.theme', 'Thème')}</Label>
            <Input id="theme" value={editForm.theme}
              onChange={(e) => setEditForm(prev => ({ ...prev, theme: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>{t('editor.cancel', 'Annuler')}</Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            {t('editor.save', 'Sauvegarder')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface AddActivityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (activity: DailyActivity) => void;
}

const AddActivityDialog: React.FC<AddActivityDialogProps> = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation();
  const emptyForm = {
    title: '', description: '', location: '', time: '09:00', endTime: '10:00',
    cost: '0', duration: '60', type: 'Culture', difficulty: 'easy' as 'easy' | 'moderate' | 'hard',
  };
  const [activityForm, setActivityForm] = useState(emptyForm);

  const handleSave = () => {
    const newActivity: DailyActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      title: activityForm.title,
      description: activityForm.description,
      location: activityForm.location,
      time: activityForm.time,
      endTime: activityForm.endTime,
      cost: parseFloat(activityForm.cost) || 0,
      duration: activityForm.duration,
      type: activityForm.type,
      difficulty: activityForm.difficulty,
      tips: '',
      alternatives: [],
    };
    onSave(newActivity);
    onClose();
    setActivityForm(emptyForm);
    toast.success(t('editor.toastActivityAdded', 'Activité ajoutée'));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('editor.addActivity', 'Ajouter une activité')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="new-title">{t('editor.title', 'Titre')}</Label>
              <Input id="new-title" value={activityForm.title}
                onChange={(e) => setActivityForm(prev => ({ ...prev, title: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="new-location">{t('editor.location', 'Lieu')}</Label>
              <Input id="new-location" value={activityForm.location}
                onChange={(e) => setActivityForm(prev => ({ ...prev, location: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label htmlFor="new-description">{t('editor.description', 'Description')}</Label>
            <Textarea id="new-description" value={activityForm.description}
              onChange={(e) => setActivityForm(prev => ({ ...prev, description: e.target.value }))} rows={3} />
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label htmlFor="new-time">{t('editor.startTime', 'Heure début')}</Label>
              <Input id="new-time" type="time" value={activityForm.time}
                onChange={(e) => setActivityForm(prev => ({ ...prev, time: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="new-endTime">{t('editor.endTime', 'Heure fin')}</Label>
              <Input id="new-endTime" type="time" value={activityForm.endTime}
                onChange={(e) => setActivityForm(prev => ({ ...prev, endTime: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="new-cost">{t('editor.cost', 'Coût (€)')}</Label>
              <Input id="new-cost" type="number" value={activityForm.cost}
                onChange={(e) => setActivityForm(prev => ({ ...prev, cost: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="new-duration">{t('editor.duration', 'Durée')}</Label>
              <Input id="new-duration" value={activityForm.duration}
                onChange={(e) => setActivityForm(prev => ({ ...prev, duration: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="new-category">{t('editor.category', 'Catégorie')}</Label>
              <Input id="new-category" value={activityForm.type}
                onChange={(e) => setActivityForm(prev => ({ ...prev, type: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="new-difficulty">{t('editor.difficulty', 'Difficulté')}</Label>
              <select
                id="new-difficulty"
                value={activityForm.difficulty}
                onChange={(e) => setActivityForm(prev => ({ ...prev, difficulty: e.target.value as 'easy' | 'moderate' | 'hard' }))}
                className="w-full p-2 border rounded-md bg-background"
              >
                <option value="easy">{t('editor.difficultyEasy', 'Facile')}</option>
                <option value="moderate">{t('editor.difficultyModerate', 'Modéré')}</option>
                <option value="hard">{t('editor.difficultyHard', 'Difficile')}</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>{t('editor.cancel', 'Annuler')}</Button>
          <Button onClick={handleSave} disabled={!activityForm.title.trim()}>
            <Save className="w-4 h-4 mr-2" />
            {t('editor.add', 'Ajouter')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const EditableItineraryView: React.FC<EditableItineraryViewProps> = ({
  itinerary,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation();
  const [editedItinerary, setEditedItinerary] = useState<SavedItinerary>(() => ensureActivityIds(itinerary));
  const [editingActivity, setEditingActivity] = useState<DailyActivity | null>(null);
  const [editingActivityDayIndex, setEditingActivityDayIndex] = useState(-1);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeActivity, setActiveActivity] = useState<DailyActivity | null>(null);
  const [editingDay, setEditingDay] = useState<DayItinerary | null>(null);
  const [editingDayIndex, setEditingDayIndex] = useState(-1);
  const [isDayEditDialogOpen, setIsDayEditDialogOpen] = useState(false);
  const [isAddActivityDialogOpen, setIsAddActivityDialogOpen] = useState(false);
  const [selectedDayForActivity, setSelectedDayForActivity] = useState(-1);

  const days = editedItinerary.itinerary_data.days;

  const setDays = (updater: (days: DayItinerary[]) => DayItinerary[]) => {
    setEditedItinerary(prev => ({
      ...prev,
      itinerary_data: { ...prev.itinerary_data, days: updater(prev.itinerary_data.days) },
    }));
  };

  const findActivityById = (id: string | number) => {
    for (let di = 0; di < days.length; di++) {
      const ai = days[di].activities.findIndex(a => a.id === id);
      if (ai !== -1) return { dayIndex: di, activityIndex: ai, activity: days[di].activities[ai] };
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const found = findActivityById(event.active.id);
    setActiveActivity(found?.activity || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveActivity(null);
    if (!over || active.id === over.id) return;

    const source = findActivityById(active.id);
    if (!source) return;
    const sourceActivity = source.activity;

    // Dépôt sur un conteneur "jour" (jour vide ou fin de liste)
    if (typeof over.id === 'string' && over.id.startsWith('day-')) {
      const targetDayIndex = parseInt(over.id.replace('day-', ''));
      if (targetDayIndex === source.dayIndex) return;
      setDays(ds => ds.map((d, i) => {
        if (i === source.dayIndex) return { ...d, activities: d.activities.filter(a => a.id !== active.id) };
        if (i === targetDayIndex) return { ...d, activities: [...d.activities, sourceActivity] };
        return d;
      }));
      toast.success(t('editor.toastActivityMoved', 'Activité déplacée vers un autre jour'));
      return;
    }

    const target = findActivityById(over.id);
    if (!target) return;

    if (source.dayIndex === target.dayIndex) {
      setDays(ds => ds.map((d, i) =>
        i === source.dayIndex
          ? { ...d, activities: arrayMove(d.activities, source.activityIndex, target.activityIndex) }
          : d
      ));
      toast.success(t('editor.toastActivitiesReordered', 'Ordre des activités mis à jour'));
    } else {
      setDays(ds => ds.map((d, i) => {
        if (i === source.dayIndex) return { ...d, activities: d.activities.filter(a => a.id !== active.id) };
        if (i === target.dayIndex) {
          const arr = [...d.activities];
          arr.splice(target.activityIndex, 0, sourceActivity);
          return { ...d, activities: arr };
        }
        return d;
      }));
      toast.success(t('editor.toastActivityMoved', 'Activité déplacée vers un autre jour'));
    }
  };

  const handleDayEdit = (dayIndex: number, updatedDay: DayItinerary) => {
    setDays(ds => ds.map((d, i) => (i === dayIndex ? updatedDay : d)));
  };

  const handleMoveDay = (dayIndex: number, direction: -1 | 1) => {
    const target = dayIndex + direction;
    if (target < 0 || target >= days.length) return;
    setDays(ds => arrayMove(ds, dayIndex, target));
  };

  const handleAddDay = () => {
    setDays(ds => [...ds, {
      dayNumber: ds.length + 1,
      date: new Date().toISOString().split('T')[0],
      destination: 'Nouvelle destination',
      theme: 'Nouveau thème',
      activities: [],
      meals: {},
      transportation: '',
      totalCost: 0,
      walkingDistance: 0,
    } as DayItinerary]);
    toast.success(t('editor.toastDayAdded', 'Jour ajouté'));
  };

  const handleDeleteDay = (dayIndex: number) => {
    if (days.length <= 1) {
      toast.error(t('editor.toastCannotDeleteLastDay', 'Impossible de supprimer le dernier jour'));
      return;
    }
    setDays(ds => ds.filter((_, i) => i !== dayIndex));
    toast.success(t('editor.toastDayDeleted', 'Jour supprimé'));
  };

  const handleDeleteActivity = (dayIndex: number, activityId: string | number) => {
    setDays(ds => ds.map((d, i) =>
      i === dayIndex ? { ...d, activities: d.activities.filter(a => a.id !== activityId) } : d
    ));
    toast.success(t('editor.toastActivityDeleted', 'Activité supprimée'));
  };

  const handleAddActivity = (dayIndex: number) => {
    setSelectedDayForActivity(dayIndex);
    setIsAddActivityDialogOpen(true);
  };

  const handleSaveNewActivity = (activity: DailyActivity) => {
    if (selectedDayForActivity === -1) return;
    const dayIdx = selectedDayForActivity;
    setDays(ds => ds.map((d, i) => (i === dayIdx ? { ...d, activities: [...d.activities, activity] } : d)));
    setSelectedDayForActivity(-1);
  };

  const handleActivityEdit = (dayIndex: number, updatedActivity: DailyActivity) => {
    setDays(ds => ds.map((d, i) =>
      i === dayIndex
        ? { ...d, activities: d.activities.map(a => (a.id === updatedActivity.id ? updatedActivity : a)) }
        : d
    ));
  };

  const handleSave = () => {
    onSave(editedItinerary);
    onClose();
    toast.success(t('editor.toastItinerarySaved', 'Itinéraire enregistré'));
  };

  const allActivityIds = days.flatMap(day => day.activities.map(a => a.id));
  const allDroppableIds = [...allActivityIds, ...days.map((_, index) => `day-${index}`)];

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{editedItinerary.title}</h1>
            <p className="text-muted-foreground text-sm">
              {t('editor.subtitle', 'Personnalisez votre programme — glissez-déposez pour réorganiser les activités, modifiez ou supprimez.')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddDay} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              {t('editor.addDay', 'Ajouter un jour')}
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              {t('editor.save', 'Sauvegarder')}
            </Button>
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              {t('editor.close', 'Fermer')}
            </Button>
          </div>
        </div>

        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={allDroppableIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-6">
              {days.map((day, dayIndex) => (
                <DroppableDay
                  key={dayIndex}
                  dayIndex={dayIndex}
                  day={day}
                  canMoveUp={dayIndex > 0}
                  canMoveDown={dayIndex < days.length - 1}
                  onMoveDay={handleMoveDay}
                  onEditDay={(dayIdx) => {
                    setEditingDay(day);
                    setEditingDayIndex(dayIdx);
                    setIsDayEditDialogOpen(true);
                  }}
                  onDeleteDay={handleDeleteDay}
                >
                  {day.activities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-muted rounded-lg min-h-[120px] flex flex-col items-center justify-center gap-2">
                      <p>{t('editor.dropActivitiesHint', 'Déposez des activités ici ou ajoutez-en une nouvelle')}</p>
                      <Button variant="outline" size="sm" onClick={() => handleAddActivity(dayIndex)}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t('editor.addActivity', 'Ajouter une activité')}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {day.activities.map((activity) => (
                        <SortableActivity
                          key={activity.id}
                          activity={activity}
                          onEdit={(activityToEdit) => {
                            setEditingActivity(activityToEdit);
                            setEditingActivityDayIndex(dayIndex);
                            setIsEditDialogOpen(true);
                          }}
                          onDelete={(activityToDelete) => handleDeleteActivity(dayIndex, activityToDelete.id)}
                        />
                      ))}
                      <div className="flex justify-center pt-2">
                        <Button variant="outline" size="sm" onClick={() => handleAddActivity(dayIndex)}>
                          <Plus className="w-4 h-4 mr-2" />
                          {t('editor.addActivity', 'Ajouter une activité')}
                        </Button>
                      </div>
                    </div>
                  )}
                </DroppableDay>
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeActivity ? (
              <div className="bg-card border rounded-lg p-4 shadow-lg opacity-90">
                <div className="flex items-start gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground mt-1" />
                  <div className="flex-1">
                    <h4 className="font-medium">{activeActivity.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {typeof activeActivity.location === 'string' ? activeActivity.location : activeActivity.location?.name || t('editor.locationUnspecified', 'Lieu non spécifié')}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {editingActivity && (
        <ActivityEditDialog
          activity={editingActivity}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingActivity(null);
            setEditingActivityDayIndex(-1);
          }}
          onSave={(updatedActivity) => {
            if (editingActivityDayIndex !== -1) {
              handleActivityEdit(editingActivityDayIndex, updatedActivity);
            }
          }}
        />
      )}

      {editingDay && (
        <DayEditDialog
          day={editingDay}
          dayIndex={editingDayIndex}
          isOpen={isDayEditDialogOpen}
          onClose={() => {
            setIsDayEditDialogOpen(false);
            setEditingDay(null);
            setEditingDayIndex(-1);
          }}
          onSave={handleDayEdit}
        />
      )}

      <AddActivityDialog
        isOpen={isAddActivityDialogOpen}
        onClose={() => {
          setIsAddActivityDialogOpen(false);
          setSelectedDayForActivity(-1);
        }}
        onSave={handleSaveNewActivity}
      />
    </div>
  );
};
