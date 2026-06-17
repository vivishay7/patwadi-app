import RazorpayCheckout from "react-native-razorpay";
import { supabase } from "../lib/supabase";

export async function createRazorpayOrder(params: {
  amountInPaise: number;
  currency?: string;
  corridorKey: string;
  pickup_location: string;
  dropoff_location: string;
  weight_kg?: number;
  dimensions?: { length: number; width: number; height: number };
  contents?: string;
  price_estimate?: number;
}): Promise<{ razorpayOrderId: string } | { error: string }> {
  const { amountInPaise, currency = "INR" } = params;
  const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
    body: { ...params, amountInPaise, currency },
  });

  if (error) return { error: error.message };
  if (!data?.razorpayOrderId) return { error: data?.error || "Failed to create payment order" };
  return { razorpayOrderId: data.razorpayOrderId as string };
}

export async function openRazorpayCheckout(params: {
  keyId: string;
  amountInPaise: number;
  currency?: string;
  name: string;
  description: string;
  orderId: string;
  prefillContact?: string;
}): Promise<
  | { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }
  | { error: string }
> {
  const {
    keyId,
    amountInPaise,
    currency = "INR",
    name,
    description,
    orderId,
    prefillContact,
  } = params;

  try {
    const res = await RazorpayCheckout.open({
      key: keyId,
      amount: String(amountInPaise),
      currency,
      name,
      description,
      order_id: orderId,
      prefill: prefillContact ? { contact: prefillContact } : undefined,
      theme: { color: "#1F6FEB" },
    });

    return res as any;
  } catch (e: any) {
    return { error: e?.description || e?.message || "Payment cancelled/failed" };
  }
}

export async function verifyRazorpayPayment(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{ ok: true; parcelId: string } | { error: string }> {
  const { data, error } = await supabase.functions.invoke("verify-razorpay-payment", {
    body: params,
  });
  if (error) return { error: error.message };
  if (!data?.ok) return { error: data?.error || "Payment verification failed" };
  if (!data?.parcelId) return { error: "Verified but parcel was not created" };
  return { ok: true, parcelId: data.parcelId as string };
}

/** Dev builds only — creates a confirmed order without opening Razorpay. */
export async function skipDevPayment(params: {
  corridorKey: string;
  pickup_location: string;
  dropoff_location: string;
  weight_kg?: number;
  dimensions?: { length: number; width: number; height: number };
  contents?: string;
  price_estimate?: number;
}): Promise<{ ok: true; parcelId: string } | { error: string }> {
  const { data, error } = await supabase.functions.invoke("skip-dev-payment", {
    body: params,
  });
  if (error) return { error: error.message };
  if (!data?.ok) return { error: data?.error || "Dev skip failed" };
  if (!data?.parcelId) return { error: "Dev skip succeeded but parcel was not created" };
  return { ok: true, parcelId: data.parcelId as string };
}

