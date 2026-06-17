// Supabase Edge Function: razorpay-webhook
// Handles Razorpay payment dispute/refund events (no JWT — verified via X-Razorpay-Signature).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type RazorpayEvent = {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string } };
    refund?: { entity?: { payment_id?: string } };
  };
};

async function findOrderId(
  supabase: ReturnType<typeof createClient>,
  razorpayOrderId?: string | null,
  razorpayPaymentId?: string | null
): Promise<string | null> {
  if (razorpayOrderId) {
    const { data } = await supabase
      .from("orders")
      .select("id")
      .eq("razorpay_order_id", razorpayOrderId)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }
  if (razorpayPaymentId) {
    const { data } = await supabase
      .from("orders")
      .select("id")
      .eq("razorpay_payment_id", razorpayPaymentId)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = getRequired("SUPABASE_URL");
    const serviceRoleKey = getRequired("SUPABASE_SERVICE_ROLE_KEY");
    const razorpayKeySecret = getRequired("RAZORPAY_KEY_SECRET");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const rawBody = await req.text();
    const signature = req.headers.get("X-Razorpay-Signature") || "";
    if (!signature) {
      return jsonResponse({ error: "Missing signature" }, 401);
    }

    const expected = await hmacSha256(razorpayKeySecret, rawBody);
    if (expected !== signature) {
      return jsonResponse({ error: "Invalid signature" }, 401);
    }

    let event: RazorpayEvent;
    try {
      event = JSON.parse(rawBody) as RazorpayEvent;
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    const eventName = event.event;
    if (!eventName) {
      return jsonResponse({ ok: true, skipped: "no event name" });
    }

    const paymentEntity = event.payload?.payment?.entity;
    const refundEntity = event.payload?.refund?.entity;
    const razorpayOrderId = paymentEntity?.order_id ?? null;
    const razorpayPaymentId =
      paymentEntity?.id ?? refundEntity?.payment_id ?? null;

    const orderId = await findOrderId(supabase, razorpayOrderId, razorpayPaymentId);
    if (!orderId) {
      return jsonResponse({ ok: true, skipped: "order not found", event: eventName });
    }

    switch (eventName) {
      case "payment.dispute.created":
        await supabase
          .from("orders")
          .update({ blocked_exception: true, dispute_status: "disputed" })
          .eq("id", orderId);
        break;
      case "payment.dispute.won":
        await supabase
          .from("orders")
          .update({ dispute_status: null })
          .eq("id", orderId);
        break;
      case "payment.dispute.lost":
        await supabase
          .from("orders")
          .update({ dispute_status: "dispute_lost" })
          .eq("id", orderId);
        break;
      case "refund.processed":
        await supabase
          .from("orders")
          .update({ dispute_status: "refunded" })
          .eq("id", orderId);
        break;
      default:
        return jsonResponse({ ok: true, skipped: "unhandled event", event: eventName });
    }

    return jsonResponse({ ok: true, event: eventName, orderId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("razorpay-webhook:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
