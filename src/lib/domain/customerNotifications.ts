import { CustodyEvent, Order } from "../db/types";
import {
  CUSTOMER_STATUS_LABELS,
  formatStatusDate,
  SimplifiedParcelState,
} from "./customerParcelStatus";

export interface CustomerNotificationItem {
  id: string;
  orderId: string;
  title: string;
  sortAt: string;
}

function labelForHandoff(fromRole: string, toRole: string): string {
  const key = `${fromRole}->${toRole}`;
  const map: Record<string, SimplifiedParcelState> = {
    "customer->lmp": "pickup_confirmed",
    "lmp->linehaul": "in_transit",
    "linehaul->lmp": "out_for_delivery",
    "lmp->customer": "delivered",
    "linehaul->customer": "delivered",
  };
  const state = map[key];
  return state ? CUSTOMER_STATUS_LABELS[state] : "Status update";
}

export function buildCustomerNotificationFeed(
  orders: Order[],
  eventsByOrder: Record<string, CustodyEvent[]>
): CustomerNotificationItem[] {
  const items: CustomerNotificationItem[] = [];

  for (const order of orders) {
    const events = eventsByOrder[order.id] ?? [];
    const shortId = order.id.slice(0, 8);

    if (!events.length) {
      items.push({
        id: `${order.id}-booked`,
        orderId: order.id,
        title: `Order #${shortId} — ${CUSTOMER_STATUS_LABELS.created} — ${formatStatusDate(order.created_at)}`,
        sortAt: order.created_at,
      });
      continue;
    }

    for (const event of events) {
      const label = labelForHandoff(event.from_role, event.to_role);
      items.push({
        id: event.id,
        orderId: order.id,
        title: `Order #${shortId} — ${label} — ${formatStatusDate(event.created_at)}`,
        sortAt: event.created_at,
      });
    }
  }

  return items.sort(
    (a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime()
  );
}
