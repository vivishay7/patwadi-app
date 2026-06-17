// v6 §6 — transfer conductor with hard block + risk flags
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorridorOrigin } from "../_shared/corridorOrigins.ts";
import { evaluateTransferRiskFlags } from "../_shared/transferRiskFlags.ts";
import { computeNotPhysicallyTraveling } from "../_shared/notPhysicallyTraveling.ts";
import { TRANSFER_RISK_CONFIG } from "../_shared/transferConfig.ts";
import { computeTransferAcceptBy } from "../_shared/completeTripTransfer.ts";
import { corsJson, handleCorsPreflight } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

function getRequired(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const supabaseUrl = getRequired("SUPABASE_URL");
    const serviceRoleKey = getRequired("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const authed = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const {
      data: { user },
      error: userError,
    } = await authed.auth.getUser();
    if (userError || !user) {
      return corsJson({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(
      supabase,
      `request-trip-transfer:user:${user.id}`,
      10,
      60 * 60 * 1000
    );
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSec);

    const body = await req.json();
    const tripId: string = body.tripId;
    const toConductorId: string = body.toConductorId;
    const fromLocation = body.fromLocation as { lat: number; lng: number } | null | undefined;
    const toLocation = body.toLocation as { lat: number; lng: number } | null | undefined;
    const toLocationReadFailed = Boolean(body.toLocationReadFailed);
    const reason: string | undefined = body.reason;

    if (!tripId || !toConductorId) {
      return corsJson({ error: "Missing tripId/toConductorId" }, { status: 400 });
    }

    const { data: trip, error: tripErr } = await supabase
      .from("linehaul_trips")
      .select("id, corridor_id, scheduled_departure_at, expected_arrival_at, status, created_by_conductor_id")
      .eq("id", tripId)
      .single();
    if (tripErr || !trip) {
      return corsJson({ error: "Trip not found" }, { status: 404 });
    }

    const { data: fromPrimary } = await supabase
      .from("linehaul_trip_conductors")
      .select("conductor_id")
      .eq("trip_id", tripId)
      .eq("role", "primary")
      .is("active_until", null)
      .maybeSingle();

    const fromConductorId = fromPrimary?.conductor_id ?? trip.created_by_conductor_id;
    if (user.id !== fromConductorId && user.id !== trip.created_by_conductor_id) {
      return corsJson({ error: "Only the current primary conductor can transfer" }, { status: 403 });
    }

    const { data: pendingExisting } = await supabase
      .from("linehaul_trip_transfer_requests")
      .select("id")
      .eq("trip_id", tripId)
      .eq("status", "pending_acceptance")
      .maybeSingle();

    if (pendingExisting) {
      return corsJson(
        { error: "This trip already has a pending transfer awaiting acceptance" },
        { status: 409 }
      );
    }

    const { data: targetEligible } = await supabase.rpc("is_conductor_approved_and_available", {
      p_conductor_id: toConductorId,
    });

    if (!targetEligible) {
      const { data: rejected, error: rejErr } = await supabase
        .from("linehaul_trip_transfer_requests")
        .insert({
          trip_id: tripId,
          from_conductor_id: fromConductorId,
          to_conductor_id: toConductorId,
          reason: reason ?? null,
          from_location_lat: fromLocation?.lat ?? null,
          from_location_lng: fromLocation?.lng ?? null,
          to_location_lat: toLocation?.lat ?? null,
          to_location_lng: toLocation?.lng ?? null,
          risk_reasons: [],
          admin_review_required: false,
          status: "rejected",
          not_physically_traveling: false,
        })
        .select("*")
        .single();
      if (rejErr) {
        return corsJson({ error: rejErr.message }, { status: 500 });
      }
      return corsJson({
        error: "Cannot transfer to this operator",
        request: rejected,
      }, { status: 403 });
    }

    const corridorOrigin = await getCorridorOrigin(supabase, trip.corridor_id);
    if (!corridorOrigin) {
      return corsJson({ error: `Unknown corridor_id: ${trip.corridor_id}` }, { status: 400 });
    }

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - TRANSFER_RISK_CONFIG.repeatedTransferWindowDays);
    const { count: priorCount } = await supabase
      .from("linehaul_trip_transfer_requests")
      .select("id", { count: "exact", head: true })
      .eq("from_conductor_id", fromConductorId)
      .gte("requested_at", windowStart.toISOString());

    const requestedAt = new Date();
    const notPhysicallyTraveling = await computeNotPhysicallyTraveling(
      supabase,
      tripId,
      fromConductorId,
      requestedAt
    );

    const risk = evaluateTransferRiskFlags({
      corridorOrigin,
      scheduledDepartureAt: trip.scheduled_departure_at,
      fromLocation: fromLocation ?? null,
      toLocation: toLocation ?? null,
      toLocationReadFailed,
      priorTransferCount30d: priorCount ?? 0,
      notPhysicallyTraveling,
      now: requestedAt,
    });

    const transferStatus = "pending_acceptance";
    const acceptBy = computeTransferAcceptBy({
      tripStatus: trip.status,
      scheduledDepartureAt: trip.scheduled_departure_at,
      now: requestedAt,
    });

    const { data: request, error: reqErr } = await supabase
      .from("linehaul_trip_transfer_requests")
      .insert({
        trip_id: tripId,
        from_conductor_id: fromConductorId,
        to_conductor_id: toConductorId,
        reason: reason ?? null,
        from_location_lat: fromLocation?.lat ?? null,
        from_location_lng: fromLocation?.lng ?? null,
        to_location_lat: toLocation?.lat ?? null,
        to_location_lng: toLocation?.lng ?? null,
        risk_reasons: risk.risk_reasons,
        admin_review_required: risk.admin_review_required,
        status: transferStatus,
        accept_by: acceptBy.toISOString(),
        not_physically_traveling: risk.not_physically_traveling,
      })
      .select("*")
      .single();
    if (reqErr || !request) {
      return corsJson({ error: reqErr?.message || "Insert failed" }, { status: 500 });
    }

    const departureMs = new Date(trip.scheduled_departure_at).getTime();
    const nearDeparture = Date.now() >= departureMs - 60 * 60 * 1000;

    await supabase.from("trip_audit_logs").insert({
      trip_id: tripId,
      actor_id: user.id,
      action: "transfer_requested",
      before_value: { from_conductor_id: fromConductorId },
      after_value: {
        to_conductor_id: toConductorId,
        transfer_request_id: request.id,
        accept_by: acceptBy.toISOString(),
        risk_reasons: risk.risk_reasons,
      },
      near_departure: nearDeparture,
    });

    return corsJson({ ok: true, request, acceptBy: acceptBy.toISOString() });
  } catch (e) {
    return corsJson({ error: String(e) }, { status: 500 });
  }
});
