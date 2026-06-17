import { supabase } from "../lib/supabase";
import { Order } from "../lib/db/types";
import { LocationData } from "../types/location";

// Type aliases
type OrderStatus = Order["status"];

/* -----------------------------------------------------------
   CREATE ORDER (Customer)
----------------------------------------------------------- */
export async function createOrder(
  payload: Omit<Order, "id" | "created_at" | "status">
) {
  const { data, error } = await supabase
    .from("orders")
    .insert({ ...payload, status: "pending" as OrderStatus } as any)
    .select()
    .single();

  if (error) {
    console.error("createOrder:", error);
    return null;
  }

  return data;
}

/* -----------------------------------------------------------
   GET ALL ORDERS FOR CUSTOMER
----------------------------------------------------------- */
export async function fetchOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchOrders:", error);
    return [];
  }

  return data ?? [];
}

/* -----------------------------------------------------------
   OPERATOR: ORDERS VIA operator_order_view (v6 §14)
   The view is scoped server-side to rows where auth.uid() matches
   lmp_pickup_id, linehaul_id, or lmp_delivery_id. Rows exclude
   customer_id, price_estimate, razorpay ids, and legacy status.
----------------------------------------------------------- */
export async function fetchOperatorOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from("operator_order_view")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchOperatorOrders:", error);
    return [];
  }

  return (data ?? []) as Order[];
}

export async function getOperatorOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from("operator_order_view")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    console.error("getOperatorOrderById:", error);
    return null;
  }
  return (data as Order) ?? null;
}

/* -----------------------------------------------------------
   DRIVER: GET ALL ORDERS ASSIGNED TO A DRIVER (legacy driver_id)
----------------------------------------------------------- */
export async function fetchDriverOrders(driverId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchDriverOrders:", error);
    return [];
  }

  return data ?? [];
}

/* -----------------------------------------------------------
   UPDATE AN ORDER’S STATUS
----------------------------------------------------------- */
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order | null> {
  throw new Error(
    "updateOrderStatus is disabled. Custody state must be derived from custody events."
  );
}

/* -----------------------------------------------------------
   NEW REQUIRED BY YOUR UI: GET ORDER BY ID
----------------------------------------------------------- */
export async function getOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    console.error("getOrderById:", error);
    return null;
  }

  return data;
}

/* -----------------------------------------------------------
   DRIVER: ACCEPT ORDER
----------------------------------------------------------- */
export async function acceptOrder(orderId: string, driverId: string) {
    const { data, error } = await supabase
      .from("orders")
      .update({
        driver_id: driverId,
        status: "accepted" as OrderStatus,
      } as any)
      .eq("id", orderId)
      .eq("status", "pending") // avoid race conditions
      .select()
      .single();

  if (error) {
    console.error("acceptOrder:", error);
    return null;
  }

  return data;
}

/* -----------------------------------------------------------
   DRIVER: CANCEL / DECLINE ORDER
----------------------------------------------------------- */
export async function cancelOrder(orderId: string) {
    const { data, error } = await supabase
      .from("orders")
      .update({
        driver_id: null,
        status: "pending" as OrderStatus,
      } as any)
      .eq("id", orderId)
      .select()
      .single();

  if (error) {
    console.error("cancelOrder:", error);
    return null;
  }

  return data;
}

/* -----------------------------------------------------------
   DRIVER: GET ACTIVE ORDER (in-progress)
----------------------------------------------------------- */
export async function getDriverActiveOrder(
  driverId: string
): Promise<Order | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("driver_id", driverId)
    .in("status", ["accepted", "picked_up", "in_transit"])
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (error) {
    console.error("getDriverActiveOrder:", error);
    return null;
  }

  return data;
}

/* -----------------------------------------------------------
   LINEHAUL: available parcel pool (v6 — corridor-matched, RLS-safe RPC)
----------------------------------------------------------- */
export type AvailableParcelRow = {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  weight_kg?: number | null;
  corridor_key?: string | null;
  created_at: string;
};

export async function fetchAvailableParcelsForLinehaul(): Promise<AvailableParcelRow[]> {
  const { data, error } = await supabase.rpc("list_available_parcels_for_linehaul");
  if (error) {
    console.error("fetchAvailableParcelsForLinehaul:", error);
    return [];
  }
  return (data ?? []) as AvailableParcelRow[];
}

/* -----------------------------------------------------------
   GET AVAILABLE ORDERS (legacy driver_id pool — LMP / old flow)
----------------------------------------------------------- */
export async function getAvailableOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .is("driver_id", null)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAvailableOrders:", error);
    return [];
  }

  return data ?? [];
}

/* -----------------------------------------------------------
   PRICE ESTIMATE (simple fallback)
   — You can later replace this with a Supabase RPC or Mapbox routing
----------------------------------------------------------- */
export function calculatePriceEstimate(
  pickup: LocationData,
  dropoff: LocationData
): number {
  if (!pickup || !dropoff) return 0;

  const R = 6371; // km
  const dLat = ((dropoff.lat - pickup.lat) * Math.PI) / 180;
  const dLng = ((dropoff.lng - pickup.lng) * Math.PI) / 180;
  const lat1 = (pickup.lat * Math.PI) / 180;
  const lat2 = (dropoff.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distanceKm = R * c;

  // basic formula — refine later
  return Math.round(40 + distanceKm * 6);
}

/* -----------------------------------------------------------
   FIND NEARBY ORDERS (MVP: returns all available orders)
   TODO: Add pickup_lat, pickup_lng to orders table and implement PostGIS filtering
----------------------------------------------------------- */
export async function findNearbyOrders(
  lat: number,
  lng: number,
  radiusKm: number = 25
): Promise<Order[]> {
  // Step 1: Get pending orders
  const available = await getAvailableOrders();
  if (!available.length) return [];

  // Step 2: For MVP, return all available orders
  // Schema doesn't have pickup_lat/lng fields yet
  // TODO: Add pickup_lat, pickup_lng, dropoff_lat, dropoff_lng to orders table for proper spatial filtering
  
  return available;
}
