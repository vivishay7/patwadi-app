import { supabase } from "../lib/supabase";
import { CustodyEvent } from "../lib/db/types";
import * as FileSystem from "expo-file-system/legacy";

export async function getCustodyProofSignedUrl(
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("custody-proofs")
    .createSignedUrl(path, expiresIn);
  if (error) {
    console.error("getCustodyProofSignedUrl:", error);
    return null;
  }
  return data?.signedUrl ?? null;
}

/** Cache signed POD to a local file:// URI — RN Image on Android often fails on storage JWT URLs. */
export async function getCustodyProofDisplayUri(
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const signed = await getCustodyProofSignedUrl(path, expiresIn);
  if (!signed) return null;

  const safeName = path.replace(/[/\\]/g, "_");
  const dest = `${FileSystem.cacheDirectory}custody-proof-${safeName}`;
  let localUri = dest;

  const existing = await FileSystem.getInfoAsync(dest);
  if (!existing.exists) {
    const result = await FileSystem.downloadAsync(signed, dest);
    if (result.status !== 200) {
      console.error("getCustodyProofDisplayUri:", result.status);
      return null;
    }
    localUri = result.uri;
  }

  const info = await FileSystem.getInfoAsync(localUri);
  if (!info.exists || (typeof info.size === "number" && info.size < 64)) {
    console.error("getCustodyProofDisplayUri: missing or tiny file", info);
    return null;
  }

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:image/jpeg;base64,${base64}`;
}

export async function fetchCustodyEvents(parcelId: string): Promise<CustodyEvent[]> {
  const { data, error } = await supabase
    .from("custody_events")
    .select("*")
    .eq("parcel_id", parcelId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as CustodyEvent[];
}

export async function fetchCustodyEventsForParcels(
  parcelIds: string[]
): Promise<Record<string, CustodyEvent[]>> {
  if (!parcelIds.length) return {};
  const { data, error } = await supabase
    .from("custody_events")
    .select("*")
    .in("parcel_id", parcelIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const grouped: Record<string, CustodyEvent[]> = {};
  for (const event of (data || []) as CustodyEvent[]) {
    if (!grouped[event.parcel_id]) grouped[event.parcel_id] = [];
    grouped[event.parcel_id].push(event);
  }
  return grouped;
}

async function uriToBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return await res.blob();
}

export async function uploadCustodyPhoto(params: {
  parcelId: string;
  step: string;
  photoUri: string;
  mimeType?: string;
}): Promise<{ path: string } | null> {
  const { parcelId, step, photoUri, mimeType } = params;
  const ext = (mimeType?.split("/")?.[1] || "jpg").toLowerCase();
  const fileName = `${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
  const path = `${parcelId}/${step}/${fileName}`;

  const blob = await uriToBlob(photoUri);
  const { error } = await supabase.storage
    .from("custody-proofs")
    .upload(path, blob, {
      contentType: mimeType || "image/jpeg",
      upsert: false,
    });

  if (error) {
    console.error("uploadCustodyPhoto:", error);
    return null;
  }

  return { path };
}

export async function acknowledgeHandoff(params: {
  parcelId: string;
  step: "customer_to_lmp" | "lmp_to_linehaul" | "linehaul_to_lmp" | "lmp_to_customer";
  code: string;
  photoUri: string;
  mimeType?: string;
}): Promise<{ event: CustodyEvent } | { error: string } > {
  const { parcelId, step, code, photoUri, mimeType } = params;

  // Upload is mandatory. If upload fails, handoff fails.
  const upload = await uploadCustodyPhoto({ parcelId, step, photoUri, mimeType });
  if (!upload) {
    return { error: "Photo upload failed. Handoff not confirmed." };
  }

  // Server-side validation + custody event creation
  const { data, error } = await supabase.functions.invoke("acknowledge-handoff", {
    body: {
      parcelId,
      step,
      code,
      photoPath: upload.path,
      mimeType: mimeType || "image/jpeg",
    },
  });

  if (error) {
    console.error("acknowledgeHandoff:", error);
    return { error: error.message };
  }

  if (!data?.event) {
    return { error: data?.error || "Failed to confirm handoff" };
  }

  return { event: data.event as CustodyEvent };
}

export async function issueHandoffCode(params: {
  parcelId: string;
  step: "customer_to_lmp" | "lmp_to_linehaul" | "linehaul_to_lmp" | "lmp_to_customer";
}): Promise<{ ok: true; expiresAt: string } | { error: string }> {
  const { data, error } = await supabase.functions.invoke("issue-handoff-code", {
    body: params,
  });
  if (error) return { error: error.message };
  if (!data?.ok) return { error: data?.error || "Failed to issue handoff code" };
  return { ok: true, expiresAt: data.expiresAt as string };
}

