import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, TextInput, ScrollView, Switch, Keyboard, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { useNavigation, useFocusEffect, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { LocationAutocomplete } from "../../components/LocationAutocomplete";
import { SelectedLocation } from "../../lib/mapbox";
import { LocationData } from "../../types/location";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { validatePhoneNumber, validateEmail } from "../../utils/validation";
import SavedAddressPicker from "../../components/SavedAddressPicker";
import SaveAddressField from "../../components/SaveAddressField";
import { saveAddressToBookWithPrompt } from "../../services/addressBookService";
import { coreLocationFromData, locationToAddressFormFields } from "../../lib/addressForm";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Pickup">;
type RouteProps = RouteProp<RootStackParamList, "Pickup">;

type RequiredFieldKey = "pickupLocation" | "phoneNumber" | "street" | "apartmentBuilding";

function getMissingPickupFields(
  pickupLocation: LocationData | null,
  phoneNumber: string,
  phoneError: string | undefined,
  street: string,
  apartmentBuilding: string
): RequiredFieldKey[] {
  const missing: RequiredFieldKey[] = [];
  if (!pickupLocation) missing.push("pickupLocation");
  if (!phoneNumber.trim() || phoneError) missing.push("phoneNumber");
  if (!street.trim()) missing.push("street");
  if (!apartmentBuilding.trim()) missing.push("apartmentBuilding");
  return missing;
}

const MISSING_FIELD_LABELS: Record<RequiredFieldKey, string> = {
  pickupLocation: "Pickup address",
  phoneNumber: "Contact number",
  street: "Street / area",
  apartmentBuilding: "Apartment / building number",
};

export default function PickupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { isGuest, user } = useAuth();
  const packageInfo = route.params?.packageInfo;
  const [pickupLocation, setPickupLocation] = useState<LocationData | null>(null);
  const [saveToBook, setSaveToBook] = useState(false);
  const [addressLabel, setAddressLabel] = useState("Home");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappNotifications, setWhatsappNotifications] = useState(true);
  const [street, setStreet] = useState("");
  const [apartmentBuilding, setApartmentBuilding] = useState("");
  const [landmark, setLandmark] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [shouldCallForInstructions, setShouldCallForInstructions] = useState(false);
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [showMissingHints, setShowMissingHints] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const canProceedRef = useRef(false);

  // Handle keyboard events to auto-scroll to focused input
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        // Scroll will be handled by KeyboardAvoidingView and ScrollView automatically
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  // Refs for field navigation
  const phoneInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const apartmentInputRef = useRef<TextInput>(null);
  const landmarkInputRef = useRef<TextInput>(null);
  const instructionsInputRef = useRef<TextInput>(null);

  const handleLocationSelect = (location: SelectedLocation) => {
    setPickupLocation({
      address: location.address,
      lat: location.lat,
      lng: location.lng,
      placeId: location.placeId,
      placeName: location.placeName,
      city: location.city,
      state: location.state,
      country: location.country,
      phoneNumber: phoneNumber || undefined,
      whatsappNotifications: whatsappNotifications,
      street: street || undefined,
      apartmentBuilding: apartmentBuilding || undefined,
      landmark: landmark || undefined,
      deliveryInstructions: deliveryInstructions || undefined,
      shouldCallForInstructions: shouldCallForInstructions || undefined,
    });
  };

  const handleStreetSelect = (location: SelectedLocation) => {
    setStreet(location.address);
  };

  const applySavedAddress = (location: LocationData) => {
    setPickupLocation(coreLocationFromData(location));
    const fields = locationToAddressFormFields(location);
    setPhoneNumber(fields.phoneNumber);
    setWhatsappNotifications(fields.whatsappNotifications);
    setStreet(fields.street);
    setApartmentBuilding(fields.apartmentBuilding);
    setLandmark(fields.landmark);
    setDeliveryInstructions(fields.deliveryInstructions);
    setShouldCallForInstructions(fields.shouldCallForInstructions);
    setPhoneError(undefined);
  };

  const handleNext = async () => {
    // Validate phone number before proceeding
    if (phoneNumber.trim()) {
      const phoneValidation = validatePhoneNumber(phoneNumber);
      if (!phoneValidation.isValid) {
        setPhoneError(phoneValidation.error);
        return;
      }
    }

    // Validate email if provided
    if (email.trim()) {
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        setEmailError(emailValidation.error);
        return;
      }
    }

    const locationWithDetails: LocationData | undefined = pickupLocation ? {
      ...pickupLocation,
      phoneNumber: phoneNumber || undefined,
      whatsappNotifications: whatsappNotifications,
      street: street || undefined,
      apartmentBuilding: apartmentBuilding || undefined,
      landmark: landmark || undefined,
      deliveryInstructions: deliveryInstructions || undefined,
      shouldCallForInstructions: shouldCallForInstructions || undefined,
    } : undefined;

    if (saveToBook && user?.id && locationWithDetails) {
      const label = addressLabel.trim() || "Home";
      const result = await saveAddressToBookWithPrompt(user.id, label, locationWithDetails);
      if (!result.ok) {
        // Non-blocking — user can still continue booking
        console.warn("saveAddressToBook:", result.error);
      }
    }

    navigation.navigate("Dropoff", {
      pickup: locationWithDetails,
      packageInfo: packageInfo,
    });
  };

  const canProceed =
    !!pickupLocation &&
    !!phoneNumber.trim() &&
    !phoneError &&
    !!street.trim() &&
    !!apartmentBuilding.trim() &&
    (!email.trim() || !emailError);

  const missingFields = getMissingPickupFields(
    pickupLocation,
    phoneNumber,
    phoneError,
    street,
    apartmentBuilding
  );
  canProceedRef.current = canProceed;

  useEffect(() => {
    if (canProceed) setShowMissingHints(false);
  }, [canProceed]);

  const revealMissingHintsIfAtScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const scrollableHeight = contentSize.height - layoutMeasurement.height;
      if (scrollableHeight <= 0) {
        if (!canProceedRef.current) setShowMissingHints(true);
        return;
      }
      const scrolledRatio = contentOffset.y / scrollableHeight;
      const atEnd =
        scrolledRatio >= 0.9 ||
        contentOffset.y + layoutMeasurement.height >= contentSize.height - 120;
      if (atEnd && !canProceedRef.current) {
        setShowMissingHints(true);
      }
    },
    []
  );

  const highlight = (field: RequiredFieldKey) =>
    showMissingHints && missingFields.includes(field);

  const handleNextPress = () => {
    if (!canProceed) {
      setShowMissingHints(true);
      return;
    }
    handleNext();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled={true}
          onScroll={revealMissingHintsIfAtScrollEnd}
          onScrollEndDrag={revealMissingHintsIfAtScrollEnd}
          onMomentumScrollEnd={revealMissingHintsIfAtScrollEnd}
          scrollEventThrottle={16}
        >
          <View style={styles.containerInner}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  if (isGuest) {
                    navigation.replace("Splash");
                  } else {
                    navigation.goBack();
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <View style={styles.headerContent}>
        <Text style={styles.title}>Pickup Location</Text>
                <Text style={styles.subtitle}>Where should we pick up your parcel?</Text>
              </View>
            </View>

            {/* Progress indicator */}
            <View style={styles.progress}>
              <View style={styles.progressDot} />
              <View style={styles.progressLine} />
              <View style={[styles.progressDot, styles.progressActive]} />
              <View style={styles.progressLine} />
              <View style={styles.progressDot} />
              <View style={styles.progressLine} />
              <View style={styles.progressDot} />
            </View>
            <Text style={styles.stepLabel}>Step 2 of 5</Text>

            <SavedAddressPicker onSelect={applySavedAddress} />

            {/* Location Search */}
            <View style={styles.searchSection}>
              <LocationAutocomplete
                label="Pickup Address"
                placeholder="Search for pickup location..."
                onSelect={handleLocationSelect}
                icon="location"
                required
                errorMessage={
                  highlight("pickupLocation") ? "Select a pickup address to continue" : undefined
                }
              />
            </View>

            {/* Selected Location Preview */}
            {pickupLocation && (
              <View style={styles.locationPreview}>
                <View style={styles.locationPreviewIcon}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                </View>
                <View style={styles.locationPreviewContent}>
                  <Text style={styles.locationPreviewLabel}>Selected Pickup</Text>
                  <Text style={styles.locationPreviewAddress} numberOfLines={2}>
                    {pickupLocation.address}
          </Text>
        </View>
              </View>
            )}

            {/* Phone Number */}
            {pickupLocation && (
              <View style={styles.fieldSection}>
                <Text style={[styles.fieldLabel, highlight("phoneNumber") && styles.fieldLabelMissing]}>
                  Contact Number *
                </Text>
                <TextInput
                  ref={phoneInputRef}
                  style={[styles.textInput, (phoneError || highlight("phoneNumber")) && styles.inputError]}
                  placeholder="9876543210"
                  placeholderTextColor={colors.textSecondary}
                  value={phoneNumber}
                  onChangeText={(text) => {
                    // Only allow digits
                    const digitsOnly = text.replace(/\D/g, "");
                    if (digitsOnly.length <= 10) {
                      setPhoneNumber(digitsOnly);
                      const validation = validatePhoneNumber(digitsOnly);
                      setPhoneError(validation.isValid ? undefined : validation.error);
                    }
                  }}
                  keyboardType="phone-pad"
                  maxLength={10}
                  returnKeyType="next"
                  onSubmitEditing={() => emailInputRef.current?.focus()}
                />
                {phoneError ? (
                  <Text style={styles.errorText}>{phoneError}</Text>
                ) : highlight("phoneNumber") ? (
                  <Text style={styles.errorText}>Enter a valid 10-digit contact number</Text>
                ) : (
                  <Text style={styles.fieldHint}>So we can reach you for pickup (10 digits)</Text>
                )}
              </View>
            )}

            {/* WhatsApp Notifications Toggle */}
            {pickupLocation && (
              <View style={styles.fieldSection}>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabel}>
                    <Ionicons name="logo-whatsapp" size={20} color={colors.success} />
                    <View style={styles.switchTextContainer}>
                      <Text style={styles.switchText}>Enable WhatsApp notifications for this order</Text>
                      <Text style={styles.switchHint}>
                        Get instant delivery updates via WhatsApp
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={whatsappNotifications}
                    onValueChange={setWhatsappNotifications}
                    trackColor={{ false: colors.borderLight, true: colors.secondary }}
                    thumbColor={whatsappNotifications ? colors.success : colors.white}
                  />
                </View>
              </View>
            )}

            {/* Email (Optional) */}
            {pickupLocation && (
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>Email (Optional)</Text>
                <TextInput
                  ref={emailInputRef}
                  style={[styles.textInput, emailError && styles.inputError]}
                  placeholder="your.email@example.com"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (text.trim()) {
                      const validation = validateEmail(text);
                      setEmailError(validation.isValid ? undefined : validation.error);
                    } else {
                      setEmailError(undefined);
                    }
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => apartmentInputRef.current?.focus()}
                />
                {emailError ? (
                  <Text style={styles.errorText}>{emailError}</Text>
                ) : (
                  <Text style={styles.fieldHint}>For order updates and receipts</Text>
                )}
              </View>
            )}

            {/* Street (with Mapbox autocomplete) */}
            {pickupLocation && (
              <View style={styles.fieldSection}>
                <Text style={[styles.fieldLabel, highlight("street") && styles.fieldLabelMissing]}>
                  Street / Area *
                </Text>
                <LocationAutocomplete
                  label=""
                  placeholder="Search street or area..."
                  onSelect={handleStreetSelect}
                  icon="road-outline"
                  city={pickupLocation.city}
                  state={pickupLocation.state}
                  errorMessage={
                    highlight("street") ? "Enter street or area for pickup" : undefined
                  }
                />
                {street && (
                  <Text style={styles.fieldHint}>Selected: {street}</Text>
                )}
              </View>
            )}

            {/* Apartment/Building Number */}
            {pickupLocation && (
              <View style={styles.fieldSection}>
                <Text style={[styles.fieldLabel, highlight("apartmentBuilding") && styles.fieldLabelMissing]}>
                  Apartment / Building Number *
                </Text>
                <TextInput
                  ref={apartmentInputRef}
                  style={[styles.textInput, highlight("apartmentBuilding") && styles.inputError]}
                  placeholder="e.g., Apt 301, Building A"
                  placeholderTextColor={colors.textSecondary}
                  value={apartmentBuilding}
                  onChangeText={setApartmentBuilding}
                  returnKeyType="next"
                  onSubmitEditing={() => landmarkInputRef.current?.focus()}
                />
                {highlight("apartmentBuilding") && (
                  <Text style={styles.errorText}>Enter apartment or building number</Text>
                )}
              </View>
            )}

            {/* Landmark */}
            {pickupLocation && (
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>Landmark (Optional)</Text>
                <TextInput
                  ref={landmarkInputRef}
                  style={styles.textInput}
                  placeholder="e.g., Near Metro Station, Behind Mall"
                  placeholderTextColor={colors.textSecondary}
                  value={landmark}
                  onChangeText={setLandmark}
                  returnKeyType="next"
                  onSubmitEditing={() => instructionsInputRef.current?.focus()}
                />
              </View>
            )}

            {/* Call for Instructions Toggle */}
            {pickupLocation && (
              <View style={styles.fieldSection}>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabel}>
                    <Ionicons name="call-outline" size={20} color={colors.primary} />
                    <View style={styles.switchTextContainer}>
                      <Text style={styles.switchText}>Driver may call the recipient for instructions (If needed)</Text>
                    </View>
                  </View>
                  <Switch
                    value={shouldCallForInstructions}
                    onValueChange={setShouldCallForInstructions}
                    trackColor={{ false: colors.borderLight, true: colors.secondary }}
                    thumbColor={shouldCallForInstructions ? colors.primary : colors.white}
                  />
                </View>
              </View>
            )}

            {/* Delivery Instructions */}
            {pickupLocation && (
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>Additional Instructions (Optional)</Text>
                <TextInput
                  ref={instructionsInputRef}
                  style={[styles.textInput, styles.textArea]}
                  placeholder="e.g., Ring doorbell, Leave at front desk, Call before arriving"
                  placeholderTextColor={colors.textSecondary}
                  value={deliveryInstructions}
                  onChangeText={setDeliveryInstructions}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  returnKeyType="done"
                />
              </View>
            )}

            {pickupLocation && (
              <SaveAddressField
                enabled={saveToBook}
                onEnabledChange={setSaveToBook}
                label={addressLabel}
                onLabelChange={setAddressLabel}
                disabled={isGuest || !user?.id}
                disabledHint="Log in to save addresses for next time."
              />
            )}

            {/* Tips */}
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>Tips for pickup</Text>
              <View style={styles.tipItem}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.tipText}>Be ready 15 mins before pickup time</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="cube-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.tipText}>Pack your parcel securely</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.tipText}>Keep the receipt handy</Text>
              </View>
            </View>
            {showMissingHints && missingFields.length > 0 && (
              <View style={styles.missingSummary}>
                <Text style={styles.missingSummaryTitle}>Still needed to continue:</Text>
                {missingFields.map((field) => (
                  <Text key={field} style={styles.missingSummaryItem}>
                    • {MISSING_FIELD_LABELS[field]}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Fixed Bottom Actions - Outside ScrollView */}
        <View style={styles.bottomActions}>
          {showMissingHints && missingFields.length > 0 && (
            <Text style={styles.missingSummaryCompact}>
              Complete {missingFields.length} required field{missingFields.length === 1 ? "" : "s"} above
            </Text>
          )}
        <TouchableOpacity
            style={[styles.button, !canProceed && styles.buttonDisabled]}
            onPress={handleNextPress}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Next → Dropoff Details</Text>
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
  container: {
    flex: 1,
  },
  containerInner: {
    padding: spacing.xl,
  },
  content: {
    paddingBottom: spacing.xxxl + 100, // Extra padding for keyboard
    flexGrow: 1,
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
    marginBottom: spacing.xl,
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

  // Form Fields
  fieldSection: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  fieldLabelMissing: {
    color: colors.error,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
    paddingTop: spacing.md,
  },
  fieldHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
  },
  switchLabel: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    flex: 1,
  },
  switchTextContainer: {
    flex: 1,
  },
  switchText: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  switchHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  missingSummary: {
    backgroundColor: colors.error + "12",
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  missingSummaryTitle: {
    ...typography.label,
    color: colors.error,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  missingSummaryItem: {
    ...typography.body,
    color: colors.error,
    marginTop: spacing.xs,
  },
  missingSummaryCompact: {
    ...typography.caption,
    color: colors.error,
    textAlign: "center",
    marginBottom: spacing.sm,
    fontWeight: "500",
  },

  // Tips
  tipsSection: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tipsTitle: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  tipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
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
