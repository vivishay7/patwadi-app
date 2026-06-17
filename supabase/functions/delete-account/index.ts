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

  if (req.method !== "POST") {
    return corsJson({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const supabaseUrl = getRequired("SUPABASE_URL");
    const serviceRoleKey = getRequired("SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(supabaseUrl, serviceRoleKey);

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

    const { data: activeOrders, error: openErr } = await admin
      .from("orders")
      .select("id")
      .eq("customer_id", user.id)
      .eq("payment_status", "confirmed");

    if (openErr) {
      return corsJson({ error: openErr.message }, { status: 400 });
    }

    for (const order of activeOrders ?? []) {
      const { data: delivered } = await admin
        .from("custody_events")
        .select("id")
        .eq("parcel_id", order.id)
        .eq("from_role", "lmp")
        .eq("to_role", "customer")
        .limit(1);

      if (!delivered || delivered.length === 0) {
        return corsJson(
          { error: "You have active parcels. Please contact support before deleting your account." },
          { status: 409 }
        );
      }
    }

    const { error: profileError } = await admin.from("profiles").delete().eq("id", user.id);
    if (profileError) {
      return corsJson({ error: profileError.message }, { status: 400 });
    }

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(user.id);
    if (authDeleteError) {
      return corsJson({ error: authDeleteError.message }, { status: 400 });
    }

    return corsJson({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delete failed";
    return corsJson({ error: message }, { status: 500 });
  }
});
