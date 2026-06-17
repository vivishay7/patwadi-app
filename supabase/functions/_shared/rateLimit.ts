import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsJson } from "./cors.ts";

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

/** Count events in scope_key within windowMs; insert one event if under limit. */
export async function checkRateLimit(
  supabase: SupabaseClient,
  scopeKey: string,
  maxCount: number,
  windowMs: number
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowMs).toISOString();

  const { count, error: countErr } = await supabase
    .from("rate_limit_log")
    .select("id", { count: "exact", head: true })
    .eq("scope_key", scopeKey)
    .gte("created_at", windowStart);

  if (countErr) {
    console.error("checkRateLimit count:", countErr);
    throw new Error(countErr.message);
  }

  if ((count ?? 0) >= maxCount) {
    return { allowed: false, retryAfterSec: Math.ceil(windowMs / 1000) };
  }

  const { error: insErr } = await supabase
    .from("rate_limit_log")
    .insert({ scope_key: scopeKey });

  if (insErr) {
    console.error("checkRateLimit insert:", insErr);
    throw new Error(insErr.message);
  }

  return { allowed: true };
}

export function rateLimitResponse(retryAfterSec: number): Response {
  return corsJson(
    { error: "Rate limit exceeded", retryAfterSec },
    { status: 429 }
  );
}
