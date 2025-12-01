import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

/**
 * Supabase Configuration
 */
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string | undefined;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as string | undefined;

/**
 * Validation state
 */
let isConfigValid = false;
let configError: string | null = null;

/**
 * Validate Supabase configuration
 * Call this on app start to check if Supabase is properly configured
 */
export function validateSupabase(): { valid: boolean; error: string | null } {
  if (!supabaseUrl) {
    configError = "Missing EXPO_PUBLIC_SUPABASE_URL in environment";
    console.error("❌ Supabase Error:", configError);
    isConfigValid = false;
    return { valid: false, error: configError };
  }

  if (!supabaseUrl.startsWith("https://")) {
    configError = "Invalid Supabase URL format (must start with https://)";
    console.error("❌ Supabase Error:", configError);
    isConfigValid = false;
    return { valid: false, error: configError };
  }

  if (!supabaseAnonKey) {
    configError = "Missing EXPO_PUBLIC_SUPABASE_ANON in environment";
    console.error("❌ Supabase Error:", configError);
    isConfigValid = false;
    return { valid: false, error: configError };
  }

  if (!supabaseAnonKey.startsWith("eyJ")) {
    configError = "Invalid Supabase Anon Key format";
    console.error("❌ Supabase Error:", configError);
    isConfigValid = false;
    return { valid: false, error: configError };
  }

  isConfigValid = true;
  configError = null;
  console.log("✅ Supabase configured successfully");
  return { valid: true, error: null };
}

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return isConfigValid;
}

/**
 * Get configuration error message
 */
export function getSupabaseConfigError(): string | null {
  return configError;
}

/**
 * Create Supabase client
 * Falls back to placeholder values if not configured (will fail on actual calls)
 */
const createSupabaseClient = (): SupabaseClient => {
  const url = supabaseUrl || "https://placeholder.supabase.co";
  const key = supabaseAnonKey || "placeholder-key";

  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
};

export const supabase = createSupabaseClient();

// Validate on module load
validateSupabase();

export default supabase;
