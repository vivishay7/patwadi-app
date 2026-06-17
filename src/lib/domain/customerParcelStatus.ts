import { CustodyEvent, SimplifiedParcelState } from "../db/types";
import { deriveParcelState } from "../deriveParcelState";
import colors from "../../theme/colors";

/** v6 §9 — Tier-1 customer labels from SimplifiedParcelState */
export const CUSTOMER_STATUS_LABELS: Record<SimplifiedParcelState, string> = {
  created: "Booked",
  pickup_confirmed: "Picked up",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  blocked_exception: "Delivery exception — our team is resolving it",
};

export const TRACKER_STAGE_ORDER: SimplifiedParcelState[] = [
  "created",
  "pickup_confirmed",
  "in_transit",
  "out_for_delivery",
  "delivered",
];

export function getCustomerStatusLabel(state: SimplifiedParcelState): string {
  return CUSTOMER_STATUS_LABELS[state];
}

export function getCustomerStatusColor(state: SimplifiedParcelState): string {
  switch (state) {
    case "delivered":
      return colors.success;
    case "blocked_exception":
      return colors.error;
    case "created":
      return colors.warning;
    case "pickup_confirmed":
      return colors.info;
    default:
      return colors.primary;
  }
}

export function formatStatusDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function deriveCustomerParcelStatus(params: {
  events: CustodyEvent[];
  blockedException?: boolean;
  orderCreatedAt?: string;
}): {
  state: SimplifiedParcelState;
  label: string;
  lastUpdatedAt: string | null;
  stageDates: Partial<Record<SimplifiedParcelState, string>>;
} {
  const state = deriveParcelState({
    events: params.events,
    blockedException: params.blockedException,
  });
  const stageDates = buildStageDates(params.events, params.orderCreatedAt);
  const lastEvent = params.events.length
    ? params.events[params.events.length - 1]
    : null;

  return {
    state,
    label: getCustomerStatusLabel(state),
    lastUpdatedAt: lastEvent?.created_at ?? params.orderCreatedAt ?? null,
    stageDates,
  };
}

function hasEvent(events: CustodyEvent[], from: string, to: string): CustodyEvent | undefined {
  return events.find((e) => e.from_role === from && e.to_role === to);
}

function buildStageDates(
  events: CustodyEvent[],
  orderCreatedAt?: string
): Partial<Record<SimplifiedParcelState, string>> {
  const dates: Partial<Record<SimplifiedParcelState, string>> = {};
  if (orderCreatedAt) {
    dates.created = orderCreatedAt;
  }
  const pickup = hasEvent(events, "customer", "lmp");
  if (pickup) dates.pickup_confirmed = pickup.created_at;
  const transit = hasEvent(events, "lmp", "linehaul");
  if (transit) dates.in_transit = transit.created_at;
  const outForDelivery = hasEvent(events, "linehaul", "lmp");
  if (outForDelivery) dates.out_for_delivery = outForDelivery.created_at;
  const delivered =
    hasEvent(events, "lmp", "customer") ?? hasEvent(events, "linehaul", "customer");
  if (delivered) dates.delivered = delivered.created_at;
  return dates;
}

export function getDeliveryProofPath(events: CustodyEvent[]): string | null {
  const delivered =
    hasEvent(events, "lmp", "customer") ?? hasEvent(events, "linehaul", "customer");
  if (!delivered || delivered.proof_type !== "photo") return null;
  return delivered.proof_value || null;
}

export function trackerStageIndex(state: SimplifiedParcelState): number {
  if (state === "blocked_exception") return -1;
  return TRACKER_STAGE_ORDER.indexOf(state);
}
