/**
 * AuthContext
 * Manages authentication state and provides auth methods
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { 
  supabase, 
  isSupabaseConfigured, 
  getSupabaseConfigError,
  validateSupabaseConfig,
} from "../lib/supabaseClient";

// ============================================
// TYPES
// ============================================

interface AuthContextType {
  // State
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  configError: string | null;
  
  // Computed
  isAuthenticated: boolean;
  isGuest: boolean;
  
  // Methods
  signInWithOtp: (phone: string) => Promise<{ success: boolean; error: string | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ success: boolean; error: string | null; isNewUser: boolean }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

// ============================================
// CONTEXT
// ============================================

const AuthContext = createContext<AuthContextType | null>(null);

// ============================================
// PROVIDER
// ============================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Initialize and validate config
  useEffect(() => {
    const validation = validateSupabaseConfig();
    setIsConfigured(validation.valid);
    setConfigError(validation.error);
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        setSession(initialSession);
        setUser(initialSession?.user || null);
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("🔐 Auth state changed:", event);
        
        setSession(currentSession);
        setUser(currentSession?.user || null);
        
        if (event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  // Sign in with OTP
  const signInWithOtp = useCallback(async (phone: string): Promise<{ success: boolean; error: string | null }> => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: getSupabaseConfigError() };
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });

      if (error) {
        console.error("OTP send error:", error.message);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send OTP";
      return { success: false, error: message };
    }
  }, []);

  // Verify OTP
  const verifyOtp = useCallback(async (
    phone: string, 
    token: string
  ): Promise<{ success: boolean; error: string | null; isNewUser: boolean }> => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: getSupabaseConfigError(), isNewUser: false };
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: "sms",
      });

      if (error) {
        console.error("OTP verify error:", error.message);
        return { success: false, error: error.message, isNewUser: false };
      }

      if (!data.user) {
        return { success: false, error: "No user returned", isNewUser: false };
      }

      // Check if user has a profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .single();

      const isNewUser = !profile || !!profileError;

      return { success: true, error: null, isNewUser };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to verify OTP";
      return { success: false, error: message, isNewUser: false };
    }
  }, []);

  // Sign out
  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }, []);

  // Refresh session
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session: newSession } } = await supabase.auth.refreshSession();
      setSession(newSession);
      setUser(newSession?.user || null);
    } catch (error) {
      console.error("Session refresh error:", error);
    }
  }, []);

  // Context value
  const value: AuthContextType = {
    user,
    session,
    loading,
    isConfigured,
    configError,
    isAuthenticated: !!user,
    isGuest: !user,
    signInWithOtp,
    verifyOtp,
    signOut: handleSignOut,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
