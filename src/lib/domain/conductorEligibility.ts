import type { Profile } from "../db/types";

export type ConductorEligibilityResult =
  | { eligible: true }
  | {
      eligible: false;
      reason: "not_approved" | "not_active" | "not_available" | "wrong_role";
    };

/** v6 §5 / §6.1 / §20 — approved active linehaul operator who is currently available. */
export function checkConductorEligibility(
  profile: Pick<Profile, "role" | "approval_status" | "operator_status" | "is_available">
): ConductorEligibilityResult {
  if (profile.role !== "linehaul") {
    return { eligible: false, reason: "wrong_role" };
  }
  if (profile.approval_status !== "approved") {
    return { eligible: false, reason: "not_approved" };
  }
  if (profile.operator_status !== "active") {
    return { eligible: false, reason: "not_active" };
  }
  if (profile.is_available === false) {
    return { eligible: false, reason: "not_available" };
  }
  return { eligible: true };
}
