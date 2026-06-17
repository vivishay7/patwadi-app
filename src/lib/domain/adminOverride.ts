import type { CustodyEvent } from "../db/types";

/** v6 §7 — reassign if lmp_to_linehaul not yet recorded for this trip attachment. */
export function shouldExceptionNotReassign(params: {
  tripId: string;
  orderTripId?: string | null;
  events: CustodyEvent[];
}): boolean {
  if (!params.orderTripId || params.orderTripId !== params.tripId) {
    return false;
  }
  return params.events.some(
    (e) => e.from_role === "lmp" && e.to_role === "linehaul"
  );
}

export type ParcelTripOverrideAction = "reassign" | "exception";

export function classifyParcelTripOverride(params: {
  tripId: string;
  orderTripId?: string | null;
  events: CustodyEvent[];
}): ParcelTripOverrideAction {
  return shouldExceptionNotReassign(params) ? "exception" : "reassign";
}
