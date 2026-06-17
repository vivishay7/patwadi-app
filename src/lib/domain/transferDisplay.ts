import type { LinehaulTripTransferRequest } from "../db/types";

export function formatTransferStatusMessage(
  request: LinehaulTripTransferRequest,
  role: "sender" | "receiver"
): string {
  switch (request.status) {
    case "pending_acceptance": {
      const deadline = request.accept_by
        ? new Date(request.accept_by).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "the deadline";
      return role === "receiver"
        ? `You have been offered this trip. Accept the load by ${deadline}.`
        : `Transfer pending — waiting for the other conductor to accept by ${deadline}.`;
    }
    case "accepted":
      return "Transfer complete. The receiving conductor now has the trip and parcels.";
    case "accepted_with_flag":
      return "Transfer complete (flagged for admin review).";
    case "auto_accepted":
      return "Transfer completed automatically.";
    case "auto_accepted_with_flag":
      return "Transfer completed (flagged for admin review).";
    case "rejected_timeout":
      return "Transfer expired — acceptance window closed. Contact support via WhatsApp.";
    case "rejected":
      return "Transfer was rejected.";
    default:
      return request.status;
  }
}

export function transferPayeeSummary(request: LinehaulTripTransferRequest): string | null {
  if (!request.payee_conductor_id || request.trip_progress_pct_at_accept == null) {
    return null;
  }
  const pct = request.trip_progress_pct_at_accept;
  if (pct >= 50) {
    return `Trip was ${pct}% complete at accept — original conductor retains pay.`;
  }
  return `Trip was ${pct}% complete at accept — receiving conductor is payee.`;
}
