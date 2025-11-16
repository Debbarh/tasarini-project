import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Hash } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTags } from '@/hooks/useTags';

interface TagsAutocompleteProps {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  placeholder?: string;
}

export const TagsAutocomplete: React.FC<TagsAutocompleteProps> = ({
  tags,
  onAddTag,
  onRemoveTag,
  placeholder = "Ajouter un tag..."
}) => {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { suggestions, loading } = useTags(inputValue);

  // Filter out already selected tags
  const filteredSuggestions = suggestions.filter(
    suggestion => !tags.some(tag => tag.toLowerCase() === suggestion.tag.toLowerCase())
  );

  const handleSelectTag = (selectedTag: string) => {
    if (!tags.some(tag => tag.toLowerCase() === selectedTag.toLowerCase())) {
      onAddTag(selectedTag);
      setInputValue('');
      setOpen(false);
      inputRef.current?.focus();
    }
  };

  const handleAddCustomTag = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !tags.some(tag => tag.toLowerCase() === trimmedValue.toLowerCase())) {
      onAddTag(trimmedValue);
      setInputValue('');
      // Keep popover open and maintain focus for adding more tags
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        handleSelectTag(filteredSuggestions[0].tag);
      } else {
        handleAddCustomTag();
      }
    }
  };

  // Show popover when input is focused and has value or suggestions
  useEffect(() => {
    if (inputValue.length >= 1 || (inputValue === '' && suggestions.length > 0)) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [inputValue, suggestions.length]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            <Hash className="h-3 w-3" />
            {tag}
            <button
              type="button"
              onClick={() => onRemoveTag(tag)}
              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
            >
              <Plus className="h-3 w-3 rotate-45" />
            </button>
          </Badge>
        ))}
      </div>

      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="flex-1">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="flex-1"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandList>
                {loading ? (
                  <div className="p-2 text-sm text-muted-foreground">Recherche...</div>
                ) : filteredSuggestions.length > 0 ? (
                  <CommandGroup>
                    {filteredSuggestions.map((suggestion) => (
                      <CommandItem
                        key={suggestion.tag}
                        onSelect={() => handleSelectTag(suggestion.tag)}
                        className="cursor-pointer"
                      >
                        <Hash className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="flex-1">{suggestion.tag}</span>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.count}
                        </Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : inputValue.trim() ? (
                  <CommandEmpty>
                    <div className="p-2">
                      <button
                        type="button"
                        onClick={handleAddCustomTag}
                        className="w-full text-left hover:bg-accent hover:text-accent-foreground p-2 rounded-sm"
                      >
                        <Plus className="h-4 w-4 mr-2 inline" />
                        Créer "{inputValue.trim()}"
                      </button>
                    </div>
                  </CommandEmpty>
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">
                    Tags populaires disponibles
                  </div>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={handleAddCustomTag}
          disabled={!inputValue.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};