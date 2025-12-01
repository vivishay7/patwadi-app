import { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { UserRole } from "../lib/db/types";

interface RoleContextType {
  /** Current active role */
  role: UserRole;
  /** Set role (only works for guests) */
  setRole: (role: UserRole) => void;
  /** Whether role switching is allowed */
  canSwitchRole: boolean;
  /** Whether current role is from authenticated user */
  isAuthenticatedRole: boolean;
}

const RoleContext = createContext<RoleContextType | null>(null);

interface RoleProviderProps {
  children: ReactNode;
}

export function RoleProvider({ children }: RoleProviderProps) {
  const { user, isGuest, isAuthenticated } = useAuth();
  
  // Local role state for guests
  const [guestRole, setGuestRole] = useState<UserRole>("customer");

  // Determine the active role
  const role: UserRole = user?.role || guestRole;
  
  // Role switching is only allowed for guests
  const canSwitchRole = isGuest;
  const isAuthenticatedRole = isAuthenticated && !!user?.role;

  // Sync with auth user role when it changes
  useEffect(() => {
    if (user?.role) {
      // User is logged in with a role, we don't change guestRole
      // but the displayed role will be user.role
    }
  }, [user?.role]);

  const setRole = (newRole: UserRole) => {
    if (canSwitchRole) {
      setGuestRole(newRole);
    } else {
      console.warn("Cannot switch role for authenticated users");
    }
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        canSwitchRole,
        isAuthenticatedRole,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
};

/**
 * Hook to get current user's role
 * Alias for useRole().role
 */
export const useUserRole = (): UserRole => {
  const { role } = useRole();
  return role;
};

export default RoleContext;
