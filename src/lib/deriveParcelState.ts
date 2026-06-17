import { CustodyEvent, SimplifiedParcelState } from "./db/types";

export type HandoffStep =
  | "customer_to_lmp"
  | "lmp_to_linehaul"
  | "linehaul_to_lmp"
  | "lmp_to_customer";

export function deriveParcelState(params: {
  events: CustodyEvent[];
  blockedException?: boolean;
}): SimplifiedParcelState {
  const { events, blockedException } = params;
  if (blockedException) return "blocked_exception";

  if (!events.length) return "created";

  const has = (fromRole: string, toRole: string) =>
    events.some((e) => e.from_role === fromRole && e.to_role === toRole);

  if (has("lmp", "customer") || has("linehaul", "customer")) return "delivered";
  if (has("linehaul", "lmp")) return "out_for_delivery";
  if (has("lmp", "linehaul")) return "in_transit";
  if (has("customer", "lmp")) return "pickup_confirmed";

  return "created";
}

/** Next handoff step the current user can confirm as custody holder (sender), if any. */
export function getOperatorConfirmHandoffStep(params: {
  events: CustodyEvent[];
  userId: string;
  order: {
    customer_id?: string | null;
    lmp_pickup_id?: string | null;
    linehaul_id?: string | null;
    lmp_delivery_id?: string | null;
  };
}): HandoffStep | null {
  const { events, userId, order } = params;
  const has = (fromRole: string, toRole: string) =>
    events.some((e) => e.from_role === fromRole && e.to_role === toRole);

  if (!has("customer", "lmp") && userId === order.customer_id) {
    return "customer_to_lmp";
  }
  if (has("customer", "lmp") && !has("lmp", "linehaul") && userId === order.lmp_pickup_id) {
    return "lmp_to_linehaul";
  }
  if (has("lmp", "linehaul") && !has("linehaul", "lmp") && userId === order.linehaul_id) {
    return "linehaul_to_lmp";
  }
  if (
    has("linehaul", "lmp") &&
    !has("lmp", "customer") &&
    !has("linehaul", "customer") &&
    userId === order.lmp_delivery_id
  ) {
    return "lmp_to_customer";
  }
  return null;
}

