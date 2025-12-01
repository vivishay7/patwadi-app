/**
 * Database Types
 * Matches Supabase table schemas
 */

export type UserRole = "customer" | "driver";

/**
 * Profile table row
 */
export interface Profile {
  id: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at?: string;
}

/**
 * Profile insert payload
 */
export interface ProfileInsert {
  id: string;
  phone?: string;
  role: UserRole;
}

/**
 * Profile update payload
 */
export interface ProfileUpdate {
  phone?: string;
  role?: UserRole;
}

/**
 * Driver KYC data
 */
export interface DriverKyc {
  id?: string;
  user_id: string;
  aadhaar_number?: string;
  license_number?: string;
  photo_url?: string;
  status: "pending" | "verified" | "rejected";
  created_at?: string;
}

/**
 * Driver Bus Details
 */
export interface DriverBusDetails {
  id?: string;
  user_id: string;
  operator_name?: string;
  routes?: string[];
  vehicle_number?: string;
  capacity?: number;
  created_at?: string;
}

/**
 * Order/Parcel data
 */
export interface Order {
  id: string;
  customer_id: string;
  driver_id?: string;
  pickup_location: string;
  dropoff_location: string;
  weight_kg?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  contents?: string;
  price_estimate?: number;
  status: "pending" | "accepted" | "in_transit" | "delivered" | "cancelled";
  created_at: string;
}

/**
 * Auth User (from Supabase auth)
 */
export interface AuthUser {
  id: string;
  phone?: string;
  email?: string;
  created_at?: string;
}

/**
 * App User (combined auth + profile)
 */
export interface AppUser {
  id: string;
  phone: string | null;
  role: UserRole | null;
  isNewUser: boolean;
}

