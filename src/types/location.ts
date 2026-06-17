/**
 * Unified Location Types
 * Canonical types for location data across the app
 */

/**
 * Selected location from Mapbox autocomplete or manual entry
 */
export interface LocationData {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
  placeName?: string;
  city?: string;
  state?: string;
  country?: string;
  phoneNumber?: string; // Contact number for this location
  whatsappNotifications?: boolean; // Enable WhatsApp notifications for this location
  apartmentBuilding?: string; // Apartment/Building number
  street?: string; // Street name/address (can use Mapbox autocomplete)
  landmark?: string; // Nearby landmark for easier finding
  deliveryInstructions?: string; // Special instructions for finding the location
  shouldCallForInstructions?: boolean; // Should driver call if location is hard to reach/not found
}

/**
 * Re-export SelectedLocation from mapbox for compatibility
 */
export type { SelectedLocation } from "../lib/mapbox";



