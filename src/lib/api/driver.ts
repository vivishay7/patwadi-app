/**
 * Driver API Wrapper
 * Handles driver-specific operations
 */

import { supabase, isSupabaseConfigured, getSupabaseConfigError } from "../supabaseClient";
import { DriverKyc, DriverBusDetails, DriverKycInsert, DriverBusDetailsInsert } from "../db/types";

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
 */
export async function saveDriverKyc(
  userId: string,
  kycData: KycInput
): Promise<ApiResponse<DriverKyc>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: getSupabaseConfigError() };
  }

  try {
    // Check if KYC already exists
    const { data: existing } = await supabase
      .from("driver_kyc")
      .select("id")
      .eq("user_id", userId)
      .single();

    const kycPayload: DriverKycInsert = {
      user_id: userId,
      aadhaar_number: kycData.aadhaarNumber,
      license_number: kycData.licenseNumber,
      photo_url: kycData.photoUri || null,
      status: "pending",
    };

    let result;

    if (existing) {
      // Update existing
      result = await supabase
        .from("driver_kyc")
        .update({
          aadhaar_number: kycData.aadhaarNumber,
          license_number: kycData.licenseNumber,
          photo_url: kycData.photoUri || null,
          status: "pending",
        })
        .eq("user_id", userId)
        .select()
        .single();
    } else {
      // Insert new
      result = await supabase
        .from("driver_kyc")
        .insert(kycPayload)
        .select()
        .single();
    }

    if (result.error) {
      console.error("Save KYC error:", result.error.message);
      return { data: null, error: result.error.message };
    }

    return { data: result.data as DriverKyc, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

/**
 * Save driver bus details
 */
export async function saveDriverBusData(
  userId: string,
  busData: BusDetailsInput
): Promise<ApiResponse<DriverBusDetails>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: getSupabaseConfigError() };
  }

  try {
    // Check if bus details already exist
    const { data: existing } = await supabase
      .from("driver_bus_details")
      .select("id")
      .eq("user_id", userId)
      .single();

    const busPayload: DriverBusDetailsInsert = {
      user_id: userId,
      operator_name: busData.operatorName,
      routes: busData.routes,
      vehicle_number: busData.vehicleNumber,
      capacity_kg: busData.capacity,
    };

    let result;

    if (existing) {
      // Update existing
      result = await supabase
        .from("driver_bus_details")
        .update({
          operator_name: busData.operatorName,
          routes: busData.routes,
          vehicle_number: busData.vehicleNumber,
          capacity_kg: busData.capacity,
        })
        .eq("user_id", userId)
        .select()
        .single();
    } else {
      // Insert new
      result = await supabase
        .from("driver_bus_details")
        .insert(busPayload)
        .select()
        .single();
    }

    if (result.error) {
      console.error("Save bus details error:", result.error.message);
      return { data: null, error: result.error.message };
    }

    return { data: result.data as DriverBusDetails, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
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
