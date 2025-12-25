import { useState, useRef, useCallback } from 'react';
import { DetailedItinerary } from '@/types/trip';
import { API_BASE_URL } from '@/integrations/api/client';

interface StreamingProgress {
  progress: number;
  message: string;
}

interface StreamingState {
  isStreaming: boolean;
  partialContent: string;
  progress: StreamingProgress;
  error: string | null;
  itinerary: DetailedItinerary | null;
  partialItinerary: DetailedItinerary | null;  // NEW: Partial itinerary during streaming
}

interface UseStreamingItineraryReturn {
  streamingState: StreamingState;
  startStreaming: (tripData: any, sessionId: string) => void;
  cancelStreaming: () => void;
}

export const useStreamingItinerary = (): UseStreamingItineraryReturn => {
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    partialContent: '',
    progress: { progress: 0, message: '' },
    error: null,
    itinerary: null,
    partialItinerary: null,  // NEW
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreamingState(prev => ({
      ...prev,
      isStreaming: false,
    }));
  }, []);

  const startStreaming = useCallback(async (tripData: any, sessionId: string) => {
    // Cancel any existing stream
    cancelStreaming();

    // Seed a minimal itinerary so the view renders immediately
    const seededItinerary: DetailedItinerary = {
      title: 'Génération en cours...',
      description: "L'IA prépare votre itinéraire",
      trip: tripData,
      days: [],
      destinationImages: {},
    } as DetailedItinerary;

    setStreamingState({
      isStreaming: true,
      partialContent: '',
      progress: { progress: 0, message: 'Initialisation...' },
      error: null,
      itinerary: null,
      partialItinerary: seededItinerary,
    });

    try {
      abortControllerRef.current = new AbortController();

      // Build absolute URL to Django backend
      const streamUrl = `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/api/v1/travel/planner/stream/`;

      // Get auth token if available
      // Align with the auth storage key used across the app
      const token = localStorage.getItem('tasarini_access_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Use fetch with streaming for SSE
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tripData,
          sessionId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let buffer = '';
      let partialContent = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode the chunk
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';  // Keep incomplete message in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          // Parse SSE format: "event: type\ndata: {json}"
          // Handle multi-line format properly
          const eventMatch = line.match(/event:\s*(\w+)/);
          const dataMatch = line.match(/data:\s*(.+)/s);

          if (!eventMatch || !dataMatch) continue;

          const eventType = eventMatch[1];
          const dataStr = dataMatch[1];

          try {
            const data = JSON.parse(dataStr);

            switch (eventType) {
              case 'progress':
                setStreamingState(prev => ({
                  ...prev,
                  progress: {
                    progress: data.progress || 0,
                    message: data.message || '',
                  },
                }));
                break;

              case 'token': {
                // Use accumulated content from backend (more reliable than appending)
                const accumulated = data.accumulated || (partialContent + (data.token || ''));
                partialContent = accumulated;

                // Try to parse partial JSON to extract partial itinerary
                let parsedPartialItinerary: DetailedItinerary | null = null;
                try {
                  const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    parsedPartialItinerary = JSON.parse(jsonMatch[0]);
                    // Inject trip data if missing (critical for DetailedItineraryView)
                    if (parsedPartialItinerary && !parsedPartialItinerary.trip) {
                      parsedPartialItinerary.trip = tripData;
                    }
                  }
                } catch (e) {
                  // Parsing failed; keep previous partialItinerary to preserve layout/typing
                  parsedPartialItinerary = null;
                }

                setStreamingState(prev => ({
                  ...prev,
                  partialContent,
                  partialItinerary: parsedPartialItinerary ?? prev.partialItinerary,
                  progress: {
                    progress: data.progress || prev.progress.progress,
                    message: `Génération en cours... ${partialContent.length} caractères`,
                  },
                }));
                break;
              }

              case 'section': {
                const { key, value } = data;
                setStreamingState(prev => {
                  const current = prev.partialItinerary || {};
                  const merged = { ...current };

                  switch (key) {
                    case 'header':
                      Object.assign(merged, {
                        title: value?.title,
                        description: value?.description,
                        trip: value?.trip || current.trip || tripData,
                      });
                      break;
                    case 'days':
                      merged.days = value;
                      break;
                    case 'enriched':
                      if (value && typeof value === 'object') {
                        Object.assign(merged, value);
                      }
                      break;
                    case 'budget':
                      if (value && typeof value === 'object') {
                        if (value.totalCost !== undefined) merged.totalCost = value.totalCost;
                        if (value.budgetBreakdown) merged.budgetBreakdown = value.budgetBreakdown;
                      }
                      break;
                    default:
                      merged[key] = value;
                  }

                  // Ensure trip is present
                  if (!merged.trip) {
                    merged.trip = tripData;
                  }

                  return {
                    ...prev,
                    partialItinerary: merged,
                    progress: {
                      progress: data.progress || prev.progress.progress,
                      message: data.message || prev.progress.message || `Section ${key} reçue`,
                    },
                  };
                });
                break;
              }

              case 'complete':
                setStreamingState(prev => ({
                  ...prev,
                  isStreaming: false,
                  itinerary: data.itinerary,
                  progress: {
                    progress: 100,
                    message: 'Itinéraire généré !',
                  },
                }));
                break;

              case 'error':
                setStreamingState(prev => ({
                  ...prev,
                  isStreaming: false,
                  error: data.error || 'Une erreur est survenue',
                }));
                break;

              default:
                console.warn('Unknown SSE event type:', eventType);
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e, dataStr);
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Streaming cancelled by user');
        return;
      }

      console.error('Streaming error:', error);
      setStreamingState(prev => ({
        ...prev,
        isStreaming: false,
        error: error.message || 'Erreur de connexion au streaming',
      }));
    }
  }, [cancelStreaming]);

  return {
    streamingState,
    startStreaming,
    cancelStreaming,
  };
};
