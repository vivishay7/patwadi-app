/**
 * useAutocomplete Hook
 * Provides location autocomplete using Mapbox Geocoding API
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { 
  geocodingClient, 
  isMapboxConfigured, 
  MapboxFeature, 
  SelectedLocation,
  featureToLocation,
} from "../lib/mapbox";

// ============================================
// TYPES
// ============================================

interface UseAutocompleteOptions {
  /** Countries to limit results to (ISO 3166-1 alpha-2 codes) */
  countries?: string[];
  /** Types of places to search for */
  types?: string[];
  /** Limit number of results */
  limit?: number;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Proximity bias (center point for results) */
  proximity?: [number, number];
  /** City name to filter results by (e.g., "Ahmedabad") */
  city?: string;
  /** State name to filter results by (e.g., "Gujarat") */
  state?: string;
}

interface UseAutocompleteReturn {
  /** Search results */
  results: MapboxFeature[];
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Current query string */
  query: string;
  /** Set query string (triggers search) */
  setQuery: (query: string) => void;
  /** Select a location from results */
  selectLocation: (feature: MapboxFeature) => SelectedLocation;
  /** Clear results */
  clearResults: () => void;
  /** Whether Mapbox is configured */
  isConfigured: boolean;
}

// ============================================
// HOOK
// ============================================

export function useAutocomplete(options: UseAutocompleteOptions = {}): UseAutocompleteReturn {
  const {
    countries = ["in"], // Default to India
    types = ["place", "locality", "neighborhood", "address", "poi"],
    limit = 5,
    debounceMs = 300,
    proximity,
    city,
    state,
  } = options;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MapboxFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);

  // Perform geocoding search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (!isMapboxConfigured()) {
      setError("Mapbox not configured");
      setLoading(false);
      return;
    }

    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    setLoading(true);
    setError(null);

    if (!geocodingClient) {
      setError("Mapbox client not initialized");
      setLoading(false);
      return;
    }

    try {
      // If city is provided, add it to the query to filter by city
      let queryString = searchQuery;
      if (city && !searchQuery.toLowerCase().includes(city.toLowerCase())) {
        queryString = `${searchQuery}, ${city}`;
        if (state && !searchQuery.toLowerCase().includes(state.toLowerCase())) {
          queryString += `, ${state}`;
        }
      }

      const request = geocodingClient.forwardGeocode({
        query: queryString,
        countries,
        types,
        limit,
        autocomplete: true,
        ...(proximity && { proximity }),
      });

      const response = await request.send();

      if (response && response.body && response.body.features) {
        let filteredResults = response.body.features as MapboxFeature[];

        // Filter by city if specified
        if (city) {
          filteredResults = filteredResults.filter((feature) => {
            const placeName = feature.place_name?.toLowerCase() || "";
            const contextText = feature.context
              ?.map((c) => c.text?.toLowerCase())
              .join(" ") || "";
            const searchText = `${placeName} ${contextText}`;
            return searchText.includes(city.toLowerCase());
          });
        }

        setResults(filteredResults);
      } else {
        setResults([]);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Geocoding error:", err);
        setError("Failed to fetch locations");
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, [countries, types, limit, proximity, city, state]);

  // Debounced search effect
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceTimer.current = setTimeout(() => {
      performSearch(query);
    }, debounceMs);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, debounceMs]); // Removed performSearch from deps to prevent infinite loop

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  // Select location handler
  const selectLocation = useCallback((feature: MapboxFeature): SelectedLocation => {
    return featureToLocation(feature);
  }, []);

  // Clear results
  const clearResults = useCallback(() => {
    setResults([]);
    setQuery("");
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    query,
    setQuery,
    selectLocation,
    clearResults,
    isConfigured: isMapboxConfigured(),
  };
}

export default useAutocomplete;

