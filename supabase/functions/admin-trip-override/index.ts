// v6 §7 — admin reassign / exception overrides (parcel + trip cascade)
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

async function tripNearDeparture(
  supabase: ReturnType<typeof createClient>,
  tripId: string
): Promise<boolean> {
  const { data: trip } = await supabase
    .from("linehaul_trips")
    .select("scheduled_departure_at")
    .eq("id", tripId)
    .single();
  if (!trip) return false;
  const dep = new Date(trip.scheduled_departure_at).getTime();
  return Date.now() >= dep - 60 * 60 * 1000;
}

async function applyParcelOverride(
  supabase: ReturnType<typeof createClient>,
  params: {
    adminId: string;
    tripId: string;
    parcelId: string;
    reason: string;
  }
) {
  const { adminId, tripId, parcelId, reason } = params;

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, trip_id")
    .eq("id", parcelId)
    .single();
  if (orderErr || !order) {
    return { ok: false as const, error: "Parcel not found", status: 404 };
  }
  if (order.trip_id !== tripId) {
    return { ok: false as const, error: "Parcel is not attached to this trip", status: 409 };
  }

  const { data: isPostCustody, error: rpcErr } = await supabase.rpc(
    "parcel_has_lmp_to_linehaul_on_trip",
    { p_parcel_id: parcelId, p_trip_id: tripId }
  );
  if (rpcErr) {
    return { ok: false as const, error: rpcErr.message, status: 500 };
  }

  const nearDeparture = await tripNearDeparture(supabase, tripId);

  if (isPostCustody) {
    const { data: recovery, error: recErr } = await supabase
      .from("parcel_recoveries")
      .insert({
        parcel_id: parcelId,
        recovery_of_trip_id: tripId,
        status: "open",
        opened_by: adminId,
        reason,
      })
      .select("*")
      .single();
    if (recErr || !recovery) {
      return { ok: false as const, error: recErr?.message || "Recovery insert failed", status: 500 };
    }

    await supabase
      .from("orders")
      .update({
        blocked_exception: true,
        recovery_of_trip_id: tripId,
      })
      .eq("id", parcelId);

    await supabase.from("trip_audit_logs").insert({
      trip_id: tripId,
      actor_id: adminId,
      action: "exception_created",
      before_value: { parcel_id: parcelId, trip_id: tripId },
      after_value: { recovery_id: recovery.id, blocked_exception: true },
      near_departure: nearDeparture,
    });

    return { ok: true as const, action: "exception" as const, recovery };
  }

  await supabase.from("orders").update({ trip_id: null }).eq("id", parcelId);

  await supabase.from("trip_audit_logs").insert({
    trip_id: tripId,
    actor_id: adminId,
    action: "parcel_reassigned",
    before_value: { parcel_id: parcelId, trip_id: tripId },
    after_value: { trip_id: null },
    near_departure: nearDeparture,
  });

  return { ok: true as const, action: "reassign" as const };
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
      `admin-trip-override:admin:${user.id}`,
      30,
      60 * 60 * 1000
    );
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSec);

    const body = await req.json();
    const action: string = body.action;
    const tripId: string = body.tripId;
    const parcelId: string | undefined = body.parcelId;
    const reason: string = body.reason || "Admin override";

    if (!tripId) {
      return corsJson({ error: "Missing tripId" }, { status: 400 });
    }

    if (action === "rescind_parcel") {
      if (!parcelId) {
        return corsJson({ error: "Missing parcelId" }, { status: 400 });
      }
      const result = await applyParcelOverride(supabase, {
        adminId: user.id,
        tripId,
        parcelId,
        reason,
      });
      if (!result.ok) {
        return corsJson({ error: result.error }, { status: result.status });
      }
      return corsJson({ ok: true, ...result });
    }

    if (action === "approve_extra_trip") {
      const { data: trip, error: tripErr } = await supabase
        .from("linehaul_trips")
        .select("id, is_extra_trip, extra_trip_approved_by, status")
        .eq("id", tripId)
        .single();
      if (tripErr || !trip) {
        return corsJson({ error: "Trip not found" }, { status: 404 });
      }
      if (!trip.is_extra_trip) {
        return corsJson({ error: "Trip is not marked as extra" }, { status: 409 });
      }
      if (trip.extra_trip_approved_by) {
        return corsJson({ error: "Extra trip already approved" }, { status: 409 });
      }

      await supabase
        .from("linehaul_trips")
        .update({
          extra_trip_approved_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tripId);

      await supabase.from("trip_audit_logs").insert({
        trip_id: tripId,
        actor_id: user.id,
        action: "extra_trip_approved",
        after_value: { extra_trip_approved_by: user.id },
        near_departure: await tripNearDeparture(supabase, tripId),
      });

      const { data: updated } = await supabase
        .from("linehaul_trips")
        .select("*")
        .eq("id", tripId)
        .single();

      return corsJson({ ok: true, action: "approve_extra_trip", trip: updated });
    }

    if (action === "cancel_trip") {
      const { data: parcels, error: listErr } = await supabase
        .from("orders")
        .select("id")
        .eq("trip_id", tripId);
      if (listErr) {
        return corsJson({ error: listErr.message }, { status: 500 });
      }

      const outcomes: Array<{ parcelId: string; action: string }> = [];
      for (const p of parcels || []) {
        const result = await applyParcelOverride(supabase, {
          adminId: user.id,
          tripId,
          parcelId: p.id,
          reason,
        });
        if (!result.ok) {
          return corsJson(
            { error: result.error, partial: outcomes },
            { status: result.status }
          );
        }
        outcomes.push({ parcelId: p.id, action: result.action });
      }

      await supabase
        .from("linehaul_trips")
        .update({
          status: "cancelled",
          accepts_new_parcels: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tripId);

      await supabase.from("trip_audit_logs").insert({
        trip_id: tripId,
        actor_id: user.id,
        action: "trip_cancelled",
        after_value: { parcel_outcomes: outcomes },
        near_departure: await tripNearDeparture(supabase, tripId),
      });

      return corsJson({ ok: true, action: "cancel_trip", outcomes });
    }

    return corsJson({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return corsJson({ error: String(e) }, { status: 500 });
  }
});
