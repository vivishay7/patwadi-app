/**
 * Auth API Wrapper
 * Clean abstraction over Supabase auth operations
 */

import { supabase, isSupabaseConfigured, getSupabaseConfigError } from "../supabaseClient";
import { Profile, ProfileInsert, ProfileUpdate, UserRole, AppUser } from "../db/types";

/**
 * API Response type
 */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * Send OTP to phone number
 */
export async function loginWithPhone(phone: string): Promise<ApiResponse<boolean>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: getSupabaseConfigError() };
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) {
      console.error("Login error:", error.message);
      return { data: null, error: error.message };
    }

    return { data: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

/**
 * Verify OTP code
 */
export async function verifyOtp(
  phone: string,
  token: string
): Promise<ApiResponse<{ userId: string; isNewUser: boolean }>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: getSupabaseConfigError() };
  }

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });

    if (error) {
      console.error("OTP verification error:", error.message);
      return { data: null, error: error.message };
    }

    if (!data.user) {
      return { data: null, error: "No user returned after verification" };
    }

    // Check if user has a profile (existing user)
    const profileResult = await fetchProfile(data.user.id);
    const isNewUser = !profileResult.data;

    return {
      data: {
        userId: data.user.id,
        isNewUser,
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

/**
 * Fetch user profile from profiles table
 */
export async function fetchProfile(userId: string): Promise<ApiResponse<Profile>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: getSupabaseConfigError() };
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      // Not found is not an error for our use case
      if (error.code === "PGRST116") {
        return { data: null, error: null };
      }
      console.error("Fetch profile error:", error.message);
      return { data: null, error: error.message };
    }

    return { data: data as Profile, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

/**
 * Create new user profile
 */
export async function createProfile(
  userId: string,
  phone: string,
  role: UserRole
): Promise<ApiResponse<Profile>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: getSupabaseConfigError() };
  }

  try {
    const profileData: ProfileInsert = {
      id: userId,
      phone,
      role,
    };

    const { data, error } = await supabase
      .from("profiles")
      .insert(profileData)
      .select()
      .single();

    if (error) {
      console.error("Create profile error:", error.message);
      return { data: null, error: error.message };
    }

    return { data: data as Profile, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<ApiResponse<Profile>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: getSupabaseConfigError() };
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("Update profile error:", error.message);
      return { data: null, error: error.message };
    }

    return { data: data as Profile, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<ApiResponse<boolean>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: getSupabaseConfigError() };
  }

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign out error:", error.message);
      return { data: null, error: error.message };
    }

    return { data: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

/**
 * Get current session
 */
export async function getCurrentSession(): Promise<ApiResponse<AppUser | null>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: getSupabaseConfigError() };
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error("Get session error:", error.message);
      return { data: null, error: error.message };
    }

    if (!session?.user) {
      return { data: null, error: null };
    }

    // Fetch profile
    const profileResult = await fetchProfile(session.user.id);

    return {
      data: {
        id: session.user.id,
        phone: session.user.phone || null,
        role: profileResult.data?.role || null,
        isNewUser: !profileResult.data,
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}
