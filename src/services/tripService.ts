import { supabase } from "../lib/supabase";
import type {
  LinehaulTrip,
  LinehaulTripConductor,
  LinehaulTripTransferRequest,
  Order,
} from "../lib/db/types";
import {
  canTransitionTripToOpen,
  conductorTripCalendarDate,
  shouldMarkExtraTrip,
} from "../lib/domain/tripLimits";
import type { CapturedLocation } from "../lib/location/captureCurrentLocation";
import { uriToUploadBody } from "../lib/media/uriToUploadBody";
import { isConductorActiveOnTrip } from "../lib/domain/conductorLock";

export async function fetchMyTrips(conductorId: string): Promise<LinehaulTrip[]> {
  const { data: memberRows, error: memberErr } = await supabase
    .from("linehaul_trip_conductors")
    .select("trip_id")
    .eq("conductor_id", conductorId)
    .is("active_until", null);

  if (memberErr) {
    console.error("fetchMyTrips member:", memberErr);
  }

  const memberTripIds = [...new Set((memberRows ?? []).map((r) => r.trip_id))];
  const filters = [`created_by_conductor_id.eq.${conductorId}`];
  if (memberTripIds.length) {
    filters.push(`id.in.(${memberTripIds.join(",")})`);
  }

  const { data, error } = await supabase
    .from("linehaul_trips")
    .select("*")
    .or(filters.join(","))
    .order("scheduled_departure_at", { ascending: false });

  if (error) {
    console.error("fetchMyTrips:", error);
    return [];
  }

  const trips = (data ?? []) as LinehaulTrip[];
  if (!trips.length) return [];

  const conductorsByTrip = await fetchTripConductorsForTrips(trips.map((t) => t.id));

  return trips.filter((trip) =>
    isConductorActiveOnTrip(conductorId, trip, conductorsByTrip[trip.id] ?? [])
  );
}

export async function fetchTripById(tripId: string): Promise<LinehaulTrip | null> {
  const { data, error } = await supabase
    .from("linehaul_trips")
    .select("*")
    .eq("id", tripId)
    .maybeSingle();
  if (error) {
    console.error("fetchTripById:", error);
    return null;
  }
  return data as LinehaulTrip | null;
}

export async function fetchTripConductors(tripId: string): Promise<LinehaulTripConductor[]> {
  const { data, error } = await supabase
    .from("linehaul_trip_conductors")
    .select("*")
    .eq("trip_id", tripId)
    .order("added_at", { ascending: true });
  if (error) {
    console.error("fetchTripConductors:", error);
    return [];
  }
  return (data ?? []) as LinehaulTripConductor[];
}

export async function fetchTripAttachedParcels(tripId: string): Promise<Partial<Order>[]> {
  const { data, error } = await supabase
    .from("operator_order_view")
    .select("id, pickup_location, dropoff_location, corridor_key, payment_status")
    .eq("trip_id", tripId);
  if (error) {
    console.error("fetchTripAttachedParcels:", error);
    return [];
  }
  return data ?? [];
}

export type EligibleLinehaulConductor = {
  id: string;
  phone: string | null;
};

/** v6 §5 / §6.1 — approved, available linehaul operators (RPC bypasses profiles RLS). */
export async function fetchEligibleLinehaulConductors(): Promise<EligibleLinehaulConductor[]> {
  const { data, error } = await supabase.rpc("list_eligible_linehaul_conductors");
  if (error) {
    console.error("fetchEligibleLinehaulConductors:", error);
    return [];
  }
  return (data ?? []) as EligibleLinehaulConductor[];
}

