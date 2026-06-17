import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import NetInfo from "@react-native-community/netinfo";
import { supabase } from "../supabase";
import { fetchCorridorByKey } from "../domain/corridors";
import { haversineKm } from "../geo/haversineKm";
import { captureCurrentLocation } from "./captureCurrentLocation";
import { LOCATION_TASK_NAME } from "./locationConstants";
import { enqueueLocationSample } from "./locationQueue";
import { syncLocationQueue } from "./syncLocationSamples";
import {
  clearActiveTrackingContext,
  getActiveTrackingContext,
  setActiveTrackingContext,
  type ActiveTrackingContext,
  type TrackingRole,
} from "./activeTrackingContext";

export type { ActiveTrackingContext, TrackingRole };
let netInfoUnsubscribe: (() => void) | null = null;

const NEAR_DESTINATION_KM = 15;
const TRACKING_INTERVAL_MS = 60_000;

export { getActiveTrackingContext };

async function ensureLocationPermissions(): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") {
    console.warn("startTripTracking: foreground location permission denied");
    return false;
  }

  try {
    const bg = await Location.getBackgroundPermissionsAsync();
    if (bg.status !== "granted") {
      const bgReq = await Location.requestBackgroundPermissionsAsync();
      if (bgReq.status !== "granted") {
        console.warn(
          "startTripTracking: background location not granted — periodic samples may be limited"
        );
      }
    }
  } catch (e) {
    // Dev builds without ACCESS_BACKGROUND_LOCATION in AndroidManifest still get foreground tracking.
    console.warn("startTripTracking: background permission unavailable", e);
  }
  return true;
}

function ensureNetInfoListener() {
  if (netInfoUnsubscribe) return;
  netInfoUnsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      syncLocationQueue().catch((e) => console.error("NetInfo sync:", e));
    }
  });
}

export async function startTripTracking(ctx: ActiveTrackingContext): Promise<void> {
  const current = getActiveTrackingContext();
  const same =
    current?.tripId === ctx.tripId &&
    current?.orderId === ctx.orderId &&
    current?.role === ctx.role;
  if (same) return;

  await stopTripTracking();

  const permitted = await ensureLocationPermissions();
  if (!permitted) return;

  const hasTask = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
  if (!hasTask) {
    console.warn("startTripTracking: location task not defined");
    return;
  }

  // Persist before starting updates so the background task can read context immediately.
  await setActiveTrackingContext(ctx);
  ensureNetInfoListener();

  try {
    const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (!started) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: TRACKING_INTERVAL_MS,
        distanceInterval: 0,
        pausesUpdatesAutomatically: false,
        foregroundService: {
          notificationTitle: "Patwadi — trip tracking active",
          notificationBody: "Location tracking is active for your trip",
        },
      });
      console.log("startTripTracking: location updates started for", ctx.tripId ?? ctx.orderId);
    }
  } catch (e) {
    console.warn("startTripTracking: startLocationUpdatesAsync failed", e);
    await clearActiveTrackingContext();
    return;
  }

  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await enqueueLocationSample({
      tripId: ctx.tripId ?? null,
      orderId: ctx.orderId ?? null,
      role: ctx.role,
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracyM: pos.coords.accuracy ?? null,
      recordedAt: new Date(pos.timestamp).toISOString(),
    });
    const sync = await syncLocationQueue();
    console.log("startTripTracking: bootstrap sample synced", sync);
  } catch (e) {
    console.warn("startTripTracking: bootstrap sample failed", e);
  }
}

export async function stopTripTracking(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (started) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
  await clearActiveTrackingContext();
  await syncLocationQueue();
}

/** §19.2 — reconcile tracking windows from DB state for the signed-in operator. */
export async function refreshTrackingWindows(params: {
  userId: string;
  role: "linehaul" | "lmp" | null;
}): Promise<void> {
  const { userId, role } = params;
  if (!role || (role !== "linehaul" && role !== "lmp")) {
    await stopTripTracking();
    return;
  }

  if (role === "linehaul") {
    const { data: memberRows } = await supabase
      .from("linehaul_trip_conductors")
      .select("trip_id")
      .eq("conductor_id", userId)
      .is("active_until", null);

    const memberTripIds = (memberRows ?? []).map((r) => r.trip_id);
    if (memberTripIds.length) {
      const { data: activeTrips } = await supabase
        .from("linehaul_trips")
        .select("id, corridor_id, status")
        .in("id", memberTripIds)
        .in("status", ["open", "closed"])
        .order("scheduled_departure_at", { ascending: false })
        .limit(1);

      const trip = activeTrips?.[0];
      if (trip) {
        await startTripTracking({
          tripId: trip.id,
          role: "linehaul",
          corridorId: trip.corridor_id,
        });
        return;
      }
    }

    await stopTripTracking();
    return;
  }

  // LMP — track first active assignment
  const { data: orders } = await supabase.from("operator_order_view").select("id").limit(1);

  const orderId = orders?.[0]?.id;
  if (!orderId) {
    await stopTripTracking();
    return;
  }

  await startTripTracking({ orderId, role: "lmp" });
}

/** After custody ack — stop linehaul tracking if at corridor destination (§19.2). */
export async function evaluateTrackingStopAfterHandoff(params: {
  step: string;
  parcelId: string;
  userId: string;
  role: TrackingRole | null;
}): Promise<void> {
  const { step, userId, role } = params;
  const ctx = getActiveTrackingContext();
  if (!ctx) return;

  if (role === "lmp") {
    if (step === "customer_to_lmp" || step === "lmp_to_customer") {
      await stopTripTracking();
    }
    return;
  }

  if (role !== "linehaul") return;
  if (step !== "lmp_to_linehaul" && step !== "linehaul_to_lmp") return;

  const loc = await captureCurrentLocation();
  if (!loc.ok || !loc.location) return;

  const { data: order } = await supabase
    .from("orders")
    .select("corridor_key, trip_id")
    .eq("id", params.parcelId)
    .maybeSingle();

  const corridorKey = order?.corridor_key;
  if (!corridorKey) return;

  const corridor = await fetchCorridorByKey(corridorKey);
  if (!corridor) return;

  const dest = corridor.destination;
  const dist = haversineKm(
    loc.location.lat,
    loc.location.lng,
    dest.lat,
    dest.lng
  );

  if (dist < NEAR_DESTINATION_KM) {
    await stopTripTracking();
  }
}
