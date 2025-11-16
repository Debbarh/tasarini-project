import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/integrations/api/client";

// Function to clean country names
const cleanCountryName = (countryName: string): string => {
  if (!countryName) return countryName;
  
  // Remove common suffixes like "(le)", "(la)", "(les)", etc.
  return countryName
    .replace(/\s*\([^)]*\)\s*$/g, '') // Remove anything in parentheses at the end
    .trim();
};

interface UserLocation {
  country?: string;
  city?: string;
  region?: string;
}

interface AnalyticsData {
  sessionId: string;
  userLocation: UserLocation;
  stepCompleted: string;
  tripData: any;
  completionStatus: 'in_progress' | 'completed' | 'abandoned';
}

export const useAnalytics = () => {
  const [sessionId] = useState(() => {
    // Create or get existing session ID
    let id = sessionStorage.getItem('travel_analytics_session');
    if (!id) {
      id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('travel_analytics_session', id);
    }
    return id;
  });

  const [userLocation, setUserLocation] = useState<UserLocation>({});

  // Get user location using browser geolocation and IP-based services
  const getUserLocation = useCallback(async () => {
    try {
      // First try to get location from browser geolocation
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              // Use reverse geocoding to get city/country from coordinates
              const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=fr`
              );
              const data = await response.json();
              
              setUserLocation({
                country: cleanCountryName(data.countryName),
                city: data.city,
                region: data.principalSubdivision
              });
            } catch (error) {
            }
          },
          () => {
            // Fallback to IP-based location
            getLocationFromIP();
          },
          { timeout: 10000 }
        );
      } else {
        getLocationFromIP();
      }
    } catch (error) {
    }
  }, []);

  const getLocationFromIP = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      setUserLocation({
        country: cleanCountryName(data.country_name),
        city: data.city,
        region: data.region
      });
    } catch (error) {
    }
  };

  // Track analytics data - optimisé pour éviter les appels multiples
  const trackStep = useCallback(async (stepCompleted: string, tripData: any, completionStatus: 'in_progress' | 'completed' | 'abandoned' = 'completed') => {
    // Ne collecter les données que si le statut est 'completed' pour éviter les appels multiples
    if (completionStatus !== 'completed') {
      return;
    }
    
    try {
      const analyticsData = {
        session_id: sessionId,
        user_country: userLocation.country,
        user_city: userLocation.city,
        user_region: userLocation.region,
        step_completed: stepCompleted,
        completion_status: completionStatus,
        destinations: tripData.destinations ? JSON.stringify(tripData.destinations) : null,
        trip_duration: tripData.destinations ? 
          tripData.destinations.reduce((acc: number, dest: any) => acc + dest.duration, 0) : null,
        travel_group_type: tripData.travelGroup?.type,
        travel_group_size: tripData.travelGroup?.size,
        budget_level: tripData.budget?.level,
        budget_amount: tripData.budget?.dailyBudget,
        budget_currency: tripData.budget?.currency,
        culinary_preferences: tripData.culinaryPreferences ? JSON.stringify(tripData.culinaryPreferences) : null,
        accommodation_preferences: tripData.accommodationPreferences ? JSON.stringify(tripData.accommodationPreferences) : null,
        activity_preferences: tripData.activityPreferences ? JSON.stringify(tripData.activityPreferences) : null,
      };

      await apiClient.post('analytics/travel/', analyticsData);
    } catch (error) {
    }
  }, [sessionId, userLocation]);

  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  return {
    trackStep,
    sessionId,
    userLocation
  };
};
