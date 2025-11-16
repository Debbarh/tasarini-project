import { apiClient } from '@/integrations/api/client';
import { DetailedItinerary, TripFormData, Destination } from '@/types/trip';

export interface PlanTripResponse {
  itinerary: DetailedItinerary;
  hasUserContext: boolean;
  hasLocalContext: boolean;
}

const ENDPOINT = 'travel/planner/';

const serializeDestination = (destination: Destination) => ({
  ...destination,
  startDate: destination.startDate ? destination.startDate.toISOString() : undefined,
  endDate: destination.endDate ? destination.endDate.toISOString() : undefined,
});

const serializeTripData = (tripData: TripFormData) => ({
  ...tripData,
  startDate: tripData.startDate ? tripData.startDate.toISOString() : null,
  endDate: tripData.endDate ? tripData.endDate.toISOString() : null,
  destinations: tripData.destinations?.map(serializeDestination) ?? [],
});

export const tripPlannerService = {
  planTrip(tripData: TripFormData, userId?: string | number) {
    return apiClient.post<PlanTripResponse>(ENDPOINT, {
      tripData: serializeTripData(tripData),
      userId,
    });
  },
};
