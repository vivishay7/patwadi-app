// Supabase Edge Function: acknowledge-handoff
// Validates one-time expiring 4-digit code (server-side) and creates custody event.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsJson, handleCorsPreflight } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

type Step =
  | "customer_to_lmp"
  | "lmp_to_linehaul"
  | "linehaul_to_lmp"
  | "lmp_to_customer";

const STEPS: Step[] = [
  "customer_to_lmp",
  "lmp_to_linehaul",
  "linehaul_to_lmp",
  "lmp_to_customer",
];

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function isValidPhotoPath(parcelId: string, step: Step, photoPath: string): boolean {
  const prefix = `${parcelId}/${step}/`;
  if (!photoPath.startsWith(prefix)) return false;
  const rest = photoPath.slice(prefix.length);
  return rest.length > 0 && !rest.includes("..");
}

function mapRpcError(message: string): { status: number; error: string } {
  if (message.includes("HANDOFF_CODE_ALREADY_USED")) {
    return { status: 409, error: "Handoff code already used" };
  }
  if (message.includes("HANDOFF_CODE_EXPIRED")) {
    return { status: 409, error: "Handoff code expired" };
  }
  if (message.includes("HANDOFF_BLOCKED") || message.includes("PARCEL_BLOCKED")) {
    return { status: 423, error: "Handoff blocked. Requires ops intervention." };
  }
  if (message.includes("PAYMENT_NOT_CONFIRMED")) {
    return { status: 402, error: "Payment not confirmed" };
  }
  if (message.includes("PRIOR_CUSTODY_STEP_MISSING")) {
    return { status: 409, error: "Prior custody step not completed" };
  }
  if (message.includes("PARCEL_NOT_FOUND") || message.includes("HANDOFF_CODE_NOT_FOUND")) {
    return { status: 404, error: "Handoff not found" };
  }
  return { status: 500, error: message };
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const parcelId: string = body.parcelId;
    const step: Step = body.step;
    const code: string = String(body.code || "").trim();
    const photoPath: string = body.photoPath;
    const mimeType: string | undefined = body.mimeType;

    if (!parcelId || !step || !code || !photoPath) {
      return corsJson({ error: "Missing required fields" }, { status: 400 });
    }
    if (!STEPS.includes(step)) {
      return corsJson({ error: "Invalid handoff step" }, { status: 400 });
    }
    if (!/^\d{4}$/.test(code)) {
      return corsJson({ error: "Code must be 4 digits" }, { status: 400 });
    }
    if (!isValidPhotoPath(parcelId, step, photoPath)) {
      return corsJson({ error: "Invalid proof photo path" }, { status: 400 });
    }

    const rateLimit = await checkRateLimit(
      supabase,
      `acknowledge-handoff:user:${user.id}:parcel:${parcelId}:${step}`,
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_MS
    );
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSec);

    const { data: codeRow, error: codeErr } = await supabase
      .from("handoff_codes")
      .select("*")
      .eq("parcel_id", parcelId)
      .eq("step", step)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeErr || !codeRow) {
      return corsJson({ error: "No active handoff code found" }, { status: 400 });
    }

    if (codeRow.blocked) {
      return corsJson({ error: "Handoff blocked. Requires ops intervention." }, { status: 409 });
    }
    if (codeRow.used_at) {
      return corsJson({ error: "Handoff code already used" }, { status: 409 });
    }
    if (new Date(codeRow.expires_at).getTime() < Date.now()) {
      return corsJson({ error: "Handoff code expired" }, { status: 409 });
    }

    const { data: parcel, error: parcelErr } = await supabase
      .from("orders")
      .select("id, customer_id, lmp_pickup_id, linehaul_id, lmp_delivery_id, payment_status, blocked_exception")
      .eq("id", parcelId)
      .single();
    if (parcelErr || !parcel) {
      return corsJson({ error: "Parcel not found" }, { status: 404 });
    }
    if (parcel.blocked_exception) {
      return corsJson({ error: "Parcel is blocked_exception" }, { status: 423 });
    }
    if (parcel.payment_status !== "confirmed") {
      return corsJson({ error: "Payment not confirmed" }, { status: 402 });
    }

    if (step === "customer_to_lmp" && user.id !== parcel.customer_id) {
      return corsJson({ error: "Only customer can confirm this handoff" }, { status: 403 });
    }
    if (step === "lmp_to_linehaul" && user.id !== parcel.lmp_pickup_id) {
      return corsJson({ error: "Only pickup LMP can confirm this handoff" }, { status: 403 });
    }
    if (step === "linehaul_to_lmp" && user.id !== parcel.linehaul_id) {
      return corsJson({ error: "Only linehaul operator can confirm this handoff" }, { status: 403 });
    }
    if (step === "lmp_to_customer" && user.id !== parcel.lmp_delivery_id) {
      return corsJson({ error: "Only delivery LMP can confirm this handoff" }, { status: 403 });
    }

    if (codeRow.expected_code !== code) {
      const attempts = (codeRow.attempts || 0) + 1;
      const maxAttempts = codeRow.max_attempts || 5;
      const shouldBlock = attempts >= maxAttempts;

      await supabase
        .from("handoff_codes")
        .update({ attempts, blocked: shouldBlock })
        .eq("id", codeRow.id);

      if (shouldBlock) {
        await supabase.from("orders").update({ blocked_exception: true }).eq("id", parcelId);
        return corsJson(
          { error: "Too many failed attempts. Parcel blocked_exception." },
          { status: 423 }
        );
      }

      return corsJson({ error: "Invalid code" }, { status: 401 });
    }

    const { data: rpcResult, error: rpcErr } = await supabase.rpc("acknowledge_handoff_atomic", {
      p_code_id: codeRow.id,
      p_parcel_id: parcelId,
      p_step: step,
      p_code: code,
      p_from_user_id: user.id,
      p_photo_path: photoPath,
      p_mime_type: mimeType || "image/jpeg",
    });

    if (rpcErr) {
      const mapped = mapRpcError(rpcErr.message || "");
      return corsJson({ error: mapped.error }, { status: mapped.status });
    }

    const event = rpcResult?.event ?? rpcResult;

    const { data: resolvedRecoveryId } = await supabase.rpc(
      "try_resolve_parcel_recovery_after_custody",
      { p_parcel_id: parcelId, p_resolved_by: user.id }
    );

    return corsJson({
      event,
      recoveryResolved: !!resolvedRecoveryId,
      recoveryId: resolvedRecoveryId ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return corsJson({ error: msg }, { status: 500 });
  }
});
