import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HomeStackParamList, LocationData } from "../../navigation/HomeStack";
import { LocationAutocomplete } from "../../components/LocationAutocomplete";
import { SelectedLocation } from "../../lib/mapbox";
import { Ionicons } from "@expo/vector-icons";

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, "Dropoff">;
type RouteProps = RouteProp<HomeStackParamList, "Dropoff">;

export default function DropoffScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { pickup } = route.params || {};

  const [dropoffLocation, setDropoffLocation] = useState<LocationData | null>(null);

  const handleLocationSelect = (location: SelectedLocation) => {
    setDropoffLocation({
      address: location.address,
      lat: location.lat,
      lng: location.lng,
      placeId: location.placeId,
      placeName: location.placeName,
    });
  };

  const handleNext = () => {
    navigation.navigate("ParcelDetails", {
      pickup,
      dropoff: dropoffLocation || undefined,
    });
  };

  const canProceed = !!dropoffLocation;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <View style={styles.headerContent}>
                <Text style={styles.title}>Dropoff Location</Text>
                <Text style={styles.subtitle}>Where should we deliver your parcel?</Text>
              </View>
            </View>

            {/* Progress indicator */}
            <View style={styles.progress}>
              <View style={[styles.progressDot, styles.progressCompleted]} />
              <View style={[styles.progressLine, styles.progressLineCompleted]} />
              <View style={[styles.progressDot, styles.progressActive]} />
              <View style={styles.progressLine} />
              <View style={styles.progressDot} />
              <View style={styles.progressLine} />
              <View style={styles.progressDot} />
            </View>
            <Text style={styles.stepLabel}>Step 2 of 4</Text>

            {/* Pickup Summary */}
            {pickup && (
              <View style={styles.routeSummary}>
                <View style={styles.routePoint}>
                  <View style={[styles.routeDot, styles.routeDotPickup]} />
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeLabel}>Pickup</Text>
                    <Text style={styles.routeAddress} numberOfLines={1}>
                      {pickup.placeName || pickup.address}
                    </Text>
                  </View>
                </View>
                <View style={styles.routeConnector} />
                <View style={styles.routePoint}>
                  <View style={[styles.routeDot, styles.routeDotDropoff, !dropoffLocation && styles.routeDotEmpty]} />
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeLabel}>Dropoff</Text>
                    <Text style={[styles.routeAddress, !dropoffLocation && styles.routeAddressEmpty]} numberOfLines={1}>
                      {dropoffLocation?.placeName || dropoffLocation?.address || "Select below"}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Location Search */}
            <View style={styles.searchSection}>
              <LocationAutocomplete
                label="Dropoff Address"
                placeholder="Search for delivery location..."
                onSelect={handleLocationSelect}
                icon="flag"
                required
              />
            </View>

            {/* Selected Location Preview */}
            {dropoffLocation && (
              <View style={styles.locationPreview}>
                <View style={styles.locationPreviewIcon}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                </View>
                <View style={styles.locationPreviewContent}>
                  <Text style={styles.locationPreviewLabel}>Selected Dropoff</Text>
                  <Text style={styles.locationPreviewAddress} numberOfLines={2}>
                    {dropoffLocation.address}
                  </Text>
                </View>
              </View>
            )}

            {/* Delivery Info */}
            <View style={styles.infoSection}>
              <Ionicons name="information-circle" size={20} color={colors.info} />
              <Text style={styles.infoText}>
                Delivery times depend on bus schedules. Most parcels arrive within 6-12 hours.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Fixed Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.button, !canProceed && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={!canProceed}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Next → Parcel Details</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: spacing.xl,
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

  // Progress
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
  progressActive: {
    backgroundColor: colors.primary,
  },
  progressCompleted: {
    backgroundColor: colors.success,
  },
  progressLine: {
    width: 30,
    height: 2,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.xs,
  },
  progressLineCompleted: {
    backgroundColor: colors.success,
  },
  stepLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },

  // Route Summary
  routeSummary: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  routeDotPickup: {
    backgroundColor: colors.primary,
  },
  routeDotDropoff: {
    backgroundColor: colors.success,
  },
  routeDotEmpty: {
    backgroundColor: colors.borderLight,
    borderWidth: 2,
    borderColor: colors.borderDark,
  },
  routeConnector: {
    width: 2,
    height: 20,
    backgroundColor: colors.borderLight,
    marginLeft: 5,
    marginVertical: spacing.xs,
  },
  routeInfo: {
    flex: 1,
  },
  routeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  routeAddress: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  routeAddressEmpty: {
    color: colors.textSecondary,
    fontStyle: "italic",
  },

  // Search
  searchSection: {
    zIndex: 100,
    marginBottom: spacing.lg,
  },

  // Location Preview
  locationPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
  },
  locationPreviewIcon: {
    marginRight: spacing.md,
  },
  locationPreviewContent: {
    flex: 1,
  },
  locationPreviewLabel: {
    ...typography.caption,
    color: colors.success,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  locationPreviewAddress: {
    ...typography.body,
    color: colors.textPrimary,
  },

  // Info
  infoSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#E3F2FD",
    padding: spacing.lg,
    borderRadius: radius.md,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.info,
    marginLeft: spacing.sm,
    flex: 1,
  },

  // Bottom Actions
  bottomActions: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
  },
});