/** Co-conductor IDs from trips this conductor has shared (picker shortcut). */
export async function fetchRecentCoConductorIds(conductorId: string): Promise<string[]> {
  const { data: owned } = await supabase
    .from("linehaul_trips")
    .select("id")
    .eq("created_by_conductor_id", conductorId);
  const { data: member } = await supabase
    .from("linehaul_trip_conductors")
    .select("trip_id")
    .eq("conductor_id", conductorId);

  const tripIds = [
    ...new Set([
      ...(owned ?? []).map((t) => t.id),
      ...(member ?? []).map((m) => m.trip_id),
    ]),
  ];
  if (!tripIds.length) return [];

  const { data: rows } = await supabase
    .from("linehaul_trip_conductors")
    .select("conductor_id")
    .in("trip_id", tripIds)
    .neq("conductor_id", conductorId);

  return [...new Set((rows ?? []).map((r) => r.conductor_id))];
}

export async function uploadBusProofPhoto(params: {
  tripId: string;
  photoUri: string;
  mimeType?: string;
}): Promise<{ path: string } | { error: string }> {
  const ext = (params.mimeType?.split("/")?.[1] || "jpg").toLowerCase();
  const path = `trip-bus/${params.tripId}/${Date.now()}.${ext}`;
  try {
    const { body, mimeType } = await uriToUploadBody(params.photoUri, params.mimeType);
    const { error } = await supabase.storage
      .from("custody-proofs")
      .upload(path, body, {
        contentType: mimeType,
        upsert: false,
      });
    if (error) {
      console.error("uploadBusProofPhoto:", error);
      const msg = /bucket|not found|unknown/i.test(error.message)
        ? "Photo storage is not available yet. Try again in a moment or contact support."
        : /network|fetch|failed/i.test(error.message)
          ? "Upload failed — check your internet connection and try again."
          : error.message;
      return { error: msg };
    }
    return { path };
  } catch (e) {
    console.error("uploadBusProofPhoto:", e);
    const msg =
      e instanceof Error && /network|fetch|failed/i.test(e.message)
        ? "Could not read or upload the photo. Check your connection and take the photo again."
        : e instanceof Error
          ? e.message
          : "Photo upload failed";
    return { error: msg };
  }
}

export interface CreateLinehaulTripInput {
  conductorId: string;
  corridorId: string;
  busNumber: string;
  driverName: string;
  driverPhone: string;
  scheduledDepartureAt: string;
  expectedArrivalAt: string;
  capacityCount?: number;
  capacityWeight?: number;
  busProofPhotoUri: string;
  busProofMimeType?: string;
  tripCoverageType?: "full" | "partial";
  plannedCoConductorId?: string;
}

export async function createLinehaulTrip(
  input: CreateLinehaulTripInput
): Promise<{ trip: LinehaulTrip } | { error: string }> {
  const routeLabel = input.corridorId
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" → ");

  const coverageType = input.tripCoverageType ?? "full";
  if (coverageType === "partial" && !input.plannedCoConductorId) {
    return { error: "Select a co-conductor for a partial trip" };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("linehaul_trips")
    .insert({
      corridor_id: input.corridorId,
      route_label: routeLabel,
      bus_number: input.busNumber,
      driver_name: input.driverName,
      driver_phone: input.driverPhone,
      scheduled_departure_at: input.scheduledDepartureAt,
      expected_arrival_at: input.expectedArrivalAt,
      capacity_count: input.capacityCount ?? null,
      capacity_weight: input.capacityWeight ?? null,
      status: "draft",
      created_by_conductor_id: input.conductorId,
      trip_coverage_type: coverageType,
      planned_co_conductor_id:
        coverageType === "partial" ? input.plannedCoConductorId ?? null : null,
    })
    .select()
    .single();

  if (insertErr || !inserted) {
    const msg = insertErr?.message?.includes("Network")
      ? "Could not reach the server. Check your internet connection and try again."
      : insertErr?.message || "Failed to create trip";
    return { error: msg };
  }

  const upload = await uploadBusProofPhoto({
    tripId: inserted.id,
    photoUri: input.busProofPhotoUri,
    mimeType: input.busProofMimeType,
  });
  if ("error" in upload) {
    await supabase.from("linehaul_trips").delete().eq("id", inserted.id);
    return { error: upload.error };
  }

  const { data: trip, error: updateErr } = await supabase
    .from("linehaul_trips")
    .update({ bus_proof_photo_path: upload.path })
    .eq("id", inserted.id)
    .select()
    .single();

  if (updateErr || !trip) {
    return { error: updateErr?.message || "Failed to save bus proof path" };
  }

  if (coverageType === "partial" && input.plannedCoConductorId) {
    const { error: seedErr } = await supabase.rpc("seed_planned_co_conductor", {
      p_trip_id: inserted.id,
    });
    if (seedErr) {
      await supabase.from("linehaul_trips").delete().eq("id", inserted.id);
      return { error: seedErr.message };
    }
  }

  return { trip: trip as LinehaulTrip };
}

