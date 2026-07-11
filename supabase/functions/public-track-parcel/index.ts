// Supabase Edge Function: public-track-parcel
// Public Tier-1 tracking lookup by tracking_code (no JWT — service role server-side).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsJson, handleCorsPreflight } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import {
  deriveCustomerParcelStatus,
  deriveTrackingCityName,
  getDeliveryProofPath,
  isValidTrackingCode,
  normalizeTrackingCode,
  parseCorridorCities,
  resolveSceneMotif,
  trackerStageIndex,
} from "../_shared/publicTracking.ts";

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const POD_SIGNED_URL_TTL_SEC = 3600;
const NOT_FOUND_MESSAGE = "Tracking code not found";

function getRequired(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function parseTrackingCodeFromRequest(req: Request): Promise<string | null> {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    return code ? normalizeTrackingCode(code) : null;
  }

  if (req.method !== "POST") return null;

  let body: { tracking_code?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return null;
  }

  const raw = body.tracking_code ?? body.code;
  return typeof raw === "string" ? normalizeTrackingCode(raw) : null;
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "GET" && req.method !== "POST") {
    return corsJson({ error: "Method not allowed" }, { status: 405, req });
  }

  try {
    const supabaseUrl = getRequired("SUPABASE_URL");
    const serviceRoleKey = getRequired("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const trackingCode = await parseTrackingCodeFromRequest(req);
    if (!trackingCode) {
      return corsJson({ error: "Missing tracking_code" }, { status: 400, req });
    }
    if (!isValidTrackingCode(trackingCode)) {
      return corsJson({ error: NOT_FOUND_MESSAGE }, { status: 404, req });
    }

    const rateLimit = await checkRateLimit(
      supabase,
      `public-track-parcel:ip:${clientIp(req)}`,
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_MS
    );
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSec, req);

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(
        "id, tracking_code, corridor_key, pickup_location, dropoff_location, payment_status, blocked_exception, created_at"
      )
      .eq("tracking_code", trackingCode)
      .eq("payment_status", "confirmed")
      .maybeSingle();

    if (orderErr) {
      console.error("public-track-parcel order lookup:", orderErr);
      throw new Error(orderErr.message);
    }
    if (!order) {
      return corsJson({ error: NOT_FOUND_MESSAGE }, { status: 404, req });
    }

    const { data: events, error: eventsErr } = await supabase
      .from("custody_events")
      .select("from_role, to_role, proof_type, proof_value, created_at")
      .eq("parcel_id", order.id)
      .order("created_at", { ascending: true });

    if (eventsErr) {
      console.error("public-track-parcel custody_events:", eventsErr);
      throw new Error(eventsErr.message);
    }

    const custodyEvents = events ?? [];
    const status = deriveCustomerParcelStatus({
      events: custodyEvents,
      blockedException: order.blocked_exception === true,
      orderCreatedAt: order.created_at,
    });

    const trackingCity = deriveTrackingCityName({
      parcelState: status.state,
      pickupLocation: order.pickup_location ?? "",
      dropoffLocation: order.dropoff_location ?? "",
      corridorKey: order.corridor_key,
    });

    const corridorCities = parseCorridorCities(order.corridor_key);
    const scene = resolveSceneMotif(trackingCity);

    let podUrl: string | null = null;
    const proofPath = getDeliveryProofPath(custodyEvents);
    if (proofPath && status.state === "delivered") {
      const { data: signed, error: signErr } = await supabase.storage
        .from("custody-proofs")
        .createSignedUrl(proofPath, POD_SIGNED_URL_TTL_SEC);
      if (signErr) {
        console.error("public-track-parcel pod signed url:", signErr);
      } else {
        podUrl = signed?.signedUrl ?? null;
      }
    }

    return corsJson(
      {
        tracking_code: order.tracking_code,
        corridor_key: order.corridor_key ?? null,
        origin_city: corridorCities.origin_city,
        destination_city: corridorCities.destination_city,
        state: status.state,
        label: status.label,
        stage_index: trackerStageIndex(status.state),
        stage_dates: status.stageDates,
        last_updated_at: status.lastUpdatedAt,
        tracking_city: trackingCity,
        scene: {
          display_city: scene.display_city,
          motif: scene.motif,
        },
        blocked_exception: order.blocked_exception === true,
        blocked_message:
          order.blocked_exception === true
            ? "Delivery exception — our team is resolving it"
            : null,
        pod_url: podUrl,
      },
      { req }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return corsJson({ error: msg }, { status: 500, req });
  }
});
