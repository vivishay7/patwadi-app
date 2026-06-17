import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/** If trip is this far complete at accept, original conductor keeps pay. */
export const TRANSFER_PAY_RETAIN_PROGRESS_PCT = 50;

export function computeTransferAcceptBy(params: {
  tripStatus: string;
  scheduledDepartureAt: string;
  now?: Date;
}): Date {
  const now = params.now ?? new Date();
  const departure = new Date(params.scheduledDepartureAt);

  if (params.tripStatus === "closed") {
    return new Date(now.getTime() + 10 * 60 * 1000);
  }
  return departure;
}

export function computePayeeConductorId(params: {
  fromConductorId: string;
  toConductorId: string;
  scheduledDepartureAt: string;
  expectedArrivalAt: string;
  now?: Date;
}): { progressPct: number; payeeConductorId: string } {
  const now = params.now ?? new Date();
  const start = new Date(params.scheduledDepartureAt).getTime();
  const end = new Date(params.expectedArrivalAt).getTime();
  let progressPct = 0;
  if (now.getTime() > start && end > start) {
    progressPct = Math.min(
      100,
      Math.max(0, ((now.getTime() - start) / (end - start)) * 100)
    );
  } else if (now.getTime() >= end) {
    progressPct = 100;
  }

  const payeeConductorId =
    progressPct >= TRANSFER_PAY_RETAIN_PROGRESS_PCT
      ? params.fromConductorId
      : params.toConductorId;

  return { progressPct: Math.round(progressPct * 100) / 100, payeeConductorId };
}

export async function applyConductorTransfer(
  supabase: SupabaseClient,
  params: {
    tripId: string;
    fromConductorId: string;
    toConductorId: string;
    actorId: string;
    transferRequestId: string;
    riskReasons: string[];
  }
): Promise<void> {
  const { tripId, fromConductorId, toConductorId, actorId, transferRequestId, riskReasons } =
    params;

  await supabase
    .from("linehaul_trip_conductors")
    .update({ active_until: new Date().toISOString() })
    .eq("trip_id", tripId)
    .eq("conductor_id", fromConductorId)
    .eq("role", "primary")
    .is("active_until", null);

  const { data: existingTo } = await supabase
    .from("linehaul_trip_conductors")
    .select("id")
    .eq("trip_id", tripId)
    .eq("conductor_id", toConductorId)
    .is("active_until", null)
    .maybeSingle();

  if (!existingTo) {
    await supabase.from("linehaul_trip_conductors").insert({
      trip_id: tripId,
      conductor_id: toConductorId,
      role: "primary",
      added_by: actorId,
      active_from: new Date().toISOString(),
    });
  } else {
    await supabase
      .from("linehaul_trip_conductors")
      .update({ role: "primary", active_from: new Date().toISOString() })
      .eq("id", existingTo.id);
  }

  await supabase
    .from("orders")
    .update({ linehaul_id: toConductorId, updated_at: new Date().toISOString() })
    .eq("trip_id", tripId);

  const { data: trip } = await supabase
    .from("linehaul_trips")
    .select("scheduled_departure_at")
    .eq("id", tripId)
    .single();

  const departureMs = trip
    ? new Date(trip.scheduled_departure_at).getTime()
    : Date.now();
  const nearDeparture = Date.now() >= departureMs - 60 * 60 * 1000;

  await supabase.from("trip_audit_logs").insert({
    trip_id: tripId,
    actor_id: actorId,
    action: "conductor_transferred",
    before_value: { from_conductor_id: fromConductorId },
    after_value: {
      to_conductor_id: toConductorId,
      transfer_request_id: transferRequestId,
      risk_reasons: riskReasons,
    },
    near_departure: nearDeparture,
  });
}
