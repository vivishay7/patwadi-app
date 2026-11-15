// Supabase Edge Function: verify-razorpay-payment
// Verifies Razorpay signature server-side and creates the parcel/order ONLY after verification.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsJson, handleCorsPreflight } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const AMOUNT_TOLERANCE_PAISE = 100;

function getRequired(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function hmacSha256(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const supabaseUrl = getRequired("SUPABASE_URL");
    const serviceRoleKey = getRequired("SUPABASE_SERVICE_ROLE_KEY");
    const razorpayKeySecret = getRequired("RAZORPAY_KEY_SECRET");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Require authenticated user (customer)
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

    const rateLimit = await checkRateLimit(
      supabase,
      `verify-razorpay-payment:user:${user.id}`,
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_MS
    );
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSec);

    const body = await req.json();
    const razorpay_order_id: string = body.razorpay_order_id;
    const razorpay_payment_id: string = body.razorpay_payment_id;
    const razorpay_signature: string = body.razorpay_signature;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return corsJson({ error: "Missing fields" }, { status: 400 });
    }

    // Load payment session
    const { data: session, error: sessionErr } = await supabase
      .from("payment_sessions")
      .select("*")
      .eq("razorpay_order_id", razorpay_order_id)
      .maybeSingle();

    if (sessionErr || !session) {
      return corsJson({ error: "Payment session not found" }, { status: 404 });
    }
    if (session.user_id !== user.id) {
      return corsJson({ error: "Forbidden" }, { status: 403 });
    }
    if (session.used_at) {
      // Idempotency: already used; one Razorpay order maps to one parcel.
      const { data: existing } = await supabase
        .from("orders")
        .select("id")
        .eq("razorpay_order_id", razorpay_order_id)
        .maybeSingle();
      if (existing?.id) return corsJson({ ok: true, parcelId: existing.id });
      return corsJson({ error: "Payment session already used" }, { status: 409 });
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = await hmacSha256(razorpayKeySecret, payload);
    if (expected !== razorpay_signature) {
      return corsJson({ error: "Invalid signature" }, { status: 401 });
    }

    const razorpayKeyId = getRequired("RAZORPAY_KEY_ID");
    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    const rpOrderRes = await fetch(
      `https://api.razorpay.com/v1/orders/${razorpay_order_id}`,
      { headers: { Authorization: `Basic ${auth}` } }
    );
    const rpOrder = await rpOrderRes.json();
    if (!rpOrderRes.ok) {
      return corsJson({ error: "Could not verify order with Razorpay" }, { status: 502 });
    }
    const amountPaid = Number(rpOrder.amount_paid ?? 0);
    const expectedAmount = Number(session.amount_in_paise);
    if (Math.abs(amountPaid - expectedAmount) > AMOUNT_TOLERANCE_PAISE) {
      return corsJson({ error: "Payment amount mismatch" }, { status: 402 });
    }

    const rpPayRes = await fetch(
      `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
      { headers: { Authorization: `Basic ${auth}` } }
    );
    const rpPay = await rpPayRes.json();
    if (!rpPayRes.ok) {
      return corsJson({ error: "Could not verify payment with Razorpay" }, { status: 502 });
    }
    if (rpPay.order_id !== razorpay_order_id) {
      return corsJson({ error: "Payment order mismatch" }, { status: 400 });
    }
    if (rpPay.status !== "captured" && rpPay.status !== "authorized") {
      return corsJson({ error: "Payment not completed" }, { status: 402 });
    }

    const { data: parcelId, error: createErr } = await supabase.rpc(
      "create_order_from_verified_payment",
      {
        p_session_id: session.id,
        p_user_id: user.id,
        p_razorpay_order_id: razorpay_order_id,
        p_razorpay_payment_id: razorpay_payment_id,
        p_terms_accepted_at: new Date().toISOString(),
      }
    );

    if (createErr || !parcelId) {
      const msg = createErr?.message || "Failed to create parcel";
      if (msg.includes("PAYMENT_SESSION_NOT_FOUND")) {
        return corsJson({ error: "Payment session not found" }, { status: 404 });
      }
      if (msg.includes("PAYMENT_SESSION_FORBIDDEN")) {
        return corsJson({ error: "Forbidden" }, { status: 403 });
      }
      if (msg.includes("PAYMENT_SESSION_ALREADY_USED")) {
        return corsJson({ error: "Payment session already used" }, { status: 409 });
      }
      return corsJson({ error: msg }, { status: 500 });
    }

    return corsJson({ ok: true, parcelId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return corsJson({ error: msg }, { status: 500 });
  }
});

