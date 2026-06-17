import AsyncStorage from "@react-native-async-storage/async-storage";

export type TrackingRole = "linehaul" | "lmp";

export type ActiveTrackingContext = {
  tripId?: string;
  orderId?: string;
  role: TrackingRole;
  corridorId?: string;
};

const ACTIVE_CTX_KEY = "active_tracking_context";

let activeContext: ActiveTrackingContext | null = null;

export function getActiveTrackingContext(): ActiveTrackingContext | null {
  return activeContext;
}

/** Used by background location task (may run when in-memory ctx was cleared). */
export async function loadActiveTrackingContext(): Promise<ActiveTrackingContext | null> {
  if (activeContext) return activeContext;
  const raw = await AsyncStorage.getItem(ACTIVE_CTX_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveTrackingContext;
  } catch {
    return null;
  }
}

export async function setActiveTrackingContext(ctx: ActiveTrackingContext): Promise<void> {
  activeContext = ctx;
  await AsyncStorage.setItem(ACTIVE_CTX_KEY, JSON.stringify(ctx));
}

export async function clearActiveTrackingContext(): Promise<void> {
  activeContext = null;
  await AsyncStorage.removeItem(ACTIVE_CTX_KEY);
}
