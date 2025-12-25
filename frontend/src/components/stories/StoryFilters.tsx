import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Filter, Calendar as CalendarIcon, MapPin, Tag, X, SortDesc, Users } from "lucide-react";
import { format } from "date-fns";

interface StoryFiltersProps {
  filters: {
    search: string;
    tags: string[];
    location: string;
    dateFrom?: string;
    dateTo?: string;
    linkedType?: string;
    storyType?: string;
    sortBy?: 'newest' | 'popular' | 'most_liked' | 'most_commented';
  };
  onFiltersChange: (filters: any) => void;
  resultCount: number;
  isLoading: boolean;
}

export const StoryFilters = ({ filters, onFiltersChange, resultCount, isLoading }: StoryFiltersProps) => {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    filters.dateFrom ? new Date(filters.dateFrom) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    filters.dateTo ? new Date(filters.dateTo) : undefined
  );
  const [newTag, setNewTag] = useState('');

  const handleSearchChange = (value: string) => {
    onFiltersChange({ search: value });
  };

  const handleLocationChange = (value: string) => {
    onFiltersChange({ location: value });
  };

  const handleLinkedTypeChange = (value: string) => {
    onFiltersChange({ linkedType: value === 'all' ? '' : value });
  };

  const handleStoryTypeChange = (value: string) => {
    onFiltersChange({ storyType: value === 'all' ? '' : value });
  };

  const handleSortByChange = (value: string) => {
    onFiltersChange({ sortBy: value });
  };

  const addTag = () => {
    if (newTag.trim() && !filters.tags.includes(newTag.trim())) {
      onFiltersChange({ tags: [...filters.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onFiltersChange({ tags: filters.tags.filter(tag => tag !== tagToRemove) });
  };

  const handleDateFromSelect = (date: Date | undefined) => {
    setDateFrom(date);
    onFiltersChange({ 
      dateFrom: date ? format(date, 'yyyy-MM-dd') : undefined 
    });
  };

  const handleDateToSelect = (date: Date | undefined) => {
    setDateTo(date);
    onFiltersChange({ 
      dateTo: date ? format(date, 'yyyy-MM-dd') : undefined 
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      tags: [],
      location: '',
      dateFrom: undefined,
      dateTo: undefined,
      linkedType: ''
    });
    setDateFrom(undefined);
    setDateTo(undefined);
    setNewTag('');
    setShowAdvanced(false);
  };

  const hasActiveFilters = filters.search || filters.tags.length > 0 || filters.location || 
                          filters.dateFrom || filters.dateTo || filters.linkedType;

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Basic search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('travelStories.filters.searchPlaceholder')}
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              {t('travelStories.filters.filtersButton')}
            </Button>
          </div>

          {/* Advanced filters */}
          {showAdvanced && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Location filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {t('travelStories.filters.location')}
                  </label>
                  <Input
                    placeholder={t('travelStories.filters.locationPlaceholder')}
                    value={filters.location}
                    onChange={(e) => handleLocationChange(e.target.value)}
                  />
                </div>

                {/* Linked type filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('travelStories.filters.linkType')}</label>
                  <Select value={filters.linkedType || 'all'} onValueChange={handleLinkedTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('travelStories.filters.allTypes')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('travelStories.filters.allTypes')}</SelectItem>
                      <SelectItem value="tourist_point">{t('travelStories.filters.touristPoints')}</SelectItem>
                      <SelectItem value="itinerary">{t('travelStories.filters.itineraries')}</SelectItem>
                      <SelectItem value="activity">{t('travelStories.filters.activities')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4" />
                    {t('travelStories.filters.period')}
                  </label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">
                          {dateFrom ? format(dateFrom, "dd/MM") : t('travelStories.filters.from')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={handleDateFromSelect}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">
                          {dateTo ? format(dateTo, "dd/MM") : t('travelStories.filters.to')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={handleDateToSelect}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Tags filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  {t('travelStories.filters.tags')}
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('travelStories.filters.addTagPlaceholder')}
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1"
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    {t('travelStories.filters.addButton')}
                  </Button>
                </div>
                
                {filters.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {filters.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="pr-1">
                        {tag}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTag(tag)}
                          className="ml-1 h-auto p-0 w-4 h-4"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results and clear filters */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {isLoading ? t('travelStories.filters.loading') : `${resultCount} ${resultCount !== 1 ? t('travelStories.filters.resultsPlural') : t('travelStories.filters.results')}`}
              </Badge>
              
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4 mr-1" />
                  {t('travelStories.filters.clearFilters')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};