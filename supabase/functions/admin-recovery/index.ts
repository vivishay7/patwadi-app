// v6 §13.5 — admin recovery workflow (reassign, in_progress, unrecoverable)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsJson, handleCorsPreflight } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

function getRequired(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function requireAdmin(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  return !!data;
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
    if (!(await requireAdmin(supabase, user.id))) {
      return corsJson({ error: "Forbidden: admin only" }, { status: 403 });
    }

    const rateLimit = await checkRateLimit(
      supabase,
      `admin-recovery:admin:${user.id}`,
      30,
      60 * 60 * 1000
    );
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSec);

    const body = await req.json();
    const action: string = body.action;
    const parcelId: string = body.parcelId;
    if (!parcelId) {
      return corsJson({ error: "Missing parcelId" }, { status: 400 });
    }

    const { data: recovery, error: recErr } = await supabase
      .from("parcel_recoveries")
      .select("*")
      .eq("parcel_id", parcelId)
      .in("status", ["open", "in_progress"])
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recErr) {
      return corsJson({ error: recErr.message }, { status: 500 });
    }
    if (!recovery) {
      return corsJson({ error: "No active recovery for parcel" }, { status: 404 });
    }

    if (action === "reassign_to_trip") {
      const newTripId: string = body.newTripId;
      if (!newTripId) {
        return corsJson({ error: "Missing newTripId" }, { status: 400 });
      }

      const { data: trip, error: tripErr } = await supabase
        .from("linehaul_trips")
        .select("id, status")
        .eq("id", newTripId)
        .single();
      if (tripErr || !trip) {
        return corsJson({ error: "Recovery trip not found" }, { status: 404 });
      }
      if (trip.status === "cancelled" || trip.status === "completed") {
        return corsJson({ error: "Cannot attach to cancelled/completed trip" }, { status: 409 });
      }

      await supabase
        .from("parcel_recoveries")
        .update({
          recovered_by_trip_id: newTripId,
          status: "in_progress",
        })
        .eq("id", recovery.id);

      await supabase
        .from("orders")
        .update({
          trip_id: newTripId,
          recovered_by_trip_id: newTripId,
          blocked_exception: true,
        })
        .eq("id", parcelId);

      await supabase.from("trip_audit_logs").insert({
        trip_id: newTripId,
        actor_id: user.id,
        action: "recovery_reassigned",
        after_value: { parcel_id: parcelId, recovery_id: recovery.id, new_trip_id: newTripId },
        near_departure: false,
      });

      const { data: updated } = await supabase
        .from("parcel_recoveries")
        .select("*")
        .eq("id", recovery.id)
        .single();

      return corsJson({ ok: true, recovery: updated });
    }

    if (action === "mark_in_progress") {
      await supabase
        .from("parcel_recoveries")
        .update({ status: "in_progress" })
        .eq("id", recovery.id);
      await supabase.from("orders").update({ blocked_exception: true }).eq("id", parcelId);
      const { data: updated } = await supabase
        .from("parcel_recoveries")
        .select("*")
        .eq("id", recovery.id)
        .single();
      return corsJson({ ok: true, recovery: updated });
    }

    if (action === "mark_unrecoverable") {
      const notes: string | undefined = body.resolutionNotes;
      const now = new Date().toISOString();
      await supabase
        .from("parcel_recoveries")
        .update({
          status: "unrecoverable",
          resolved_at: now,
          resolved_by: user.id,
          resolution_notes: notes ?? null,
        })
        .eq("id", recovery.id);
      await supabase.from("orders").update({ blocked_exception: true }).eq("id", parcelId);

      await supabase.from("trip_audit_logs").insert({
        trip_id: recovery.recovery_of_trip_id,
        actor_id: user.id,
        action: "recovery_unrecoverable",
        after_value: { parcel_id: parcelId, recovery_id: recovery.id },
        near_departure: false,
      });

      const { data: updated } = await supabase
        .from("parcel_recoveries")
        .select("*")
        .eq("id", recovery.id)
        .single();
      return corsJson({ ok: true, recovery: updated });
    }

    return corsJson({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return corsJson({ error: String(e) }, { status: 500 });
  }
});
