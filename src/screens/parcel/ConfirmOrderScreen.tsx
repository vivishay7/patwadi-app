import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import Constants from "expo-constants";
import { useAuth } from "../../context/AuthContext";
import { savePendingCheckout } from "../../lib/checkout/pendingCheckout";
import { LoadingButton } from "../../components/LoadingButton";
import {
  createRazorpayOrder,
  openRazorpayCheckout,
  verifyRazorpayPayment,
  skipDevPayment,
} from "../../services/paymentService";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ConfirmOrder">;
type RouteProps = RouteProp<RootStackParamList, "ConfirmOrder">;

export default function ConfirmOrderScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const pickup = route.params?.pickup;
  const dropoff = route.params?.dropoff;
  const packageInfo = route.params?.packageInfo;
  const priceEstimate = route.params?.priceEstimate;
  const corridorKey = route.params?.corridorKey;

  const weight = packageInfo?.weight;
  const dimensions = packageInfo?.dimensions;
  const contents = packageInfo?.contents;
  const packagingCharge = packageInfo?.packagingCharge || 0;
  const discount = packageInfo?.discount || 0;
  const priorityLabel =
    packageInfo?.priority === "24hrs"
      ? "Next corridor slot"
      : packageInfo?.priority === "48hrs"
        ? "Scheduled intercity"
        : "Standard corridor";
  const preferredSlot = packageInfo?.preferredSlot;

  const checkoutParams = {
    pickup,
    dropoff,
    packageInfo,
    priceEstimate,
    corridorKey,
  };

  const summary = {
    pickup: pickup
      ? `Pickup: ${pickup.address}${pickup.apartmentBuilding ? `, ${pickup.apartmentBuilding}` : ""}`
      : "Pickup: Not selected",
    dropoff: dropoff
      ? `Dropoff: ${dropoff.address}${dropoff.apartmentBuilding ? `, ${dropoff.apartmentBuilding}` : ""}`
      : "Dropoff: Not selected",
    parcel: weight
      ? `Parcel: ${contents || "Items"} • ${weight}kg`
      : `Parcel: ${contents || "Items"}`,
    price: priceEstimate ? `Estimated: ₹${priceEstimate}` : "Price: Calculating...",
  };

  const finishOrder = (parcelId?: string) => {
    if (parcelId) {
      navigation.reset({
        index: 1,
        routes: [
          { name: "Main", params: { screen: "Packages" } },
          { name: "TrackingDetails", params: { orderId: parcelId } },
        ],
      });
      return;
    }
    navigation.reset({
      index: 0,
      routes: [{ name: "Main", params: { screen: "Packages" } }],
    });
  };

  const startGuestAccountFlow = async (mode: "signup" | "signin") => {
    if (!pickup || !dropoff) return;
    await savePendingCheckout(checkoutParams);
    navigation.navigate("Login", { mode, resumeCheckout: true });
  };

  const handleDevSkipPayment = async () => {
    if (!pickup || !dropoff || !corridorKey || !user?.id) return;

    setLoading(true);
    try {
      const result = await skipDevPayment({
        corridorKey,
        pickup_location: pickup.address,
        dropoff_location: dropoff.address,
        weight_kg: weight ? Number(weight) : undefined,
        dimensions: dimensions || undefined,
        contents: contents || undefined,
        price_estimate: priceEstimate || undefined,
      });
      if ("error" in result) {
        Alert.alert("Dev skip failed", result.error);
        return;
      }
      finishOrder(result.parcelId);
    } catch (error) {
      console.error("Dev skip payment error:", error);
      Alert.alert("Error", "Failed to create dev order.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!pickup || !dropoff) {
      Alert.alert("Error", "Please select pickup and dropoff locations");
      return;
    }

    if (!user?.id) {
      await startGuestAccountFlow("signup");
      return;
    }
    if (!corridorKey) {
      Alert.alert("Corridor not supported", "We're not live on this corridor yet.");
      return;
    }

    const razorpayKeyId = (Constants.expoConfig?.extra as any)?.razorpayKeyId as string | undefined;
    if (!razorpayKeyId) {
      Alert.alert("Payment not configured", "Missing EXPO_PUBLIC_RAZORPAY_KEY_ID.");
      return;
    }

    setLoading(true);

    try {
      const amountInPaise = Math.round((priceEstimate || 0) * 100);
      if (!amountInPaise || amountInPaise < 100) {
        Alert.alert("Invalid amount", "Unable to start payment for this amount.");
        return;
      }

      const rpOrder = await createRazorpayOrder({
        amountInPaise,
        corridorKey,
        pickup_location: pickup.address,
        dropoff_location: dropoff.address,
        weight_kg: weight ? Number(weight) : undefined,
        dimensions: dimensions || undefined,
        contents: contents || undefined,
        price_estimate: priceEstimate || undefined,
      });
      if ("error" in rpOrder) {
        Alert.alert("Payment error", rpOrder.error);
        return;
      }

      const checkout = await openRazorpayCheckout({
        keyId: razorpayKeyId,
        amountInPaise,
        name: "Patwadi",
        description: `Patwadi parcel (${corridorKey})`,
        orderId: rpOrder.razorpayOrderId,
        prefillContact: user.phone || undefined,
      });
      if ("error" in checkout) {
        Alert.alert("Payment not completed", checkout.error);
        return;
      }

      const verified = await verifyRazorpayPayment({
        razorpay_order_id: checkout.razorpay_order_id,
        razorpay_payment_id: checkout.razorpay_payment_id,
        razorpay_signature: checkout.razorpay_signature,
      });
      if ("error" in verified) {
        Alert.alert("Verification failed", verified.error);
        return;
      }

      finishOrder(verified.parcelId);
    } catch (error) {
      console.error("Create order error:", error);
      Alert.alert("Error", "Failed to create order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isGuest = !user?.id;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Confirm Order</Text>
        <Text style={styles.subtitle}>
          Review your details before confirming your order.
        </Text>

        <View style={styles.progress}>
          <View style={styles.progressDot} />
          <View style={styles.progressLine} />
          <View style={styles.progressDot} />
          <View style={styles.progressLine} />
          <View style={styles.progressDot} />
          <View style={styles.progressLine} />
          <View style={styles.progressDot} />
          <View style={styles.progressLine} />
          <View style={[styles.progressDot, styles.progressActive]} />
        </View>
        <Text style={styles.stepLabel}>Step 5 of 5</Text>

        {isGuest ? (
          <View style={styles.guestBanner}>
            <Text style={styles.guestBannerTitle}>Almost done!</Text>
            <Text style={styles.guestBannerText}>
              Create a free account to pay and track this parcel. Your pickup, dropoff, and parcel
              details are saved — you will not need to enter them again.
            </Text>
            <Text style={styles.guestBannerHint}>
              Your pickup contact number stays on the order only; it is not used as your login
              number unless you choose it at sign-up.
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.line}>{summary.pickup}</Text>
          {pickup?.deliveryInstructions ? (
            <Text style={styles.hint}>Instructions: {pickup.deliveryInstructions}</Text>
          ) : null}
          <Text style={styles.line}>{summary.dropoff}</Text>
          {dropoff?.deliveryInstructions ? (
            <Text style={styles.hint}>Instructions: {dropoff.deliveryInstructions}</Text>
          ) : null}
          <Text style={styles.line}>{summary.parcel}</Text>
          {packagingCharge > 0 ? (
            <Text style={styles.line}>Packaging: ₹{packagingCharge}</Text>
          ) : null}
          {discount > 0 ? (
            <Text style={[styles.line, styles.discountLine]}>Discount: -₹{discount}</Text>
          ) : null}
          <Text style={styles.line}>Priority: {priorityLabel}</Text>
          {preferredSlot ? (
            <Text style={styles.line}>Preferred Slot: {preferredSlot}</Text>
          ) : null}
          <Text style={styles.line}>Door-to-Door Delivery</Text>
          <Text style={[styles.line, styles.priceLine]}>{summary.price}</Text>
        </View>

        {isGuest ? (
          <>
            <LoadingButton
              title="Create account & checkout"
              onPress={() => void startGuestAccountFlow("signup")}
              style={styles.primaryBtn}
            />
            <TouchableOpacity
              style={styles.signInLink}
              onPress={() => void startGuestAccountFlow("signin")}
            >
              <Text style={styles.signInLinkText}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          </>
        ) : (
          <LoadingButton
            title="Confirm & pay"
            isLoading={loading}
            onPress={handleConfirm}
            disabled={!pickup || !dropoff}
            style={styles.primaryBtn}
          />
        )}

        {__DEV__ && !isGuest ? (
          <TouchableOpacity
            style={[styles.devSkipBtn, loading && styles.btnDisabled]}
            onPress={handleDevSkipPayment}
            activeOpacity={0.8}
            disabled={loading || !pickup || !dropoff || !corridorKey}
          >
            <Text style={styles.devSkipText}>Skip payment (dev only)</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.xl },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.md },
  progress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.borderLight,
  },
  progressActive: { backgroundColor: colors.primary },
  progressLine: {
    width: 30,
    height: 2,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.xs,
  },
  stepLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  guestBanner: {
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  guestBannerTitle: {
    ...typography.body,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  guestBannerText: { ...typography.bodySmall, color: colors.textPrimary, marginBottom: spacing.sm },
  guestBannerHint: { ...typography.caption, color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xl,
  },
  line: { ...typography.body, color: colors.textPrimary, marginBottom: spacing.sm },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.md,
    marginBottom: spacing.xs,
  },
  discountLine: { color: colors.success, fontWeight: "600" },
  priceLine: { fontWeight: "700", marginTop: spacing.sm, marginBottom: 0 },
  primaryBtn: { marginTop: spacing.xxl },
  signInLink: { marginTop: spacing.lg, alignItems: "center" },
  signInLinkText: { ...typography.body, color: colors.primary, fontWeight: "600" },
  btnDisabled: { opacity: 0.6 },
  devSkipBtn: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.warning,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  devSkipText: { ...typography.button, color: colors.warning, fontSize: 14 },
  backBtn: { marginTop: spacing.lg, alignItems: "center" },
  backText: { ...typography.body, color: colors.textSecondary },
});
