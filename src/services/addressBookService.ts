import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { SavedAddress } from "../lib/db/types";
import { LocationData } from "../types/location";

export const ADDRESS_LABEL_PRESETS = ["Home", "Work", "Other"] as const;
export const ADDRESS_SOFT_LIMIT = 5;
export const ADDRESS_HARD_LIMIT = 10;

const EXTENDED_STORAGE_PREFIX = "patwadi_address_book_extended:";

export function savedAddressToLocationData(row: SavedAddress): LocationData {
  return {
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    placeId: row.place_id ?? undefined,
    placeName: row.place_name ?? undefined,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    country: row.country ?? undefined,
    phoneNumber: row.phone_number ?? undefined,
    whatsappNotifications: row.whatsapp_notifications ?? undefined,
    street: row.street ?? undefined,
    apartmentBuilding: row.apartment_building ?? undefined,
    landmark: row.landmark ?? undefined,
    deliveryInstructions: row.delivery_instructions ?? undefined,
    shouldCallForInstructions: row.should_call_for_instructions ?? undefined,
  };
}

export function locationDataToSavedAddressRow(
  userId: string,
  label: string,
  location: LocationData
): Omit<SavedAddress, "id" | "created_at" | "updated_at"> {
  return {
    user_id: userId,
    label: label.trim(),
    address: location.address,
    lat: location.lat,
    lng: location.lng,
    place_id: location.placeId ?? null,
    place_name: location.placeName ?? null,
    city: location.city ?? null,
    state: location.state ?? null,
    country: location.country ?? null,
    phone_number: location.phoneNumber ?? null,
    whatsapp_notifications: location.whatsappNotifications ?? true,
    street: location.street ?? null,
    apartment_building: location.apartmentBuilding ?? null,
    landmark: location.landmark ?? null,
    delivery_instructions: location.deliveryInstructions ?? null,
    should_call_for_instructions: location.shouldCallForInstructions ?? false,
  };
}

export async function isAddressBookExtended(userId: string): Promise<boolean> {
  const value = await AsyncStorage.getItem(`${EXTENDED_STORAGE_PREFIX}${userId}`);
  return value === "1";
}

export async function extendAddressBookLimit(userId: string): Promise<void> {
  await AsyncStorage.setItem(`${EXTENDED_STORAGE_PREFIX}${userId}`, "1");
}

export function addressBookLimitLabel(count: number, extended: boolean): string {
  const max = extended ? ADDRESS_HARD_LIMIT : ADDRESS_SOFT_LIMIT;
  return `${count} of ${max} saved`;
}

export async function fetchSavedAddresses(userId: string): Promise<SavedAddress[]> {
  const { data, error } = await supabase
    .from("saved_addresses")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("fetchSavedAddresses:", error);
    return [];
  }
  return (data ?? []) as SavedAddress[];
}

export type SaveAddressResult =
  | { ok: true; address: SavedAddress }
  | {
      ok: false;
      error: string;
      code?: "empty_label" | "hard_limit" | "confirm_extend" | "db_error";
    };

async function upsertAddressRow(
  userId: string,
  label: string,
  location: LocationData
): Promise<SaveAddressResult> {
  const row = locationDataToSavedAddressRow(userId, label, location);
  const { data, error } = await supabase
    .from("saved_addresses")
    .upsert(row, { onConflict: "user_id,label" })
    .select()
    .single();

  if (error) {
    console.error("saveAddressToBook:", error);
    return { ok: false, error: error.message, code: "db_error" };
  }
  return { ok: true, address: data as SavedAddress };
}

/** Upsert by (user_id, label). Enforces 5 default / 10 extended for new labels. */
export async function saveAddressToBook(
  userId: string,
  label: string,
  location: LocationData
): Promise<SaveAddressResult> {
  const trimmed = label.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter a name for this address", code: "empty_label" };
  }

  const existing = await fetchSavedAddresses(userId);
  const isUpdate = existing.some(
    (row) => row.label.toLowerCase() === trimmed.toLowerCase()
  );

  if (!isUpdate) {
    const extended = await isAddressBookExtended(userId);
    const max = extended ? ADDRESS_HARD_LIMIT : ADDRESS_SOFT_LIMIT;

    if (existing.length >= ADDRESS_HARD_LIMIT) {
      return {
        ok: false,
        error: `You can save up to ${ADDRESS_HARD_LIMIT} addresses. Remove one in Address book to add another.`,
        code: "hard_limit",
      };
    }

    if (existing.length >= ADDRESS_SOFT_LIMIT && !extended) {
      return {
        ok: false,
        error: "Confirm saving more addresses",
        code: "confirm_extend",
      };
    }

    if (existing.length >= max) {
      return {
        ok: false,
        error: `You can save up to ${max} addresses.`,
        code: "hard_limit",
      };
    }
  }

  return upsertAddressRow(userId, trimmed, location);
}

function confirmExtendAddressBook(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      "Save more addresses?",
      `You already have ${ADDRESS_SOFT_LIMIT} saved addresses. You can save up to ${ADDRESS_HARD_LIMIT} total. Add more now?`,
      [
        { text: "Not now", style: "cancel", onPress: () => resolve(false) },
        { text: "Save more", onPress: () => resolve(true) },
      ]
    );
  });
}

/** Saves with limit checks; prompts once to extend from 5 → 10 addresses. */
export async function saveAddressToBookWithPrompt(
  userId: string,
  label: string,
  location: LocationData
): Promise<SaveAddressResult> {
  let result = await saveAddressToBook(userId, label, location);
  if (!result.ok && result.code === "confirm_extend") {
    const confirmed = await confirmExtendAddressBook();
    if (!confirmed) {
      return { ok: false, error: "Address not saved", code: "confirm_extend" };
    }
    await extendAddressBookLimit(userId);
    result = await saveAddressToBook(userId, label, location);
  }
  if (!result.ok && result.code === "hard_limit") {
    Alert.alert("Address limit reached", result.error);
  }
  return result;
}

export async function deleteSavedAddress(id: string): Promise<boolean> {
  const { error } = await supabase.from("saved_addresses").delete().eq("id", id);
  if (error) {
    console.error("deleteSavedAddress:", error);
    return false;
  }
  return true;
}

export async function renameSavedAddress(id: string, label: string): Promise<boolean> {
  const trimmed = label.trim();
  if (!trimmed) return false;

  const { error } = await supabase
    .from("saved_addresses")
    .update({ label: trimmed })
    .eq("id", id);

  if (error) {
    console.error("renameSavedAddress:", error);
    return false;
  }
  return true;
}
