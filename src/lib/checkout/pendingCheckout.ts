import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RootStackParamList } from "../../navigation/RootNavigator";

const STORAGE_KEY = "patwadi_pending_checkout";

export type PendingCheckoutParams = NonNullable<RootStackParamList["ConfirmOrder"]>;

export async function savePendingCheckout(params: PendingCheckoutParams): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(params));
}

export async function getPendingCheckout(): Promise<PendingCheckoutParams | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingCheckoutParams;
  } catch {
    return null;
  }
}

export async function clearPendingCheckout(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function hasPendingCheckout(): Promise<boolean> {
  const pending = await getPendingCheckout();
  return pending != null;
}
