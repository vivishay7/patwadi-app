import { supabase } from "../lib/supabase";
import { deriveParcelState } from "../lib/deriveParcelState";
import { CustodyEvent, Order, ParcelRecovery, LinehaulTrip, LinehaulTripTransferRequest } from "../lib/db/types";
import { fetchCustodyEvents } from "./custodyService";
import {
  buildCorridorKey,
  fetchCorridors,
  type CorridorDefinition,
} from "../lib/domain/corridors";

export interface AdminOverview {
  totalParcels: number;
  blockedExceptions: number;
  paymentPending: number;
  paymentConfirmed: number;
  paymentFailed: number;
  byDerivedState: Record<string, number>;
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const { data: orders } = await supabase.from("orders").select("*");
  const rows = (orders || []) as Order[];
  const byDerivedState: Record<string, number> = {};

  for (const o of rows) {
    const { data: events } = await supabase
      .from("custody_events")
      .select("*")
      .eq("parcel_id", o.id)
      .order("created_at", { ascending: true });
    const st = deriveParcelState({
      events: (events || []) as CustodyEvent[],
      blockedException: (o as any).blocked_exception,
    });
    byDerivedState[st] = (byDerivedState[st] || 0) + 1;
  }

  return {
    totalParcels: rows.length,
    blockedExceptions: rows.filter((o) => (o as any).blocked_exception).length,
    paymentPending: rows.filter((o) => o.payment_status === "pending").length,
    paymentConfirmed: rows.filter((o) => o.payment_status === "confirmed").length,
    paymentFailed: rows.filter((o) => o.payment_status === "failed").length,
    byDerivedState,
  };
}

