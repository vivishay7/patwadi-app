import { AppUser } from "../db/types";
import { isProfileIdentityComplete } from "../userDisplayName";

export type PostAuthRoute =
  | "Admin"
  | "CompleteProfile"
  | "RoleSelect"
  | "Main"
  | "OperatorPending";

export function resolvePostAuthRoute(user: AppUser): PostAuthRoute {
  if (user.isAdmin) return "Admin";
  if (!isProfileIdentityComplete(user.full_name)) return "CompleteProfile";
  if (user.role === "lmp" || user.role === "linehaul") {
    if (user.approval_status === "approved" && user.operator_status === "active") {
      return "Main";
    }
    return "OperatorPending";
  }
  if (user.role === "customer") return "Main";
  if (!user.role) return "RoleSelect";
  return "Main";
}
