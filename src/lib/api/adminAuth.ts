import { supabase, isSupabaseConfigured, getSupabaseConfigError } from "../supabase";
import { AdminProfile } from "../db/types";
import { formatAuthError } from "./auth";

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export async function adminSignInWithPassword(
  email: string,
  password: string
): Promise<ApiResponse<boolean>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: getSupabaseConfigError() };
  }

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { data: null, error: formatAuthError(error.message) };
    return { data: true, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { data: null, error: msg };
  }
}

export async function fetchAdminProfile(userId: string): Promise<ApiResponse<AdminProfile>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: getSupabaseConfigError() };
  }
  try {
    const { data, error } = await supabase
      .from("admin_profiles")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .single();

    if (error) {
      if ((error as any).code === "PGRST116") return { data: null, error: null };
      return { data: null, error: error.message };
    }
    return { data: data as AdminProfile, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { data: null, error: msg };
  }
}

