import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { supabase, validateSupabase } from "../lib/supabase";
import { fetchProfile, signOut as apiSignOut } from "../lib/api/auth";
import { AppUser, UserRole } from "../lib/db/types";

/**
 * Auth Context State
 */
interface AuthContextType {
  /** Current authenticated user (null if guest) */
  user: AppUser | null;
  /** Loading state during initialization */
  loading: boolean;
  /** Whether Supabase is properly configured */
  isConfigured: boolean;
  /** Configuration error message */
  configError: string | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether user is a guest (not logged in) */
  isGuest: boolean;
  /** Sign out the current user */
  signOut: () => Promise<void>;
  /** Refresh user data from profile */
  refreshUser: () => Promise<void>;
  /** Set user after successful auth */
  setUser: (user: AppUser | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Validate Supabase config on mount
  useEffect(() => {
    const validation = validateSupabase();
    setIsConfigured(validation.valid);
    setConfigError(validation.error);
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const profileResult = await fetchProfile(session.user.id);

          setUser({
            id: session.user.id,
            phone: session.user.phone || null,
            role: profileResult.data?.role || null,
            isNewUser: !profileResult.data,
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event);

        if (event === "SIGNED_IN" && session?.user) {
          const profileResult = await fetchProfile(session.user.id);

          setUser({
            id: session.user.id,
            phone: session.user.phone || null,
            role: profileResult.data?.role || null,
            isNewUser: !profileResult.data,
          });
        } else if (event === "SIGNED_OUT") {
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  // Sign out handler
  const handleSignOut = useCallback(async () => {
    setLoading(true);
    try {
      await apiSignOut();
      setUser(null);
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (!user?.id) return;

    try {
      const profileResult = await fetchProfile(user.id);
      
      if (profileResult.data) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                role: profileResult.data!.role,
                isNewUser: false,
              }
            : null
        );
      }
    } catch (error) {
      console.error("Refresh user error:", error);
    }
  }, [user?.id]);

  const value: AuthContextType = {
    user,
    loading,
    isConfigured,
    configError,
    isAuthenticated: !!user && !user.isNewUser,
    isGuest: !user,
    signOut: handleSignOut,
    refreshUser,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;

