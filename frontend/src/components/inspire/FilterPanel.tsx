import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Filter, RotateCcw, Star } from "lucide-react";
import { POIFilters } from "@/services/poiService";

interface FilterPanelProps {
  filters: POIFilters;
  onFiltersChange: (filters: POIFilters) => void;
  poiCount: number;
  isLoading: boolean;
}

const FilterPanel = ({ filters, onFiltersChange, poiCount, isLoading }: FilterPanelProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const categories = [
    { id: 'restaurant', labelKey: 'beInspired.filters.categoryRestaurants', color: 'bg-red-500' },
    { id: 'activity', labelKey: 'beInspired.filters.categoryActivities', color: 'bg-blue-500' },
    { id: 'tourist', labelKey: 'beInspired.filters.categoryTourist', color: 'bg-emerald-500' },
    { id: 'other', labelKey: 'beInspired.filters.categoryOther', color: 'bg-gray-500' }
  ];

  const priceRanges = [
    { value: '€', labelKey: 'beInspired.filters.priceEconomical' },
    { value: '€€', labelKey: 'beInspired.filters.priceModerate' },
    { value: '€€€', labelKey: 'beInspired.filters.priceHigh' }
  ];

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const currentCategories = filters.categories || [];
    const newCategories = checked
      ? [...currentCategories, categoryId]
      : currentCategories.filter(c => c !== categoryId);
    
    onFiltersChange({
      ...filters,
      categories: newCategories.length > 0 ? newCategories : undefined
    });
  };

  const handleRatingChange = (value: number[]) => {
    onFiltersChange({
      ...filters,
      rating: value[0] > 0 ? value[0] : undefined
    });
  };

  const handlePriceRangeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      priceRange: value === 'all' ? undefined : value
    });
  };

  const handleAccessibilityChange = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      accessibility: checked || undefined
    });
  };

  const handleKeywordChange = (keyword: string) => {
    onFiltersChange({
      ...filters,
      searchTerm: keyword || undefined
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== null && 
    (Array.isArray(value) ? value.length > 0 : true)
  );

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.categories?.length) count++;
    if (filters.rating) count++;
    if (filters.priceRange) count++;
    if (filters.accessibility) count++;
    if (filters.searchTerm) count++;
    return count;
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('beInspired.filters.title')}
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFilterCount()}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {isLoading ? t('beInspired.filters.searching') : `${poiCount} ${t('beInspired.filters.results')}`}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Keyword search */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('beInspired.filters.keywordSearch')}
              </label>
              <Input
                placeholder={t('beInspired.filters.keywordPlaceholder')}
                value={filters.searchTerm || ''}
                onChange={(e) => handleKeywordChange(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Categories */}
            <div>
              <label className="text-sm font-medium mb-3 block">
                {t('beInspired.filters.categories')}
              </label>
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={category.id}
                      checked={filters.categories?.includes(category.id) || false}
                      onCheckedChange={(checked) => handleCategoryChange(category.id, checked as boolean)}
                    />
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${category.color}`} />
                      <label
                        htmlFor={category.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {t(category.labelKey)}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Minimum rating */}
            <div>
              <label className="text-sm font-medium mb-3 block">
                {t('beInspired.filters.minRating', { rating: filters.rating || 0 })}
              </label>
              <div className="px-2">
                <Slider
                  value={[filters.rating || 0]}
                  onValueChange={handleRatingChange}
                  max={5}
                  min={0}
                  step={0.5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{t('beInspired.filters.allRatings')}</span>
                  <span className="flex items-center gap-0.5">5<Star className="w-3 h-3" /></span>
                </div>
              </div>
            </div>

            {/* Price range */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('beInspired.filters.priceRange')}
              </label>
              <Select value={filters.priceRange || 'all'} onValueChange={handlePriceRangeChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('beInspired.filters.allPrices')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('beInspired.filters.allPrices')}</SelectItem>
                  {priceRanges.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {t(range.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Accessibility */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="accessibility"
                checked={filters.accessibility || false}
                onCheckedChange={handleAccessibilityChange}
              />
              <label
                htmlFor="accessibility"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t('beInspired.filters.accessibility')}
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {t('beInspired.filters.reset')}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default FilterPanel;