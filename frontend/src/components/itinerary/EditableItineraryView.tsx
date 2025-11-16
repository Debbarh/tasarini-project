import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DndContext, DragEndEvent, closestCenter, DragOverEvent, DragOverlay, DragStartEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Save, Edit, GripVertical, Clock, MapPin, Euro, X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { SavedItinerary } from '@/hooks/useSavedItineraries';
import { DailyActivity, DayItinerary } from '@/types/trip';

interface EditableItineraryViewProps {
  itinerary: SavedItinerary;
  onSave: (updatedItinerary: SavedItinerary) => void;
  onClose: () => void;
}

interface SortableActivityProps {
  activity: DailyActivity;
  onEdit: (activity: DailyActivity) => void;
}

const SortableActivity: React.FC<SortableActivityProps> = ({ activity, onEdit }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.title + activity.time });

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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(activity)}
              className="ml-2"
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {activity.time} - {activity.endTime}
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {typeof activity.location === 'string' ? activity.location : activity.location?.name || 'Lieu non spécifié'}
            </div>
            <div className="flex items-center gap-1">
              <Euro className="w-3 h-3" />
              {activity.cost}€
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {activity.type}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {activity.difficulty}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {activity.duration} min
            </Badge>
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
  const [editForm, setEditForm] = useState({
    title: activity.title,
    description: activity.description,
    location: activity.location,
    time: activity.time,
    endTime: activity.endTime,
    cost: activity.cost.toString(),
    duration: activity.duration.toString(),
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
    toast.success('Activité mise à jour avec succès');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifier l'activité</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="location">Lieu</Label>
              <Input
                id="location"
                value={typeof editForm.location === 'string' ? editForm.location : editForm.location?.name || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label htmlFor="time">Heure début</Label>
              <Input
                id="time"
                type="time"
                value={editForm.time}
                onChange={(e) => setEditForm(prev => ({ ...prev, time: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="endTime">Heure fin</Label>
              <Input
                id="endTime"
                type="time"
                value={editForm.endTime}
                onChange={(e) => setEditForm(prev => ({ ...prev, endTime: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="cost">Coût (€)</Label>
              <Input
                id="cost"
                type="number"
                value={editForm.cost}
                onChange={(e) => setEditForm(prev => ({ ...prev, cost: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="duration">Durée (min)</Label>
              <Input
                id="duration"
                type="number"
                value={editForm.duration}
                onChange={(e) => setEditForm(prev => ({ ...prev, duration: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Catégorie</Label>
              <Input
                id="category"
                value={editForm.type}
                onChange={(e) => setEditForm(prev => ({ ...prev, type: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="difficulty">Difficulté</Label>
              <select
                id="difficulty"
                value={editForm.difficulty}
                onChange={(e) => setEditForm(prev => ({ ...prev, difficulty: e.target.value as 'easy' | 'moderate' | 'hard' }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="easy">Facile</option>
                <option value="moderate">Modéré</option>
                <option value="hard">Difficile</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder
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
}

const DroppableDay: React.FC<DroppableDayProps> = ({ dayIndex, day, children, onEditDay, onDeleteDay }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayIndex}`,
  });

  return (
    <Card 
      ref={setNodeRef}
      className={`relative ${isOver ? 'ring-2 ring-primary' : ''}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Badge variant="outline">Jour {dayIndex + 1}</Badge>
            {day.destination} - {day.theme}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditDay(dayIndex)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteDay(dayIndex)}
            >
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

const DayEditDialog: React.FC<DayEditDialogProps> = ({
  day,
  dayIndex,
  isOpen,
  onClose,
  onSave,
}) => {
  const [editForm, setEditForm] = useState({
    destination: day?.destination || '',
    theme: day?.theme || '',
  });

  React.useEffect(() => {
    if (day) {
      setEditForm({
        destination: day.destination,
        theme: day.theme,
      });
    }
  }, [day]);

  const handleSave = () => {
    if (!day) return;
    
    const updatedDay: DayItinerary = {
      ...day,
      destination: editForm.destination,
      theme: editForm.theme,
    };

    onSave(dayIndex, updatedDay);
    onClose();
    toast.success('Jour mis à jour avec succès');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le jour {dayIndex + 1}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="destination">Destination</Label>
            <Input
              id="destination"
              value={editForm.destination}
              onChange={(e) => setEditForm(prev => ({ ...prev, destination: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="theme">Thème</Label>
            <Input
              id="theme"
              value={editForm.theme}
              onChange={(e) => setEditForm(prev => ({ ...prev, theme: e.target.value }))}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder
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

const AddActivityDialog: React.FC<AddActivityDialogProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [activityForm, setActivityForm] = useState({
    title: '',
    description: '',
    location: '',
    time: '09:00',
    endTime: '10:00',
    cost: '0',
    duration: '60',
    type: 'Culture',
    difficulty: 'easy' as 'easy' | 'moderate' | 'hard',
  });

  const handleSave = () => {
    const newActivity: DailyActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
    
    // Reset form
    setActivityForm({
      title: '',
      description: '',
      location: '',
      time: '09:00',
      endTime: '10:00',
      cost: '0',
      duration: '60',
      type: 'Culture',
      difficulty: 'easy',
    });
    
    toast.success('Activité ajoutée avec succès');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter une activité</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="new-title">Titre</Label>
              <Input
                id="new-title"
                value={activityForm.title}
                onChange={(e) => setActivityForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="new-location">Lieu</Label>
              <Input
                id="new-location"
                value={activityForm.location}
                onChange={(e) => setActivityForm(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="new-description">Description</Label>
            <Textarea
              id="new-description"
              value={activityForm.description}
              onChange={(e) => setActivityForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label htmlFor="new-time">Heure début</Label>
              <Input
                id="new-time"
                type="time"
                value={activityForm.time}
                onChange={(e) => setActivityForm(prev => ({ ...prev, time: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="new-endTime">Heure fin</Label>
              <Input
                id="new-endTime"
                type="time"
                value={activityForm.endTime}
                onChange={(e) => setActivityForm(prev => ({ ...prev, endTime: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="new-cost">Coût (€)</Label>
              <Input
                id="new-cost"
                type="number"
                value={activityForm.cost}
                onChange={(e) => setActivityForm(prev => ({ ...prev, cost: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="new-duration">Durée (min)</Label>
              <Input
                id="new-duration"
                type="number"
                value={activityForm.duration}
                onChange={(e) => setActivityForm(prev => ({ ...prev, duration: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="new-category">Catégorie</Label>
              <Input
                id="new-category"
                value={activityForm.type}
                onChange={(e) => setActivityForm(prev => ({ ...prev, type: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="new-difficulty">Difficulté</Label>
              <select
                id="new-difficulty"
                value={activityForm.difficulty}
                onChange={(e) => setActivityForm(prev => ({ ...prev, difficulty: e.target.value as 'easy' | 'moderate' | 'hard' }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="easy">Facile</option>
                <option value="moderate">Modéré</option>
                <option value="hard">Difficile</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={!activityForm.title.trim()}>
            <Save className="w-4 h-4 mr-2" />
            Ajouter
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
  const [editedItinerary, setEditedItinerary] = useState<SavedItinerary>(itinerary);
  const [editingActivity, setEditingActivity] = useState<DailyActivity | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeActivity, setActiveActivity] = useState<DailyActivity | null>(null);
  const [editingDay, setEditingDay] = useState<DayItinerary | null>(null);
  const [editingDayIndex, setEditingDayIndex] = useState(-1);
  const [isDayEditDialogOpen, setIsDayEditDialogOpen] = useState(false);
  const [isAddActivityDialogOpen, setIsAddActivityDialogOpen] = useState(false);
  const [selectedDayForActivity, setSelectedDayForActivity] = useState(-1);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    // Find the activity being dragged
    editedItinerary.itinerary_data.days.forEach(day => {
      const activity = day.activities.find(a => a.title + a.time === active.id);
      if (activity) {
        setActiveActivity(activity);
      }
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveActivity(null);

    if (!over || active.id === over.id) return;


    // Find source day and activity
    let sourceDayIndex = -1;
    let sourceActivityIndex = -1;
    let sourceActivity: DailyActivity | null = null;

    editedItinerary.itinerary_data.days.forEach((day, dayIndex) => {
      const activityIndex = day.activities.findIndex(
        activity => activity.title + activity.time === active.id
      );
      if (activityIndex !== -1) {
        sourceDayIndex = dayIndex;
        sourceActivityIndex = activityIndex;
        sourceActivity = day.activities[activityIndex];
      }
    });

    if (!sourceActivity || sourceDayIndex === -1) return;

    // Check if dropping on a day container
    if (typeof over.id === 'string' && over.id.startsWith('day-')) {
      const targetDayIndex = parseInt(over.id.replace('day-', ''));
      
      if (targetDayIndex !== sourceDayIndex) {
        // Moving to different day
        const updatedDays = [...editedItinerary.itinerary_data.days];
        
        // Remove from source day
        updatedDays[sourceDayIndex] = {
          ...updatedDays[sourceDayIndex],
          activities: updatedDays[sourceDayIndex].activities.filter((_, i) => i !== sourceActivityIndex)
        };
        
        // Add to target day at the end
        updatedDays[targetDayIndex] = {
          ...updatedDays[targetDayIndex],
          activities: [...updatedDays[targetDayIndex].activities, sourceActivity]
        };

        setEditedItinerary(prev => ({
          ...prev,
          itinerary_data: {
            ...prev.itinerary_data,
            days: updatedDays,
          },
        }));

        toast.success('Activité déplacée vers un autre jour');
      }
      return;
    }

    // Find target day and activity
    let targetDayIndex = -1;
    let targetActivityIndex = -1;

    editedItinerary.itinerary_data.days.forEach((day, dayIndex) => {
      const activityIndex = day.activities.findIndex(
        activity => activity.title + activity.time === over.id
      );
      if (activityIndex !== -1) {
        targetDayIndex = dayIndex;
        targetActivityIndex = activityIndex;
      }
    });

    if (targetDayIndex === -1) return;

    const updatedDays = [...editedItinerary.itinerary_data.days];

    if (sourceDayIndex === targetDayIndex) {
      // Same day - reorder activities
      const newActivities = arrayMove(
        updatedDays[sourceDayIndex].activities,
        sourceActivityIndex,
        targetActivityIndex
      );
      
      updatedDays[sourceDayIndex] = {
        ...updatedDays[sourceDayIndex],
        activities: newActivities,
      };
    } else {
      // Different days - move activity
      // Remove from source day
      updatedDays[sourceDayIndex] = {
        ...updatedDays[sourceDayIndex],
        activities: updatedDays[sourceDayIndex].activities.filter((_, i) => i !== sourceActivityIndex)
      };
      
      // Add to target day at specific position
      const targetActivities = [...updatedDays[targetDayIndex].activities];
      targetActivities.splice(targetActivityIndex, 0, sourceActivity);
      
      updatedDays[targetDayIndex] = {
        ...updatedDays[targetDayIndex],
        activities: targetActivities
      };
    }

    setEditedItinerary(prev => ({
      ...prev,
      itinerary_data: {
        ...prev.itinerary_data,
        days: updatedDays,
      },
    }));

    toast.success(sourceDayIndex === targetDayIndex ? 'Ordre des activités mis à jour' : 'Activité déplacée vers un autre jour');
  };

  const handleDayEdit = (dayIndex: number, updatedDay: DayItinerary) => {
    const updatedDays = [...editedItinerary.itinerary_data.days];
    updatedDays[dayIndex] = updatedDay;

    setEditedItinerary(prev => ({
      ...prev,
      itinerary_data: {
        ...prev.itinerary_data,
        days: updatedDays,
      },
    }));
  };

  const handleAddDay = () => {
    const newDay: DayItinerary = {
      dayNumber: editedItinerary.itinerary_data.days.length + 1,
      date: new Date().toISOString().split('T')[0],
      destination: "Nouvelle destination",
      theme: "Nouveau thème",
      activities: [],
      meals: {},
      transportation: '',
      totalCost: 0,
      walkingDistance: 0,
    };

    const updatedDays = [...editedItinerary.itinerary_data.days, newDay];

    setEditedItinerary(prev => ({
      ...prev,
      itinerary_data: {
        ...prev.itinerary_data,
        days: updatedDays,
      },
    }));

    toast.success('Nouveau jour ajouté');
  };

  const handleDeleteDay = (dayIndex: number) => {
    if (editedItinerary.itinerary_data.days.length <= 1) {
      toast.error('Impossible de supprimer le dernier jour');
      return;
    }

    const updatedDays = editedItinerary.itinerary_data.days.filter((_, index) => index !== dayIndex);

    setEditedItinerary(prev => ({
      ...prev,
      itinerary_data: {
        ...prev.itinerary_data,
        days: updatedDays,
      },
    }));

    toast.success('Jour supprimé');
  };

  const handleAddActivity = (dayIndex: number) => {
    setSelectedDayForActivity(dayIndex);
    setIsAddActivityDialogOpen(true);
  };

  const handleSaveNewActivity = (activity: DailyActivity) => {
    if (selectedDayForActivity === -1) return;

    const updatedDays = [...editedItinerary.itinerary_data.days];
    updatedDays[selectedDayForActivity].activities.push(activity);

    setEditedItinerary(prev => ({
      ...prev,
      itinerary_data: {
        ...prev.itinerary_data,
        days: updatedDays,
      },
    }));

    setSelectedDayForActivity(-1);
  };

  const handleActivityEdit = (dayIndex: number, activityIndex: number, updatedActivity: DailyActivity) => {
    const updatedDays = [...editedItinerary.itinerary_data.days];
    updatedDays[dayIndex].activities[activityIndex] = updatedActivity;

    setEditedItinerary(prev => ({
      ...prev,
      itinerary_data: {
        ...prev.itinerary_data,
        days: updatedDays,
      },
    }));
  };

  const handleSave = () => {
    onSave(editedItinerary);
    onClose();
    toast.success('Itinéraire sauvegardé avec succès');
  };

  // Collect all activity IDs for global sortable context
  const allActivityIds = editedItinerary.itinerary_data.days.flatMap(day =>
    day.activities.map(activity => activity.title + activity.time)
  );

  // Add day IDs to allow dropping into empty days
  const allDroppableIds = [
    ...allActivityIds,
    ...editedItinerary.itinerary_data.days.map((_, index) => `day-${index}`)
  ];

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{editedItinerary.title}</h1>
            <p className="text-muted-foreground">
              Modifier votre itinéraire - Glissez-déposez pour réorganiser les activités entre les jours
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddDay}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un jour
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
            </Button>
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Fermer
            </Button>
          </div>
        </div>

        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={allDroppableIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-6">
              {editedItinerary.itinerary_data.days.map((day, dayIndex) => (
                <DroppableDay
                  key={dayIndex}
                  dayIndex={dayIndex}
                  day={day}
                  onEditDay={(dayIdx) => {
                    setEditingDay(day);
                    setEditingDayIndex(dayIdx);
                    setIsDayEditDialogOpen(true);
                  }}
                  onDeleteDay={handleDeleteDay}
                >
                  {day.activities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-muted rounded-lg min-h-[120px] flex flex-col items-center justify-center gap-2">
                      <p>Déposez des activités ici ou ajoutez-en une nouvelle</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddActivity(dayIndex)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter une activité
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {day.activities.map((activity) => (
                        <SortableActivity
                          key={activity.title + activity.time}
                          activity={activity}
                          onEdit={(activityToEdit) => {
                            setEditingActivity(activityToEdit);
                            setIsEditDialogOpen(true);
                          }}
                        />
                      ))}
                      <div className="flex justify-center pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddActivity(dayIndex)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Ajouter une activité
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
                       {typeof activeActivity.location === 'string' ? activeActivity.location : activeActivity.location?.name || 'Lieu non spécifié'}
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
          }}
          onSave={(updatedActivity) => {
            // Find and update the activity
            editedItinerary.itinerary_data.days.forEach((day, dayIndex) => {
              const activityIndex = day.activities.findIndex(
                a => a.title === editingActivity.title && a.time === editingActivity.time
              );
              if (activityIndex !== -1) {
                handleActivityEdit(dayIndex, activityIndex, updatedActivity);
              }
            });
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