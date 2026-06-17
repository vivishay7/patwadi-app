// Supabase Edge Function: issue-handoff-code
// Issues a one-time, expiring, receiver-scoped 4-digit code per parcel+handoff step.
// IMPORTANT: does NOT return the code to the sender; receiver reads it via RLS on handoff_codes.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsJson, handleCorsPreflight } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

type Step =
  | "customer_to_lmp"
  | "lmp_to_linehaul"
  | "linehaul_to_lmp"
  | "lmp_to_customer";

function getRequired(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function random4(): string {
  const n = Math.floor(Math.random() * 10000);
  return String(n).padStart(4, "0");
}

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

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
    if (userError || !user) return corsJson({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parcelId: string = body.parcelId;
    const step: Step = body.step;
    if (!parcelId || !step) return corsJson({ error: "Missing parcelId/step" }, { status: 400 });

    const rateLimit = await checkRateLimit(
      supabase,
      `issue-handoff-code:parcel:${parcelId}`,
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_MS
    );
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSec);

    const { data: parcel, error: parcelErr } = await supabase
      .from("orders")
      .select(
        "id, customer_id, lmp_pickup_id, linehaul_id, lmp_delivery_id, payment_status, blocked_exception"
      )
      .eq("id", parcelId)
      .single();
    if (parcelErr || !parcel) return corsJson({ error: "Parcel not found" }, { status: 404 });
    if (parcel.blocked_exception) return corsJson({ error: "Parcel is blocked_exception" }, { status: 423 });
    if (parcel.payment_status !== "confirmed") return corsJson({ error: "Payment not confirmed" }, { status: 402 });

    let senderId: string | null = null;
    let senderRole: string | null = null;
    let receiverId: string | null = null;
    let receiverRole: string | null = null;

    if (step === "customer_to_lmp") {
      senderId = parcel.customer_id;
      senderRole = "customer";
      receiverId = parcel.lmp_pickup_id;
      receiverRole = "lmp";
    } else if (step === "lmp_to_linehaul") {
      senderId = parcel.lmp_pickup_id;
      senderRole = "lmp";
      receiverId = parcel.linehaul_id;
      receiverRole = "linehaul";
    } else if (step === "linehaul_to_lmp") {
      senderId = parcel.linehaul_id;
      senderRole = "linehaul";
      receiverId = parcel.lmp_delivery_id;
      receiverRole = "lmp";
    } else if (step === "lmp_to_customer") {
      senderId = parcel.lmp_delivery_id;
      senderRole = "lmp";
      receiverId = parcel.customer_id;
      receiverRole = "customer";
    }

    if (!senderId || !receiverId || !senderRole || !receiverRole) {
      return corsJson({ error: "Parcel is missing required operator assignments for this step" }, { status: 409 });
    }

    if (user.id !== senderId) {
      return corsJson({ error: "Only current custody holder can issue this handoff code" }, { status: 403 });
    }

    if (receiverRole !== "customer") {
      const { data: receiverProfile, error: profErr } = await supabase
        .from("profiles")
        .select("id, approval_status, role")
        .eq("id", receiverId)
        .single();
      if (profErr || !receiverProfile) return corsJson({ error: "Receiver profile not found" }, { status: 404 });
      if (receiverProfile.approval_status !== "approved") {
        return corsJson({ error: "Receiver operator is not approved" }, { status: 403 });
      }
      if (receiverProfile.role !== receiverRole) {
        return corsJson({ error: "Receiver role mismatch" }, { status: 400 });
      }
    }

    const { data: existing, error: exErr } = await supabase
      .from("handoff_codes")
      .select("*")
      .eq("parcel_id", parcelId)
      .eq("step", step)
      .eq("to_user_id", receiverId)
      .is("used_at", null)
      .eq("blocked", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (exErr) {
      return corsJson({ error: exErr.message }, { status: 500 });
    }

    const now = Date.now();
    if (existing) {
      const exp = new Date(existing.expires_at).getTime();
      if (exp > now) {
        return corsJson({ ok: true, expiresAt: existing.expires_at });
      }
    }

    const ttlMin = Number(Deno.env.get("HANDOFF_CODE_TTL_MIN") || "10");
    const expiresAt = new Date(now + ttlMin * 60 * 1000).toISOString();
    const maxAttempts = Number(Deno.env.get("HANDOFF_CODE_MAX_ATTEMPTS") || "5");

    const { error: insErr } = await supabase.from("handoff_codes").insert({
      parcel_id: parcelId,
      step,
      to_user_id: receiverId,
      to_role: receiverRole,
      expected_code: random4(),
      expires_at: expiresAt,
      max_attempts: maxAttempts,
      attempts: 0,
      blocked: false,
    });

    if (insErr) return corsJson({ error: insErr.message }, { status: 500 });

    return corsJson({ ok: true, expiresAt });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return corsJson({ error: msg }, { status: 500 });
  }
});
