/**
 * Driver API Wrapper
 * Handles driver-specific operations
 */

import { supabase, isSupabaseConfigured, getSupabaseConfigError } from "../supabase";
import { DriverKyc, DriverBusDetails } from "../db/types";

/**
 * API Response type
 */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * KYC Input data
 */
export interface KycInput {
  aadhaarNumber: string;
  licenseNumber: string;
  photoUri?: string;
}

/**
 * Bus Details Input data
 */
export interface BusDetailsInput {
  operatorName: string;
  routes: string[];
  vehicleNumber: string;
  capacity: number;
}

/**
 * Save driver KYC information
 * Currently a placeholder - returns mock success
 */
export async function saveDriverKyc(
  userId: string,
  kycData: KycInput
): Promise<ApiResponse<DriverKyc>> {
  // TODO: Implement actual Supabase storage
  // For now, return mock success

  console.log("📋 Saving KYC data for user:", userId, kycData);

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock response
  const mockKyc: DriverKyc = {
    id: `kyc_${Date.now()}`,
    user_id: userId,
    aadhaar_number: kycData.aadhaarNumber,
    license_number: kycData.licenseNumber,
    photo_url: kycData.photoUri,
    status: "pending",
    created_at: new Date().toISOString(),
  };

  return { data: mockKyc, error: null };
}

/**
 * Save driver bus details
 * Currently a placeholder - returns mock success
 */
export async function saveDriverBusData(
  userId: string,
  busData: BusDetailsInput
): Promise<ApiResponse<DriverBusDetails>> {
  // TODO: Implement actual Supabase storage
  // For now, return mock success

  console.log("🚌 Saving bus data for user:", userId, busData);

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock response
  const mockBusDetails: DriverBusDetails = {
    id: `bus_${Date.now()}`,
    user_id: userId,
    operator_name: busData.operatorName,
    routes: busData.routes,
    vehicle_number: busData.vehicleNumber,
    capacity: busData.capacity,
    created_at: new Date().toISOString(),
  };

  return { data: mockBusDetails, error: null };
}

/**
 * Fetch driver KYC status
 */
export async function fetchDriverKyc(
  userId: string
): Promise<ApiResponse<DriverKyc | null>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: getSupabaseConfigError() };
  }

  try {
    const { data, error } = await supabase
      .from("driver_kyc")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { data: null, error: null };
      }
      return { data: null, error: error.message };
    }

    return { data: data as DriverKyc, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

/**
 * Fetch driver bus details
 */
export async function fetchDriverBusDetails(
  userId: string
): Promise<ApiResponse<DriverBusDetails | null>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: getSupabaseConfigError() };
  }

  try {
    const { data, error } = await supabase
      .from("driver_bus_details")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { data: null, error: null };
      }
      return { data: null, error: error.message };
    }

    return { data: data as DriverBusDetails, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

