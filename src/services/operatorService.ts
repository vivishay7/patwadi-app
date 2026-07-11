import { supabase, isSupabaseConfigured, getSupabaseConfigError } from "../lib/supabase";

export interface OperatorServiceResult<T> {
  data: T | null;
  error: string | null;
}

/** Server sets operator_agreement_accepted_at = now() for auth.uid(). */
export async function acceptOperatorAgreement(): Promise<OperatorServiceResult<string>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: getSupabaseConfigError() };
  }

  const { data, error } = await supabase.rpc("accept_operator_agreement");
  if (error) {
    return { data: null, error: error.message };
  }
  return { data: data as string, error: null };
}
