/**
 * Normalize API responses to handle both paginated and array responses
 *
 * Django REST Framework returns paginated responses as:
 * { results: [...], count: N, next: "...", previous: "..." }
 *
 * But some endpoints return arrays directly: [...]
 *
 * This helper normalizes both formats to always return an array.
 */

export function normalizeApiResponse<T>(data: T[] | { results: T[] } | null | undefined): T[] {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
    return data.results;
  }

  // If it's an object but not a paginated response, return empty array
  return [];
}

/**
 * Check if a response is paginated
 */
export function isPaginatedResponse<T>(data: unknown): data is { results: T[]; count: number } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'results' in data &&
    Array.isArray((data as any).results)
  );
}
