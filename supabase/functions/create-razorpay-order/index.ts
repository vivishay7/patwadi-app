// Supabase Edge Function: create-razorpay-order
// Creates a Razorpay order server-side and persists razorpay_order_id to payment_sessions.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsJson, handleCorsPreflight } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

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
    const razorpayKeyId = getRequired("RAZORPAY_KEY_ID");
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
    if (userError || !user) {
      return corsJson({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const currency: string = body.currency || "INR";
    const corridorKey: string = body.corridorKey;
    const pickup_location: string = body.pickup_location;
    const dropoff_location: string = body.dropoff_location;
    const weight_kg: number | undefined = body.weight_kg;
    const dimensions: any | undefined = body.dimensions;
    const contents: string | undefined = body.contents;
    const price_estimate: number | undefined = body.price_estimate;

    if (!corridorKey || !pickup_location || !dropoff_location) {
      return corsJson({ error: "Missing required booking/payment fields" }, { status: 400 });
    }

    // payment_sessions row is created below — amount must not trust client amountInPaise.
    if (price_estimate == null || Number.isNaN(Number(price_estimate))) {
      return corsJson({ error: "Missing price_estimate" }, { status: 400 });
    }
    const amountInPaise = Math.round(Number(price_estimate) * 100);
    if (amountInPaise < 100) {
      return corsJson({ error: "Amount below minimum" }, { status: 400 });
    }

    const rateLimit = await checkRateLimit(
      supabase,
      `create-razorpay-order:user:${user.id}`,
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_MS
    );
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSec);

    // Create Razorpay order
    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const rpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency,
        receipt: `pw_${Date.now().toString(36)}`,
        payment_capture: 1,
      }),
    });

    const rpJson = await rpRes.json();
    if (!rpRes.ok) {
      return corsJson({ error: rpJson?.error?.description || "Razorpay order create failed" }, { status: 502 });
    }

    const razorpayOrderId = rpJson.id as string;
    const { data: session, error: sessionErr } = await supabase
      .from("payment_sessions")
      .insert({
        user_id: user.id,
        corridor_key: corridorKey,
        amount_in_paise: amountInPaise,
        currency,
        razorpay_order_id: razorpayOrderId,
        pickup_location,
        dropoff_location,
        weight_kg: weight_kg ?? null,
        dimensions: dimensions ?? null,
        contents: contents ?? null,
        price_estimate: price_estimate ?? null,
      })
      .select("id")
      .single();

    if (sessionErr || !session) {
      return corsJson({ error: sessionErr?.message || "Failed to create payment session" }, { status: 500 });
    }

    return corsJson({ razorpayOrderId, paymentSessionId: session.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return corsJson({ error: msg }, { status: 500 });
  }
});

