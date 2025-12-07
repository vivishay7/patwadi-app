/**
 * ConfirmOrderScreen
 * Final confirmation before creating an order
 */

import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CommonActions } from "@react-navigation/native";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { HomeStackParamList } from "../../navigation/HomeStack";
import { createOrder } from "../../services/orderService";
import { useAuth } from "../../context/AuthContext";

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, "ConfirmOrder">;
type RouteProps = RouteProp<HomeStackParamList, "ConfirmOrder">;

export default function ConfirmOrderScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const { pickup, dropoff, weight, contents, priceEstimate } = route.params || {};

  const handleConfirm = async () => {
    if (!user?.id || !pickup || !dropoff) {
      Alert.alert("Error", "Missing required data. Please try again.");
      return;
    }

    setLoading(true);

    try {
      const result = await createOrder(user.id, {
        pickup,
        dropoff,
        weightKg: weight || 0,
        contents: contents || "",
        priceEstimate,
      });

      if (result.error) {
        Alert.alert("Error", result.error);
        setLoading(false);
        return;
      }

      // Order created successfully
      Alert.alert(
        "Order Created!",
        "Your parcel has been booked. We'll notify you when a driver accepts it.",
        [
          {
            text: "View Order",
            onPress: () => {
              // Navigate to Packages tab
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    {
                      name: "HomeMain",
                    },
                  ],
                })
              );
              // @ts-ignore - Navigate to parent tab
              navigation.getParent()?.navigate("Packages");
            },
          },
          {
            text: "OK",
            onPress: () => navigation.navigate("HomeMain"),
          },
        ]
      );
    } catch (error) {
      console.error("Create order error:", error);
      Alert.alert("Error", "Failed to create order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!pickup || !dropoff) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorText}>Missing order data</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Confirm Order</Text>
            <Text style={styles.subtitle}>
              Review your order details
            </Text>
          </View>
        </View>

        {/* Success Preview */}
        <View style={styles.successPreview}>
          <Ionicons name="checkmark-circle" size={40} color={colors.success} />
          <Text style={styles.successText}>Ready to book!</Text>
        </View>

        {/* Order Summary Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Route</Text>
          
          {/* Pickup */}
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, styles.pickupDot]} />
            <View style={styles.locationContent}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.locationAddress}>{pickup.placeName || pickup.address}</Text>
            </View>
          </View>

          <View style={styles.routeLine} />

          {/* Dropoff */}
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, styles.dropoffDot]} />
            <View style={styles.locationContent}>
              <Text style={styles.locationLabel}>Drop-off</Text>
              <Text style={styles.locationAddress}>{dropoff.placeName || dropoff.address}</Text>
            </View>
          </View>
        </View>

        {/* Parcel Details Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Parcel Details</Text>
          
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Ionicons name="cube-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Contents</Text>
              <Text style={styles.detailValue}>{contents || "Not specified"}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="scale-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Weight</Text>
              <Text style={styles.detailValue}>{weight || 0} kg</Text>
            </View>
          </View>
        </View>

        {/* Price Card */}
        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Estimated Price</Text>
            <Text style={styles.priceValue}>₹{priceEstimate || 199}</Text>
          </View>
          <Text style={styles.priceNote}>
            Final price confirmed on delivery
          </Text>
        </View>

        {/* Terms */}
        <Text style={styles.terms}>
          By confirming, you agree to our Terms of Service and acknowledge that your parcel 
          will be transported via our bus network.
        </Text>
      </ScrollView>

      {/* Fixed Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.confirmBtn, loading && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color={colors.white} />
              <Text style={styles.confirmText}>Confirm & Create Order</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xl,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.xl,
  },
  backButton: {
    marginRight: spacing.md,
    marginTop: spacing.xs,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },

  // Success Preview
  successPreview: {
    alignItems: "center",
    marginBottom: spacing.xl,
    padding: spacing.xl,
    backgroundColor: "#DCFCE7",
    borderRadius: radius.lg,
  },
  successText: {
    ...typography.bodyLarge,
    fontWeight: "600",
    color: colors.success,
    marginTop: spacing.md,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Location
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
    marginTop: spacing.xs,
  },
  pickupDot: {
    backgroundColor: colors.primary,
  },
  dropoffDot: {
    backgroundColor: colors.success,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: colors.borderLight,
    marginLeft: 5,
    marginVertical: spacing.sm,
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  locationAddress: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },

  // Details Grid
  detailGrid: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  detailItem: {
    flex: 1,
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  detailValue: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },

  // Price Card
  priceCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    ...typography.body,
    color: "rgba(255,255,255,0.8)",
  },
  priceValue: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.white,
  },
  priceNote: {
    ...typography.caption,
    color: "rgba(255,255,255,0.6)",
    marginTop: spacing.sm,
  },

  // Terms
  terms: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },

  // Bottom Actions
  bottomActions: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  confirmBtn: {
    backgroundColor: colors.success,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    ...typography.button,
    color: colors.white,
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  errorButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.md,
  },
  errorButtonText: {
    ...typography.button,
    color: colors.white,
  },
});
