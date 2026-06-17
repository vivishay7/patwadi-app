/**
 * Auth API Wrapper
 * Clean abstraction over Supabase auth operations
 */

import { supabase, isSupabaseConfigured, getSupabaseConfigError } from "../supabase";
import { Profile, ProfileInsert, ProfileUpdate, UserRole, AppUser } from "../db/types";

/**
 * API Response type
 */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Incorrect email or password. Please try again.",
  "Email not confirmed": "Please confirm your email before signing in.",
  "User not found": "No account found with this email or phone number.",
  "Token has expired or is invalid": "This code has expired. Please request a new one.",
  "OTP expired": "This code has expired. Please request a new one.",
  "Invalid OTP": "Incorrect verification code. Please try again.",
  "Phone number invalid": "Please enter a valid phone number.",
  "Signups not allowed for otp": "Sign in is not available for this number. Contact support.",
  "For security purposes, you can only request this once every 60 seconds":
    "Please wait a minute before requesting another code.",
};

/**
 * Map Supabase auth errors to human-readable messages.
 */
export function formatAuthError(message: string): string {
  if (AUTH_ERROR_MESSAGES[message]) {
    return AUTH_ERROR_MESSAGES[message];
  }
  for (const [key, value] of Object.entries(AUTH_ERROR_MESSAGES)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  return message;
}

export function buildAppUser(params: {
  userId: string;
  authPhone?: string | null;
  authEmail?: string | null;
  profile?: Profile | null;
  isAdmin?: boolean;
}): AppUser {
  const { userId, authPhone, authEmail, profile, isAdmin } = params;
  return {
    id: userId,
    phone: authPhone || profile?.phone || null,
    email: profile?.email || authEmail || null,
    full_name: profile?.full_name || null,
    role: profile?.role || null,
    approval_status: profile?.approval_status,
    operator_status: profile?.operator_status,
    isAdmin: !!isAdmin,
    isNewUser: !profile,
  };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
): Promise<ApiResponse<{ userId: string; sessionCreated: boolean }>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: getSupabaseConfigError() };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });

    if (error) {
      return { data: null, error: formatAuthError(error.message) };
    }
    if (!data.user) {
      return { data: null, error: "Sign up failed — no user returned" };
    }

    return {
      data: { userId: data.user.id, sessionCreated: !!data.session },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: formatAuthError(message) };
  }
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
      return { data: null, error: formatAuthError(error.message) };
    }

    return { data: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: formatAuthError(message) };
  }
}

/**
 * Send OTP to email address
 */
export async function loginWithEmailOtp(email: string): Promise<ApiResponse<boolean>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: getSupabaseConfigError() };
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      console.error("Email OTP error:", error.message);
      return { data: null, error: formatAuthError(error.message) };
    }

    return { data: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: formatAuthError(message) };
  }
}

/**
 * Request password reset email
 */
export async function resetPasswordForEmail(email: string): Promise<ApiResponse<boolean>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: getSupabaseConfigError() };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

    if (error) {
      console.error("Reset password error:", error.message);
      return { data: null, error: formatAuthError(error.message) };
    }

    return { data: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: formatAuthError(message) };
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
      return { data: null, error: formatAuthError(error.message) };
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
    return { data: null, error: formatAuthError(message) };
  }
}

/**
 * Verify email OTP code
 */
export async function verifyEmailOtp(
  email: string,
  token: string
): Promise<ApiResponse<{ userId: string; isNewUser: boolean }>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: getSupabaseConfigError() };
  }

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      console.error("Email OTP verification error:", error.message);
      return { data: null, error: formatAuthError(error.message) };
    }

    if (!data.user) {
      return { data: null, error: "No user returned after verification" };
    }

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
    return { data: null, error: formatAuthError(message) };
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
/**
 * Create user profile in Supabase
 * 
 * ⚠️ GUARDRAIL: This function should ONLY be called with authenticated user IDs.
 * Mock/temporary user IDs (starting with "temp-user-") will be rejected to prevent
 * silent failures and duplicate profile issues when real auth is implemented.
 */
export async function createProfile(
  userId: string,
  input: {
    phone?: string;
    role: UserRole;
    full_name?: string;
    email?: string;
  }
): Promise<ApiResponse<Profile>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: getSupabaseConfigError() };
  }

  if (input.role !== "customer") {
    return {
      data: null,
      error: "Operator accounts are created by Patwadi ops. Choose Customer to send parcels.",
    };
  }

  try {
    const profileData: ProfileInsert = {
      id: userId,
      phone: input.phone,
      email: input.email,
      full_name: input.full_name,
      role: input.role,
      approval_status: input.role === "customer" ? "approved" : "pending",
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
 * Delete the user's profile row and sign out. Auth user record may remain until admin purge.
 */
export async function deleteUserAccount(_userId: string): Promise<ApiResponse<boolean>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: getSupabaseConfigError() };
  }

  try {
    const { data, error } = await supabase.functions.invoke("delete-account", {
      method: "POST",
      body: {},
    });
    if (error) {
      console.error("deleteUserAccount:", error.message);
      return { data: null, error: error.message };
    }
    if (!data?.ok) {
      return { data: null, error: data?.error || "Account deletion failed" };
    }

    await supabase.auth.signOut();
    return { data: true, error: null };
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
    const adminResult = await fetchAdminProfile(session.user.id);

    return {
      data: buildAppUser({
        userId: session.user.id,
        authPhone: session.user.phone,
        authEmail: session.user.email,
        profile: profileResult.data,
        isAdmin: !!adminResult.data,
      }),
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

