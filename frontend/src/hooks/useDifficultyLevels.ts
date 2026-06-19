import { useEffect, useState } from 'react';
import { apiClient, extractArrayFromResponse } from '@/integrations/api/client';

export interface DifficultyLevel {
  id: string | number;
  code: string;
  label_fr?: string;
  label_en?: string;
  [key: string]: any;
}

/** Niveaux de difficulté (poi/difficulty-levels/) — utilisés par les formulaires POI. */
export const useDifficultyLevels = () => {
  const [difficultyLevels, setDifficultyLevels] = useState<DifficultyLevel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await apiClient.get<any>('poi/difficulty-levels/');
        if (active) setDifficultyLevels(extractArrayFromResponse(data) || []);
      } catch {
        if (active) setDifficultyLevels([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return { difficultyLevels, loading };
};

export default useDifficultyLevels;