export async function publishTripToOpen(
  tripId: string,
  conductorId: string
): Promise<{ trip: LinehaulTrip } | { error: string }> {
  const trip = await fetchTripById(tripId);
  if (!trip) return { error: "Trip not found" };
  if (trip.created_by_conductor_id !== conductorId) {
    return { error: "Only the primary conductor can publish this trip" };
  }

  const gate = evaluateCanOpenTrip(trip);
  if (!gate.ok) return { error: gate.reason };

  const { data, error } = await supabase
    .from("linehaul_trips")
    .update({
      status: "open",
      accepts_new_parcels: true,
      details_locked: false,
    })
    .eq("id", tripId)
    .select()
    .single();

  if (error || !data) {
    return { error: error?.message || "Failed to publish trip" };
  }

  if (trip.trip_coverage_type === "partial" && trip.planned_co_conductor_id) {
    await supabase.rpc("seed_planned_co_conductor", { p_trip_id: tripId });
  }

  return { trip: data as LinehaulTrip };
}

export async function countConductorTripsOnDate(params: {
  conductorId: string;
  scheduledDepartureAt: string;
}): Promise<number> {
  const day = conductorTripCalendarDate(params.scheduledDepartureAt);
  const { data, error } = await supabase
    .from("linehaul_trips")
    .select("id, scheduled_departure_at")
    .eq("created_by_conductor_id", params.conductorId)
    .neq("status", "cancelled");

  if (error) {
    console.error("countConductorTripsOnDate:", error);
    return 0;
  }

  return (data ?? []).filter(
    (t) => conductorTripCalendarDate(t.scheduled_departure_at) === day
  ).length;
}

/** v6 §4 — preview whether a new trip on this date would be extra. */
export async function previewTripCreation(params: {
  conductorId: string;
  scheduledDepartureAt: string;
}): Promise<{ is_extra_trip: boolean }> {
  const count = await countConductorTripsOnDate(params);
  return { is_extra_trip: shouldMarkExtraTrip({ existingTripsOnSameDay: count }) };
}

export function evaluateCanOpenTrip(
  trip: Pick<
    LinehaulTrip,
    "is_extra_trip" | "extra_trip_approved_by" | "bus_proof_photo_path" | "status"
  >
) {
  return canTransitionTripToOpen(trip);
}

export async function addCoConductor(params: {
  tripId: string;
  targetConductorId: string;
  location?: CapturedLocation | null;
  reason?: string;
}): Promise<
  | { ok: true; conductor: LinehaulTripConductor }
  | { error: string }
> {
  const { data, error } = await supabase.functions.invoke("add-co-conductor", {
    body: params,
  });
  if (error) return { error: error.message };
  if (!data?.conductor) return { error: data?.error || "Failed to add co-conductor" };
  return { ok: true, conductor: data.conductor as LinehaulTripConductor };
}

export async function requestTripTransfer(params: {
  tripId: string;
  toConductorId: string;
  fromLocation?: CapturedLocation | null;
  toLocation?: CapturedLocation | null;
  toLocationReadFailed?: boolean;
  reason?: string;
}): Promise<
  | { ok: true; request: LinehaulTripTransferRequest; acceptBy?: string }
  | { error: string }
