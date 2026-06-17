import { supabase } from "../supabase";
import {
  clearLocationQueue,
  readLocationQueue,
  type QueuedLocationSample,
} from "./locationQueue";

export async function syncLocationQueue(): Promise<{ ok: boolean; written?: number }> {
  const queue = await readLocationQueue();
  if (!queue.length) return { ok: true, written: 0 };

  const { data, error } = await supabase.functions.invoke("sync-location-samples", {
    body: { samples: queue.map(toPayload) },
  });

  if (error) {
    console.error("syncLocationQueue:", error);
    return { ok: false };
  }
  if (!data?.ok) {
    console.error("syncLocationQueue response:", data);
    return { ok: false };
  }

  await clearLocationQueue();
  return { ok: true, written: data.written as number };
}

function toPayload(s: QueuedLocationSample) {
  return {
    tripId: s.tripId ?? null,
    orderId: s.orderId ?? null,
    role: s.role,
    lat: s.lat,
    lng: s.lng,
    accuracyM: s.accuracyM ?? null,
    recordedAt: s.recordedAt,
  };
}
