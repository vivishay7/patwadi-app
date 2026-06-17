import type { RecoveryStatus } from "../db/types";

/** v6 §13.4 — customer blocked while recovery is open or in_progress. */
export function recoveryBlocksCustomer(status: RecoveryStatus): boolean {
  return status === "open" || status === "in_progress";
}

/** v6 §13.5 — custody on recovered_by_trip_id can resolve an active recovery. */
export function shouldResolveRecoveryOnCustodyEvent(params: {
  recoveredByTripId?: string | null;
  orderTripId?: string | null;
  recoveryStatus?: RecoveryStatus | null;
}): boolean {
  if (!params.recoveredByTripId || !params.orderTripId) return false;
  if (params.orderTripId !== params.recoveredByTripId) return false;
  if (!params.recoveryStatus) return false;
  return recoveryBlocksCustomer(params.recoveryStatus);
}
