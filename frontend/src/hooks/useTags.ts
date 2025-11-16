import { useState, useEffect } from 'react';
import { apiClient } from '@/integrations/api/client';
import { useDebounce } from './useDebounce';

interface TagSuggestion {
  tag: string;
  count: number;
}

export const useTags = (searchTerm: string) => {
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    const fetchTagSuggestions = async () => {
      try {
        setLoading(true);
        const params = debouncedSearchTerm && debouncedSearchTerm.length >= 2 ? { search: debouncedSearchTerm } : undefined;
        const tags = await apiClient.get<Array<{ id: string; code: string; label_fr: string }>>('poi/tags/', params);
        const normalized = (tags || [])
          .map(tag => ({
            tag: tag.label_fr || tag.code,
            count: 0,
          }))
          .filter(tag => !!tag.tag)
          .sort((a, b) => a.tag.localeCompare(b.tag))
          .slice(0, 10);
        setSuggestions(normalized);
      } catch (error) {
        console.error('Error fetching tags:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTagSuggestions();
  }, [debouncedSearchTerm]);

  return { suggestions, loading };
};
