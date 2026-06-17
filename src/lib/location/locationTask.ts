import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { enqueueLocationSample } from "./locationQueue";
import { syncLocationQueue } from "./syncLocationSamples";
import { loadActiveTrackingContext } from "./activeTrackingContext";
import { LOCATION_TASK_NAME } from "./locationConstants";

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("LOCATION_TASK error:", error);
    return;
  }

  const ctx = await loadActiveTrackingContext();
  if (!ctx) return;

  const locations = (data as { locations?: Location.LocationObject[] })?.locations;
  if (!locations?.length) return;

  const latest = locations[locations.length - 1];
  await enqueueLocationSample({
    tripId: ctx.tripId ?? null,
    orderId: ctx.orderId ?? null,
    role: ctx.role,
    lat: latest.coords.latitude,
    lng: latest.coords.longitude,
    accuracyM: latest.coords.accuracy ?? null,
    recordedAt: new Date(latest.timestamp).toISOString(),
  });

  await syncLocationQueue();
});
