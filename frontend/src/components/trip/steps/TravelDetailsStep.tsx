import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Baby, Heart, UsersIcon, User, Accessibility, Briefcase } from "lucide-react";
import { TripFormData, TravelGroup } from "@/types/trip";
import { useTravelGroupTypes } from "@/hooks/useTravelGroupTypes";
import { getFilterExplanation, getMaxDifficultyForGroup } from "@/services/poiTargetMatchingService";
import { countAffordablePOIs } from '@/services/budgetPOIMatchingService';
import { getPOIsInRadius } from '@/services/poiService';

interface TravelDetailsStepProps {
  data: Partial<TripFormData>;
  onUpdate: (data: Partial<TripFormData>) => void;
  onValidate: (isValid: boolean) => void;
}

// Mapping des icônes
const iconMap = {
  'user': User,
  'heart': Heart,
  'users': Users,
  'users-2': UsersIcon,
  'accessibility': Accessibility,
  'briefcase': Briefcase,
  'baby': Baby,
} as const;

export const TravelDetailsStep = ({ data, onUpdate, onValidate }: TravelDetailsStepProps) => {
  const { types, configurations, getConfigurationForType, getSubtypesForType, loading, error } = useTravelGroupTypes();
  const [travelGroup, setTravelGroup] = useState<TravelGroup>(
    data.travelGroup || { type: 'solo', size: 1 }
  );
  const [compatiblePOIsCount, setCompatiblePOIsCount] = useState<number>(0);
  const [totalPOIsCount, setTotalPOIsCount] = useState<number>(0);
  const [affordablePOIsCount, setAffordablePOIsCount] = useState<number>(0);

  useEffect(() => {
    // Valider que la taille est correcte selon la configuration
    const config = getConfigurationForType(types.find(t => t.code === travelGroup.type)?.id || '');
    let isValid = true;

    if (config) {
      if (config.fixed_size && travelGroup.size !== config.fixed_size) {
        isValid = false;
      } else if (config.min_size && travelGroup.size < config.min_size) {
        isValid = false;
      } else if (config.max_size && travelGroup.size > config.max_size) {
        isValid = false;
      }
    }

    onValidate(isValid && travelGroup.size > 0);
    
    if (isValid) {
      onUpdate({ travelGroup });
    }
  }, [travelGroup, types, getConfigurationForType, onUpdate, onValidate]);

  // Calculate compatible POIs when travel group changes
  useEffect(() => {
    const updatePOICount = async () => {
      if (!data.destinations?.[0]) return;
      
      const destination = data.destinations[0];
      try {
        // Get all POIs in the area (mock data for demonstration)
        const mockPOIs = await getPOIsInRadius(
          destination.latitude || 48.8566, // Default to Paris
          destination.longitude || 2.3522,
          50 // 50km radius
        );
        
        setTotalPOIsCount(mockPOIs.length);
        
        if (data.travelGroup) {
          const { isPOISuitableForGroup } = await import('@/services/poiTargetMatchingService');
          const compatiblePOIs = mockPOIs.filter(poi => 
            isPOISuitableForGroup(poi, data.travelGroup)
          );
          setCompatiblePOIsCount(compatiblePOIs.length);
        }
        
        if (data.budget) {
          const affordablePOIs = countAffordablePOIs(mockPOIs, data.budget);
          setAffordablePOIsCount(affordablePOIs);
        }
      } catch (error) {
        console.error('Error fetching POI count:', error);
      }
    };

    updatePOICount();
  }, [data.travelGroup, data.destinations, data.budget]);

  const updateTravelGroup = (updates: Partial<TravelGroup>) => {
    setTravelGroup(prev => ({ ...prev, ...updates }));
  };

  const handleTypeChange = (typeCode: string) => {
    const selectedType = types.find(t => t.code === typeCode);
    if (!selectedType) return;

    const config = getConfigurationForType(selectedType.id);
    let newSize = travelGroup.size;

    // Ajuster la taille selon la configuration
    if (config?.fixed_size) {
      newSize = config.fixed_size;
    } else if (config?.default_size) {
      newSize = config.default_size;
    }

    updateTravelGroup({ 
      type: typeCode,
      size: newSize,
      // Reset children si le nouveau type ne les autorise pas
      children: config?.allows_children ? travelGroup.children : undefined
    });
  };

  const updateChildAge = (index: number, age: number) => {
    if (travelGroup.children) {
      const updatedAges = [...travelGroup.children.ages];
      updatedAges[index] = age;
      updateTravelGroup({
        children: {
          ...travelGroup.children,
          ages: updatedAges
        }
      });
    }
  };

  const addChild = () => {
    const currentChildren = travelGroup.children || { count: 0, ages: [] };
    const selectedType = types.find(t => t.code === travelGroup.type);
    const config = selectedType ? getConfigurationForType(selectedType.id) : null;
    const defaultAge = config?.min_child_age || 5;

    updateTravelGroup({
      children: {
        count: currentChildren.count + 1,
        ages: [...currentChildren.ages, defaultAge]
      }
    });
  };

  const removeChild = (index: number) => {
    if (travelGroup.children) {
      const newAges = travelGroup.children.ages.filter((_, i) => i !== index);
      updateTravelGroup({
        children: {
          count: Math.max(0, travelGroup.children.count - 1),
          ages: newAges
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Skeleton className="h-6 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        <p>Erreur: {error}</p>
      </div>
    );
  }

  const selectedType = types.find(t => t.code === travelGroup.type);
  const selectedConfig = selectedType ? getConfigurationForType(selectedType.id) : null;
  const selectedSubtypes = selectedType ? getSubtypesForType(selectedType.id) : [];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Compagnons de voyage</h3>
        <p className="text-muted-foreground">
          Précisez la composition de votre groupe de voyage
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Type de voyageur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {types.map((type) => {
              const IconComponent = iconMap[type.icon as keyof typeof iconMap] || Users;
              return (
                <Button
                  key={type.code}
                  variant={travelGroup.type === type.code ? "default" : "outline"}
                  className="h-auto flex-col gap-2 p-4"
                  onClick={() => handleTypeChange(type.code)}
                >
                  <IconComponent className="h-5 w-5" />
                  <div className="text-center">
                    <div className="font-medium">{type.label_fr}</div>
                    <div className="text-xs text-muted-foreground">{type.description_fr}</div>
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Sous-types */}
          {selectedSubtypes.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <Label>Sous-type</Label>
              <Select
                value={travelGroup.subtype || ''}
                onValueChange={(value) => updateTravelGroup({ subtype: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un sous-type (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  {selectedSubtypes.map((subtype) => (
                    <SelectItem key={subtype.code} value={subtype.code}>
                      {subtype.label_fr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Taille du groupe */}
          {selectedConfig && selectedConfig.requires_size_input && (
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="group-size">
                Taille du groupe
                {selectedConfig.min_size && selectedConfig.max_size && 
                  ` (${selectedConfig.min_size}-${selectedConfig.max_size} personnes)`
                }
              </Label>
              <Input
                id="group-size"
                type="number"
                min={selectedConfig.min_size || 1}
                max={selectedConfig.max_size || 50}
                value={travelGroup.size}
                onChange={(e) => updateTravelGroup({ size: parseInt(e.target.value) || selectedConfig.default_size })}
                className="w-32"
              />
            </div>
          )}

          {/* Section enfants */}
          {selectedConfig?.allows_children && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>Enfants</Label>
                <Button variant="outline" size="sm" onClick={addChild}>
                  <Baby className="h-4 w-4 mr-1" />
                  Ajouter un enfant
                </Button>
              </div>
              
              {travelGroup.children && travelGroup.children.count > 0 && (
                <div className="space-y-2">
                  {travelGroup.children.ages.map((age, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Label className="min-w-fit">Enfant {index + 1} :</Label>
                      <Select
                        value={age.toString()}
                        onValueChange={(value) => updateChildAge(index, parseInt(value))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ 
                            length: (selectedConfig.max_child_age || 17) - (selectedConfig.min_child_age || 0) + 1 
                          }, (_, i) => {
                            const ageValue = (selectedConfig.min_child_age || 0) + i;
                            return (
                              <SelectItem key={ageValue} value={ageValue.toString()}>
                                {ageValue} an{ageValue > 1 ? 's' : ''}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeChild(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-secondary/50">
        <CardContent className="p-4">
          <div className="space-y-4">
            <h4 className="font-medium">Récapitulatif</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {selectedType?.label_fr}
                {travelGroup.subtype && selectedSubtypes.find(s => s.code === travelGroup.subtype) && 
                  ` - ${selectedSubtypes.find(s => s.code === travelGroup.subtype)?.label_fr}`
                }
              </Badge>
              {(selectedConfig?.requires_size_input || travelGroup.size > 1) && (
                <Badge variant="outline">
                  {travelGroup.size} personne{travelGroup.size > 1 ? 's' : ''}
                </Badge>
              )}
              {travelGroup.children && travelGroup.children.count > 0 && (
                <Badge variant="outline">
                  {travelGroup.children.count} enfant{travelGroup.children.count > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* Impact sur les recommandations POI */}
            <div className="mt-4 p-3 bg-background rounded-lg border">
              <h5 className="font-medium text-sm mb-2">Impact sur vos recommandations :</h5>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Niveau max: {(() => {
                      const difficultyLabels = ['', 'Très facile', 'Facile', 'Modéré', 'Difficile', 'Très difficile'];
                      return difficultyLabels[getMaxDifficultyForGroup(travelGroup)];
                    })()}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  {getFilterExplanation(travelGroup).map((explanation, index) => (
                    <div key={index}>• {explanation}</div>
                  ))}
                </div>
                
                {compatiblePOIsCount > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-green-700 font-medium">
                        {compatiblePOIsCount} POI{compatiblePOIsCount > 1 ? 's' : ''} compatible{compatiblePOIsCount > 1 ? 's' : ''} trouvé{compatiblePOIsCount > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-green-600 text-sm mt-1">
                      Sur {totalPOIsCount} POI{totalPOIsCount > 1 ? 's' : ''} dans la région
                    </p>
                    {data.budget && affordablePOIsCount !== totalPOIsCount && (
                      <p className="text-green-600 text-sm">
                        💰 {affordablePOIsCount} POI{affordablePOIsCount > 1 ? 's' : ''} dans votre budget
                      </p>
                    )}
                  </div>
                )}

                {compatiblePOIsCount === 0 && totalPOIsCount > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-600">⚠</span>
                      <span className="text-amber-700 font-medium">
                        Aucun POI compatible trouvé
                      </span>
                    </div>
                    <p className="text-amber-600 text-sm mt-1">
                      Considérez ajuster vos critères pour plus d'options ({totalPOIsCount} POI{totalPOIsCount > 1 ? 's' : ''} disponible{totalPOIsCount > 1 ? 's' : ''})
                    </p>
                    {data.budget && affordablePOIsCount > 0 && (
                      <p className="text-amber-600 text-sm">
                        💰 {affordablePOIsCount} POI{affordablePOIsCount > 1 ? 's' : ''} reste{affordablePOIsCount > 1 ? 'nt' : ''} dans votre budget
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};