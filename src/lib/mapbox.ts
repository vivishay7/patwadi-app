/**
 * Mapbox Integration
 * Provides geocoding client and location utilities
 * Uses function-style imports for React Native compatibility
 */

import mapboxSdk from "@mapbox/mapbox-sdk";
import geocoding from "@mapbox/mapbox-sdk/services/geocoding";
import Constants from "expo-constants";

const mapboxToken =
  Constants.expoConfig?.extra?.mapboxToken as string | undefined;

export function isMapboxConfigured(): boolean {
  return !!mapboxToken && mapboxToken.length > 0;
}

export function getMapboxConfigError(): string | null {
  if (!mapboxToken) {
    return "Missing EXPO_PUBLIC_MAPBOX_TOKEN in environment";
  }
  return null;
}

const baseClient = mapboxToken
  ? mapboxSdk({ accessToken: mapboxToken })
  : null;

export const geocodingClient = baseClient
  ? geocoding(baseClient)
  : null;

export interface MapboxFeature {
  id: string;
  text?: string; // Short text representation (e.g., "Main St")
  place_name: string; // Full address
  center: [number, number];
  context?: Array<{ id: string; text: string }>;
}

export interface SelectedLocation {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
  placeName?: string;
  city?: string;
  state?: string;
  country?: string;
}

const REGION_AS_CITY = new Set([
  "chandigarh",
  "delhi",
  "puducherry",
  "pondicherry",
]);

function contextText(context: MapboxFeature["context"], prefix: string): string | undefined {
  return context?.find((c) => c.id?.startsWith(prefix))?.text;
}

function inferCityFromPlaceName(placeName?: string): string | undefined {
  if (!placeName) return undefined;
  const lower = placeName.toLowerCase();
  const keywords = [
    "chandigarh",
    "new delhi",
    "delhi",
    "mumbai",
    "pune",
    "shimla",
    "manali",
    "mandi",
  ];
  for (const keyword of keywords) {
    if (lower.includes(keyword)) {
      if (keyword === "new delhi") return "New Delhi";
      return keyword.charAt(0).toUpperCase() + keyword.slice(1);
    }
  }
  return undefined;
}

export function featureToLocation(
  feature: MapboxFeature
): SelectedLocation {
  const [lng, lat] = feature.center;

  const context = feature.context || [];
  const region = contextText(context, "region");
  const city =
    contextText(context, "place") ||
    contextText(context, "locality") ||
    contextText(context, "district") ||
    (region && REGION_AS_CITY.has(region.toLowerCase()) ? region : undefined) ||
    inferCityFromPlaceName(feature.place_name);
  const state = region || undefined;
  const country = contextText(context, "country");

  return {
    address: feature.place_name,
    lat,
    lng,
    placeId: feature.id,
    placeName: feature.place_name,
    city,
    state,
    country,
  };
}

if (!isMapboxConfigured()) {
  console.warn(
    "⚠️ Mapbox not configured. Add EXPO_PUBLIC_MAPBOX_TOKEN to .env.local"
  );
}
