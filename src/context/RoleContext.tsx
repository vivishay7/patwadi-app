/**
 * RoleContext
 * Backward compatibility wrapper around ProfileContext
 * 
 * This file maintains the existing API for components that use useRole()
 * while delegating to ProfileContext for actual state management.
 */

import React, { createContext, useContext, ReactNode } from "react";
import { useProfile } from "./ProfileContext";
import { UserRole } from "../lib/db/types";

// ============================================
// TYPES (backward compatible)
// ============================================

interface RoleContextType {
  role: UserRole | null;
  setRole: (role: UserRole) => void;
  canSwitchRole: boolean;
  isAuthenticatedRole: boolean;
}

// ============================================
// CONTEXT
// ============================================

const RoleContext = createContext<RoleContextType | null>(null);

// ============================================
// PROVIDER
// ============================================

interface RoleProviderProps {
  children: ReactNode;
}

export function RoleProvider({ children }: RoleProviderProps) {
  const { role, updateRole, canSwitchRole, profile } = useProfile();

  const setRole = (newRole: UserRole) => {
    if (canSwitchRole) {
      updateRole(newRole);
    } else {
      console.warn("Cannot switch role for authenticated users");
    }
  };

  const value: RoleContextType = {
    role: role || "customer", // Default to customer for guests
    setRole,
    canSwitchRole,
    isAuthenticatedRole: !!profile?.role,
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}

// ============================================
// HOOKS
// ============================================

export function useRole(): RoleContextType {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}

/**
 * Hook to get current user's role
 * Alias for useRole().role
 */
export function useUserRole(): UserRole {
  const { role } = useRole();
  return role || "customer";
}

export default RoleContext;
