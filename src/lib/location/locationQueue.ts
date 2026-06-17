import AsyncStorage from "@react-native-async-storage/async-storage";

export const LOCATION_QUEUE_KEY = "location_queue";

export type QueuedLocationSample = {
  tripId?: string | null;
  orderId?: string | null;
  role: "linehaul" | "lmp";
  lat: number;
  lng: number;
  accuracyM?: number | null;
  recordedAt: string;
};

export async function readLocationQueue(): Promise<QueuedLocationSample[]> {
  const raw = await AsyncStorage.getItem(LOCATION_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as QueuedLocationSample[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function enqueueLocationSample(sample: QueuedLocationSample): Promise<void> {
  const queue = await readLocationQueue();
  queue.push(sample);
  await AsyncStorage.setItem(LOCATION_QUEUE_KEY, JSON.stringify(queue));
}

export async function clearLocationQueue(): Promise<void> {
  await AsyncStorage.removeItem(LOCATION_QUEUE_KEY);
}
