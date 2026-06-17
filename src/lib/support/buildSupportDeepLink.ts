import { SUPPORT_WHATSAPP_E164 } from "./supportConfig";

export interface CustomerSupportContext {
  audience: "customer";
  orderId: string;
  corridor?: string;
  stageLabel: string;
}

export interface OperatorSupportContext {
  audience: "operator";
  operatorId: string;
  tripId?: string;
  parcelId?: string;
  corridor?: string;
  stepOrState?: string;
}

export type SupportContext = CustomerSupportContext | OperatorSupportContext;

export function buildSupportDeepLink(
  context: SupportContext,
  issueType: string,
  message: string
): string {
  const lines: string[] = ["Hi Patwadi support,"];

  if (context.audience === "customer") {
    lines.push(`Order: ${context.orderId}`);
    if (context.corridor) lines.push(`Corridor: ${context.corridor}`);
    lines.push(`Status: ${context.stageLabel}`);
  } else {
    lines.push(`Operator: ${context.operatorId}`);
    if (context.tripId) lines.push(`Trip: ${context.tripId}`);
    if (context.parcelId) lines.push(`Parcel: ${context.parcelId}`);
    if (context.corridor) lines.push(`Corridor: ${context.corridor}`);
    if (context.stepOrState) lines.push(`Step/state: ${context.stepOrState}`);
  }

  lines.push(`Issue: ${issueType}`);
  if (message.trim()) {
    lines.push("");
    lines.push(message.trim());
  }

  const text = lines.join("\n");
  return `https://wa.me/${SUPPORT_WHATSAPP_E164}?text=${encodeURIComponent(text)}`;
}
