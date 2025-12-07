/**
 * Database Types
 * Matches Supabase table schemas
 */

// ============================================
// ENUMS
// ============================================

export type UserRole = "customer" | "driver";

export type KycStatus = "pending" | "verified" | "rejected";

export type OrderStatus = 
  | "pending" 
  | "accepted" 
  | "picked_up"
  | "in_transit" 
  | "delivered" 
  | "cancelled";

// ============================================
// PROFILES TABLE
// ============================================

export interface DriverLocation {
  lat: number;
  lng: number;
}

export interface Profile {
  id: string;
  phone: string | null;
  full_name: string | null;
  role: UserRole | null;
  avatar_url: string | null;
  // Driver-specific fields
  driver_available: boolean | null;
  last_location: DriverLocation | null;
  last_seen_at: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  phone?: string | null;
  full_name?: string | null;
  role?: UserRole | null;
  avatar_url?: string | null;
  driver_available?: boolean | null;
  last_location?: DriverLocation | null;
  last_seen_at?: string | null;
}

export interface ProfileUpdate {
  phone?: string | null;
  full_name?: string | null;
  role?: UserRole | null;
  avatar_url?: string | null;
  driver_available?: boolean | null;
  last_location?: DriverLocation | null;
  last_seen_at?: string | null;
}

// ============================================
// DRIVER_KYC TABLE
// ============================================

export interface DriverKyc {
  id: string;
  user_id: string;
  aadhaar_number: string | null;
  license_number: string | null;
  photo_url: string | null;
  status: KycStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface DriverKycInsert {
  user_id: string;
  aadhaar_number?: string | null;
  license_number?: string | null;
  photo_url?: string | null;
  status?: KycStatus;
}

export interface DriverKycUpdate {
  aadhaar_number?: string | null;
  license_number?: string | null;
  photo_url?: string | null;
  status?: KycStatus;
  rejection_reason?: string | null;
}

// ============================================
// DRIVER_BUS_DETAILS TABLE
// ============================================

export interface DriverBusDetails {
  id: string;
  user_id: string;
  operator_name: string | null;
  routes: string[];
  vehicle_number: string | null;
  capacity_kg: number | null;
  created_at: string;
  updated_at: string;
}

export interface DriverBusDetailsInsert {
  user_id: string;
  operator_name?: string | null;
  routes?: string[];
  vehicle_number?: string | null;
  capacity_kg?: number | null;
}

export interface DriverBusDetailsUpdate {
  operator_name?: string | null;
  routes?: string[];
  vehicle_number?: string | null;
  capacity_kg?: number | null;
}

// ============================================
// ORDERS TABLE
// ============================================

export interface OrderDimensions {
  length: number;
  width: number;
  height: number;
}

export interface Order {
  id: string;
  customer_id: string;
  driver_id: string | null;
  
  // Locations
  pickup_location: string;
  pickup_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  
  dropoff_location: string;
  dropoff_address: string | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  
  // Package details
  weight_kg: number | null;
  dimensions: OrderDimensions | null;
  contents: string | null;
  
  // Pricing
  price_estimate: number | null;
  final_price: number | null;
  
  // Status
  status: OrderStatus;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
}

export interface OrderInsert {
  customer_id: string;
  driver_id?: string | null;
  
  pickup_location: string;
  pickup_address?: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  
  dropoff_location: string;
  dropoff_address?: string | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  
  weight_kg?: number | null;
  dimensions?: OrderDimensions | null;
  contents?: string | null;
  
  price_estimate?: number | null;
  status?: OrderStatus;
}

export interface OrderUpdate {
  driver_id?: string | null;
  status?: OrderStatus;
  final_price?: number | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
}

// ============================================
// AUTH TYPES
// ============================================

export interface AuthUser {
  id: string;
  phone?: string;
  email?: string;
  created_at?: string;
}

/**
 * App User (combined auth + profile)
 * Used throughout the app
 */
export interface AppUser {
  id: string;
  phone: string | null;
  role: UserRole | null;
  isNewUser: boolean;
}

// ============================================
// SUPABASE DATABASE TYPE
// ============================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      driver_kyc: {
        Row: DriverKyc;
        Insert: DriverKycInsert;
        Update: DriverKycUpdate;
      };
      driver_bus_details: {
        Row: DriverBusDetails;
        Insert: DriverBusDetailsInsert;
        Update: DriverBusDetailsUpdate;
      };
      orders: {
        Row: Order;
        Insert: OrderInsert;
        Update: OrderUpdate;
      };
    };
  };
}
