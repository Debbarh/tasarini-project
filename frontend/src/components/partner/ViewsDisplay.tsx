import React, { useState, useEffect } from 'react';
import { getPOIAnalytics } from '@/services/poiService';

interface ViewsDisplayProps {
  pointId: string;
}

const ViewsDisplay: React.FC<ViewsDisplayProps> = ({ pointId }) => {
  const [views, setViews] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchViews();
  }, [pointId]);

  const fetchViews = async () => {
    try {
      const analytics = await getPOIAnalytics(pointId);
      setViews(analytics.views);
    } catch (error) {
      console.error('Erreur lors du chargement des vues:', error);
      // Fallback to 0 if error
      setViews(0);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <span>...</span>;
  }

  return <span>{views} vues ce mois</span>;
};

export default ViewsDisplay;