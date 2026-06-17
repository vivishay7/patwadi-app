import Constants from "expo-constants";

/** E.164 digits only, no + prefix — used in wa.me URLs */
export const SUPPORT_WHATSAPP_E164 =
  (Constants.expoConfig?.extra?.supportWhatsapp as string | undefined) ||
  process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP ||
  "919876543210";

export const CUSTOMER_SUPPORT_ISSUE_TYPES = [
  "Where is my parcel?",
  "Delivery delayed",
  "Wrong address / details",
  "Request detailed shipment report",
  "Payment or refund",
  "Other",
] as const;

export const OPERATOR_SUPPORT_ISSUE_TYPES = [
  "Handoff / code issue",
  "Trip assignment question",
  "Transfer problem",
  "Parcel damaged or missing",
  "Co-conductor / conductor issue",
  "Other",
] as const;

export type CustomerSupportIssueType = (typeof CUSTOMER_SUPPORT_ISSUE_TYPES)[number];
export type OperatorSupportIssueType = (typeof OPERATOR_SUPPORT_ISSUE_TYPES)[number];