> {
  const { data, error } = await supabase.functions.invoke("request-trip-transfer", {
    body: params,
  });
  if (error) return { error: error.message };
  if (!data?.request) return { error: data?.error || "Transfer failed" };
  return {
    ok: true,
    request: data.request as LinehaulTripTransferRequest,
    acceptBy: data.acceptBy as string | undefined,
  };
}

export async function fetchPendingIncomingTransfers(
  conductorId: string
): Promise<LinehaulTripTransferRequest[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("linehaul_trip_transfer_requests")
    .select("*")
    .eq("to_conductor_id", conductorId)
    .eq("status", "pending_acceptance")
    .gt("accept_by", now)
    .order("requested_at", { ascending: false });

  if (error) {
    console.error("fetchPendingIncomingTransfers:", error);
    return [];
  }
  return (data ?? []) as LinehaulTripTransferRequest[];
}

export async function fetchPendingOutgoingTransfer(
  tripId: string
): Promise<LinehaulTripTransferRequest | null> {
  const { data, error } = await supabase
    .from("linehaul_trip_transfer_requests")
    .select("*")
    .eq("trip_id", tripId)
    .eq("status", "pending_acceptance")
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("fetchPendingOutgoingTransfer:", error);
    return null;
  }
  return data as LinehaulTripTransferRequest | null;
}

export async function acceptTripTransfer(transferRequestId: string): Promise<
  | { ok: true; request: LinehaulTripTransferRequest }
  | { error: string; code?: string }
> {
  const { data, error } = await supabase.functions.invoke("accept-trip-transfer", {
    body: { transferRequestId },
  });
  if (error) return { error: error.message };
  if (data?.code === "rejected_timeout") {
    return { error: data.error || "Acceptance window expired", code: "rejected_timeout" };
  }
  if (!data?.request) return { error: data?.error || "Accept failed" };
  return { ok: true, request: data.request as LinehaulTripTransferRequest };
}

export async function attachBusProofToDraft(
  tripId: string,
  conductorId: string,
  photoUri: string,
  mimeType?: string
): Promise<{ trip: LinehaulTrip } | { error: string }> {
  const trip = await fetchTripById(tripId);
  if (!trip) return { error: "Trip not found" };
  if (trip.created_by_conductor_id !== conductorId) {
    return { error: "Only the primary conductor can update this trip" };
  }
  if (trip.status !== "draft") {
    return { error: "Bus proof can only be added while the trip is a draft" };
  }

  const upload = await uploadBusProofPhoto({ tripId, photoUri, mimeType });
  if ("error" in upload) return { error: upload.error };

  const { data, error } = await supabase
    .from("linehaul_trips")
    .update({ bus_proof_photo_path: upload.path })
    .eq("id", tripId)
    .select()
    .single();

  if (error || !data) {
    return { error: error?.message || "Failed to save bus proof" };
  }
  return { trip: data as LinehaulTrip };
}

export async function deleteDraftTrip(
  tripId: string,
  conductorId: string
): Promise<{ ok: true } | { error: string }> {
  const trip = await fetchTripById(tripId);
  if (!trip) return { error: "Trip not found" };
  if (trip.created_by_conductor_id !== conductorId) {
    return { error: "Only the primary conductor can delete this trip" };
  }
  if (trip.status !== "draft") {
    return { error: "Only draft trips can be deleted" };
  }

  const parcels = await fetchTripAttachedParcels(tripId);
  if (parcels.length > 0) {
    return { error: "Cannot delete a draft with attached parcels" };
  }

  const { data, error } = await supabase
    .from("linehaul_trips")
    .delete()
    .eq("id", tripId)
    .select("id");
  if (error) {
    const msg = error.message?.includes("row-level security")
      ? "Delete not permitted — ask admin to apply the draft-delete policy, or try again after app update."
      : error.message;
    return { error: msg };
  }
  if (!data?.length) {
    return { error: "Trip could not be deleted. It may already be removed or you may not have permission." };
  }
  return { ok: true };
}