export async function fetchAdminParcels(filters?: {
  corridorKey?: string;
  paymentStatus?: "pending" | "confirmed" | "failed";
  blockedOnly?: boolean;
}) {
  let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (filters?.corridorKey) q = q.eq("corridor_key", filters.corridorKey);
  if (filters?.paymentStatus) q = q.eq("payment_status", filters.paymentStatus);
  if (filters?.blockedOnly) q = q.eq("blocked_exception", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as Order[];
}

export async function fetchAdminParcelDetails(orderId: string) {
  const { data: order, error } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (error) throw error;
  const events = await fetchCustodyEvents(orderId);
  const { data: codes } = await supabase
    .from("handoff_codes")
    .select("*")
    .eq("parcel_id", orderId)
    .order("created_at", { ascending: false });
  return {
    order: order as Order,
    events: (events || []) as CustodyEvent[],
    codes: codes || [],
  };
}

export async function adminResolveBlocked(params: { parcelId: string; unblock: boolean; reason?: string }) {
  const { data, error } = await supabase.functions.invoke("admin-resolve-blocked", { body: params });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Failed to resolve blocked parcel");
  return data;
}

/** v6 §7 — rescind one parcel from a trip (auto reassign vs exception). */
export async function adminRescindParcel(params: {
  tripId: string;
  parcelId: string;
  reason?: string;
}) {
  const { data, error } = await supabase.functions.invoke("admin-trip-override", {
    body: { action: "rescind_parcel", ...params },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Failed to rescind parcel");
  return data as { ok: true; action: "reassign" | "exception"; recovery?: ParcelRecovery };
}

/** v6 §7 — cancel trip: cascade reassign/exception per parcel, then status -> cancelled. */
export async function adminCancelTrip(params: { tripId: string; reason?: string }) {
  const { data, error } = await supabase.functions.invoke("admin-trip-override", {
    body: { action: "cancel_trip", ...params },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Failed to cancel trip");
  return data as {
    ok: true;
    action: "cancel_trip";
    outcomes: Array<{ parcelId: string; action: string }>;
  };
}

/** v6 §13.5 — attach recovered parcel to a new trip. */
export async function adminReassignRecovery(params: {
  parcelId: string;
  newTripId: string;
}) {
  const { data, error } = await supabase.functions.invoke("admin-recovery", {
    body: { action: "reassign_to_trip", ...params },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Failed to reassign recovery");
  return data as { ok: true; recovery: ParcelRecovery };
}

export async function fetchActiveRecoveries(): Promise<ParcelRecovery[]> {
  const { data, error } = await supabase
    .from("parcel_recoveries")
    .select("*")
    .in("status", ["open", "in_progress"])
    .order("opened_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ParcelRecovery[];
}

export async function fetchFlaggedTransfers(): Promise<LinehaulTripTransferRequest[]> {
  const { data, error } = await supabase
    .from("linehaul_trip_transfer_requests")
    .select("*")
    .eq("admin_review_required", true)
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LinehaulTripTransferRequest[];
}

export async function fetchAdminTrips(): Promise<LinehaulTrip[]> {
  const { data, error } = await supabase
    .from("linehaul_trips")
    .select("*")
    .order("scheduled_departure_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LinehaulTrip[];
}

/** Open/draft trips eligible for recovery reassignment. */
export async function fetchOpenTripsForRecovery(): Promise<LinehaulTrip[]> {
  const { data, error } = await supabase
    .from("linehaul_trips")
    .select("*")
    .in("status", ["draft", "open", "closed"])
    .order("scheduled_departure_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LinehaulTrip[];
}

export async function fetchAdminTripParcels(tripId: string): Promise<Partial<Order>[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, pickup_location, dropoff_location, corridor_key, payment_status, trip_id")
    .eq("trip_id", tripId);
  if (error) throw error;
  return data ?? [];
}

export async function adminMarkUnrecoverable(params: {
  parcelId: string;
  resolutionNotes?: string;
}) {
  const { data, error } = await supabase.functions.invoke("admin-recovery", {
    body: { action: "mark_unrecoverable", ...params },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Failed to mark unrecoverable");
  return data as { ok: true; recovery: ParcelRecovery };
}

export async function adminApproveExtraTrip(params: { tripId: string }) {
  const { data, error } = await supabase.functions.invoke("admin-trip-override", {
    body: { action: "approve_extra_trip", tripId: params.tripId },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Failed to approve extra trip");
  return data as { ok: true; action: "approve_extra_trip"; trip: LinehaulTrip };
}

/** v6 §18 — admin corridor management (all rows, including inactive). */
export async function fetchAdminCorridors(): Promise<CorridorDefinition[]> {
  return fetchCorridors();
}

export async function adminSetCorridorActive(key: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from("corridors")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) throw error;
}

export async function adminCreateCorridor(params: {
  originCity: string;
  originLat: number;
  originLng: number;
  destinationCity: string;
  destinationLat: number;
  destinationLng: number;
  expectedDurationHours: number;
}): Promise<CorridorDefinition> {
  const key = buildCorridorKey(params.originCity, params.destinationCity);
  const { data, error } = await supabase
    .from("corridors")
    .insert({
      key,
      origin_city: params.originCity,
      origin_lat: params.originLat,
      origin_lng: params.originLng,
      destination_city: params.destinationCity,
      destination_lat: params.destinationLat,
      destination_lng: params.destinationLng,
      expected_duration_hours: params.expectedDurationHours,
      active: true,
    })
    .select("*")
    .single();
  if (error) throw error;
  const row = data as {
    key: string;
    origin_city: string;
    origin_lat: number;
    origin_lng: number;
    destination_city: string;
    destination_lat: number;
    destination_lng: number;
    expected_duration_hours: number;
    active: boolean;
  };
  return {
    key: row.key,
    origin: { city: row.origin_city, lat: row.origin_lat, lng: row.origin_lng },
    destination: {
      city: row.destination_city,
      lat: row.destination_lat,
      lng: row.destination_lng,
    },
    expected_duration_hours: Number(row.expected_duration_hours),
    active: row.active,
  };
}

