// v6 §5 — co-conductor addition (approved/available check, audit log, location capture)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
      `add-co-conductor:user:${user.id}`,
      10,
      60 * 60 * 1000
    );
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSec);

    const body = await req.json();
    const tripId: string = body.tripId;
    const targetConductorId: string = body.targetConductorId;
    const location = body.location as { lat: number; lng: number } | null | undefined;
    const reason: string | undefined = body.reason;

    if (!tripId || !targetConductorId) {
      return corsJson({ error: "Missing tripId/targetConductorId" }, { status: 400 });
    }

    const { data: trip, error: tripErr } = await supabase
      .from("linehaul_trips")
      .select("id, details_locked, created_by_conductor_id, status")
      .eq("id", tripId)
      .single();
    if (tripErr || !trip) {
      return corsJson({ error: "Trip not found" }, { status: 404 });
    }
    if (!trip.details_locked) {
      return corsJson(
        { error: "Co-conductor addition requires details_locked = true (T-10min)" },
        { status: 409 }
      );
    }

    const { data: actorRow } = await supabase
      .from("linehaul_trip_conductors")
      .select("id")
      .eq("trip_id", tripId)
      .eq("conductor_id", user.id)
      .is("active_until", null)
      .maybeSingle();
    if (user.id !== trip.created_by_conductor_id && !actorRow) {
      return corsJson({ error: "Only trip conductors can add a co-conductor" }, { status: 403 });
    }

    const { data: eligible } = await supabase.rpc("is_conductor_approved_and_available", {
      p_conductor_id: targetConductorId,
    });
    if (!eligible) {
      return corsJson(
        { error: "Cannot add co-conductor: target not approved or not available" },
        { status: 403 }
      );
    }

    const { data: existing } = await supabase
      .from("linehaul_trip_conductors")
      .select("id")
      .eq("trip_id", tripId)
      .eq("conductor_id", targetConductorId)
      .is("active_until", null)
      .maybeSingle();
    if (existing) {
      return corsJson({ error: "Conductor is already active on this trip" }, { status: 409 });
    }

    const { data: conductor, error: insertErr } = await supabase
      .from("linehaul_trip_conductors")
      .insert({
        trip_id: tripId,
        conductor_id: targetConductorId,
        role: "co_conductor",
        added_by: user.id,
        active_from: new Date().toISOString(),
        reason: reason ?? null,
        location_at_add_lat: location?.lat ?? null,
        location_at_add_lng: location?.lng ?? null,
      })
      .select("*")
      .single();
    if (insertErr || !conductor) {
      return corsJson({ error: insertErr?.message || "Insert failed" }, { status: 500 });
    }

    const nearDeparture = false;
    await supabase.from("trip_audit_logs").insert({
      trip_id: tripId,
      actor_id: user.id,
      action: "co_conductor_added",
      after_value: {
        conductor_id: targetConductorId,
        location_at_add_lat: location?.lat ?? null,
        location_at_add_lng: location?.lng ?? null,
      },
      near_departure: nearDeparture,
    });

    return corsJson({ ok: true, conductor });
  } catch (e) {
    return corsJson({ error: String(e) }, { status: 500 });
  }
});
