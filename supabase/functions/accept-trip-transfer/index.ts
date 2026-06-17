// Receiver accepts a pending trip transfer within accept_by window
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsJson, handleCorsPreflight } from "../_shared/cors.ts";
import {
  applyConductorTransfer,
  computePayeeConductorId,
} from "../_shared/completeTripTransfer.ts";

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

    const body = await req.json();
    const transferRequestId: string = body.transferRequestId;
    if (!transferRequestId) {
      return corsJson({ error: "Missing transferRequestId" }, { status: 400 });
    }

    const { data: request, error: reqErr } = await supabase
      .from("linehaul_trip_transfer_requests")
      .select("*")
      .eq("id", transferRequestId)
      .single();

    if (reqErr || !request) {
      return corsJson({ error: "Transfer request not found" }, { status: 404 });
    }

    if (request.to_conductor_id !== user.id) {
      return corsJson({ error: "Only the receiving conductor can accept" }, { status: 403 });
    }

    if (request.status !== "pending_acceptance") {
      return corsJson({ error: `Transfer is not pending (status: ${request.status})` }, { status: 409 });
    }

    const now = new Date();
    const acceptBy = request.accept_by ? new Date(request.accept_by) : null;
    if (!acceptBy || now.getTime() > acceptBy.getTime()) {
      await supabase
        .from("linehaul_trip_transfer_requests")
        .update({ status: "rejected_timeout" })
        .eq("id", transferRequestId);

      return corsJson(
        {
          error: "Acceptance window expired. Contact support via WhatsApp.",
          code: "rejected_timeout",
        },
        { status: 409 }
      );
    }

    const { data: trip, error: tripErr } = await supabase
      .from("linehaul_trips")
      .select("id, scheduled_departure_at, expected_arrival_at")
      .eq("id", request.trip_id)
      .single();

    if (tripErr || !trip) {
      return corsJson({ error: "Trip not found" }, { status: 404 });
    }

    await applyConductorTransfer(supabase, {
      tripId: request.trip_id,
      fromConductorId: request.from_conductor_id,
      toConductorId: request.to_conductor_id,
      actorId: user.id,
      transferRequestId: request.id,
      riskReasons: request.risk_reasons ?? [],
    });

    const { progressPct, payeeConductorId } = computePayeeConductorId({
      fromConductorId: request.from_conductor_id,
      toConductorId: request.to_conductor_id,
      scheduledDepartureAt: trip.scheduled_departure_at,
      expectedArrivalAt: trip.expected_arrival_at,
      now,
    });

    const finalStatus =
      (request.risk_reasons?.length ?? 0) === 0 ? "accepted" : "accepted_with_flag";

    const { data: updated, error: updErr } = await supabase
      .from("linehaul_trip_transfer_requests")
      .update({
        status: finalStatus,
        accepted_at: now.toISOString(),
        trip_progress_pct_at_accept: progressPct,
        payee_conductor_id: payeeConductorId,
      })
      .eq("id", transferRequestId)
      .select("*")
      .single();

    if (updErr || !updated) {
      return corsJson({ error: updErr?.message || "Failed to finalize transfer" }, { status: 500 });
    }

    return corsJson({
      ok: true,
      request: updated,
      payeeConductorId,
      tripProgressPct: progressPct,
    });
  } catch (e) {
    return corsJson({ error: String(e) }, { status: 500 });
  }
});
