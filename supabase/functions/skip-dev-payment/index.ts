// Dev-only: create a confirmed order without Razorpay (smoke tests / local QA).
// Requires ALLOW_DEV_PAYMENT_SKIP=true on the Edge Function.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsJson, handleCorsPreflight } from "../_shared/cors.ts";

function getRequired(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (Deno.env.get("ALLOW_DEV_PAYMENT_SKIP") !== "true") {
    return corsJson({ error: "Dev payment skip is disabled" }, { status: 403 });
  }

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
    const corridorKey: string = body.corridorKey;
    const pickup_location: string = body.pickup_location;
    const dropoff_location: string = body.dropoff_location;
    const weight_kg: number | undefined = body.weight_kg;
    const dimensions: unknown = body.dimensions;
    const contents: string | undefined = body.contents;
    const price_estimate: number | undefined = body.price_estimate;

    if (!corridorKey || !pickup_location || !dropoff_location) {
      return corsJson({ error: "Missing required booking fields" }, { status: 400 });
    }

    const devOrderId = `dev_skip_${crypto.randomUUID()}`;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        customer_id: user.id,
        pickup_location,
        dropoff_location,
        weight_kg: weight_kg ?? null,
        dimensions: dimensions ?? null,
        contents: contents ?? null,
        price_estimate: price_estimate ?? null,
        corridor_key: corridorKey,
        payment_status: "confirmed",
        razorpay_order_id: devOrderId,
        razorpay_payment_id: "dev_skip",
        status: "pending",
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      return corsJson(
        { error: orderErr?.message || "Failed to create dev order" },
        { status: 500 }
      );
    }

    return corsJson({ ok: true, parcelId: order.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return corsJson({ error: msg }, { status: 500 });
  }
});