export async function attachParcelToTrip(
  orderId: string,
  tripId: string
): Promise<{ ok: true } | { error: string }> {
  const { data, error } = await supabase.rpc("attach_parcel_to_linehaul_trip", {
    p_order_id: orderId,
    p_trip_id: tripId,
  });
  if (error) return { error: error.message };
  if (!data) return { error: "Failed to attach parcel" };
  return { ok: true };
}

export async function fetchOpenTripsForAttach(
  conductorId: string
): Promise<LinehaulTrip[]> {
  const trips = await fetchMyTrips(conductorId);
  return trips.filter(
    (t) =>
      t.status === "open" &&
      t.accepts_new_parcels &&
      (!t.is_extra_trip || !!t.extra_trip_approved_by)
  );
}

export async function fetchTripConductorsForTrips(
  tripIds: string[]
): Promise<Record<string, LinehaulTripConductor[]>> {
  if (!tripIds.length) return {};
  const { data, error } = await supabase
    .from("linehaul_trip_conductors")
    .select("*")
    .in("trip_id", tripIds);
  if (error) {
    console.error("fetchTripConductorsForTrips:", error);
    return {};
  }
  const grouped: Record<string, LinehaulTripConductor[]> = {};
  for (const row of (data ?? []) as LinehaulTripConductor[]) {
    if (!grouped[row.trip_id]) grouped[row.trip_id] = [];
    grouped[row.trip_id].push(row);
  }
  return grouped;
}

export async function fetchLatestLocationSample(params: {
  conductorId: string;
  tripId?: string;
}): Promise<{ lat: number; lng: number } | null> {
  let q = supabase
    .from("location_samples")
    .select("lat, lng")
    .eq("conductor_id", params.conductorId)
    .order("recorded_at", { ascending: false })
    .limit(1);
  if (params.tripId) {
    q = q.eq("trip_id", params.tripId);
  }
  const { data, error } = await q.maybeSingle();
  if (error) {
    console.error("fetchLatestLocationSample:", error);
    return null;
  }
  if (!data) return null;
  return { lat: data.lat, lng: data.lng };
}

export async function extendTripArrival(
  tripId: string
): Promise<{ trip: LinehaulTrip } | { error: string }> {
  const { data, error } = await supabase.rpc("extend_linehaul_trip_arrival", {
    p_trip_id: tripId,
  });
  if (error) {
    const msg = error.message?.includes("already used")
      ? "You have already extended this trip's arrival time."
      : error.message?.includes("en-route")
        ? "Arrival extension is only available while the trip is en route."
        : error.message || "Failed to extend arrival time";
    return { error: msg };
  }
  if (!data) return { error: "Failed to extend arrival time" };
  return { trip: data as LinehaulTrip };
}

export async function transferLinehaulParcel(
  orderId: string,
  toConductorId: string
): Promise<{ ok: true } | { error: string }> {
  const { data, error } = await supabase.rpc("transfer_linehaul_parcel", {
    p_order_id: orderId,
    p_to_conductor_id: toConductorId,
  });
  if (error) return { error: error.message };
  if (!data) return { error: "Parcel transfer failed" };
  return { ok: true };
}

export async function declareIncompleteTripCoConductor(
  tripId: string,
  coConductorId: string
): Promise<{ trip: LinehaulTrip } | { error: string }> {
  const { data, error } = await supabase.rpc("declare_incomplete_trip_co_conductor", {
    p_trip_id: tripId,
    p_co_conductor_id: coConductorId,
  });
  if (error) return { error: error.message };
  if (!data) return { error: "Could not save co-conductor" };
  return { trip: data as LinehaulTrip };
}

export async function resolveIncompleteTripSolo(
  tripId: string
): Promise<{ trip: LinehaulTrip } | { error: string }> {
  const { data, error } = await supabase.rpc("resolve_incomplete_trip_solo", {
    p_trip_id: tripId,
  });
  if (error) return { error: error.message };
  if (!data) return { error: "Could not save response" };
  return { trip: data as LinehaulTrip };
}
