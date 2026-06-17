import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { Ionicons } from "@expo/vector-icons";
import { estimateDimensionsFromImage } from "../../lib/dimensionAI";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ParcelDetails">;
type RouteProps = RouteProp<RootStackParamList, "ParcelDetails">;

export default function ParcelDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const pickupLocation = route.params?.pickup;
  const dropoffLocation = route.params?.dropoff;
  const capturedImage = route.params?.capturedImage;

  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [contents, setContents] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Handle keyboard events
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

  // Auto-run AI estimation whenever image is captured
  useEffect(() => {
    async function runAI() {
      if (!capturedImage) return;

      setLoadingAI(true);

      const result = await estimateDimensionsFromImage("file://" + capturedImage);

      if (result) {
        setLength(String(result.estimated_length_cm));
        setWidth(String(result.estimated_width_cm));
        setHeight(String(result.estimated_height_cm));
      }

      setLoadingAI(false);
    }

    runAI();
  }, [capturedImage]);

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
        >
        <Text style={styles.title}>Parcel Details</Text>
        <Text style={styles.subtitle}>
          Tell us about the parcel so we can estimate pricing and routing.
        </Text>

        {capturedImage && (
          <Image
            source={{ uri: "file://" + capturedImage }}
            style={styles.preview}
          />
        )}

        {/* Loading Indicator */}
        {loadingAI && (
          <View style={styles.aiBar}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.aiText}>Estimating dimensions…</Text>
          </View>
        )}

        {/* Photo Button */}
        <TouchableOpacity
          style={styles.photoBtn}
          onPress={() => navigation.navigate("CameraMeasure")}
          activeOpacity={0.8}
        >
          <Ionicons name="camera-outline" size={20} color={colors.white} />
          <Text style={styles.photoText}>Take Photo to Auto-Estimate Size</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Weight (kg)</Text>
        <TextInput
          placeholder="e.g. 1.5"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          keyboardType="decimal-pad"
          value={weight}
          onChangeText={setWeight}
        />

        <Text style={styles.label}>Dimensions (cm)</Text>
        <View style={styles.row}>
          <TextInput
            placeholder="L"
            value={length}
            onChangeText={setLength}
            style={[styles.input, styles.inputSmall]}
            keyboardType="numeric"
            placeholderTextColor={colors.textSecondary}
          />
          <TextInput
            placeholder="W"
            value={width}
            onChangeText={setWidth}
            style={[styles.input, styles.inputSmall]}
            keyboardType="numeric"
            placeholderTextColor={colors.textSecondary}
          />
          <TextInput
            placeholder="H"
            value={height}
            onChangeText={setHeight}
            style={[styles.input, styles.inputSmall]}
            keyboardType="numeric"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <Text style={styles.label}>Contents</Text>
        <TextInput
          placeholder="e.g. Books, clothes, documents..."
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, styles.multiline]}
          multiline
          value={contents}
          onChangeText={setContents}
        />

        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => {
            const dimensions = length && width && height ? {
              length: parseFloat(length) || 0,
              width: parseFloat(width) || 0,
              height: parseFloat(height) || 0,
            } : undefined;
            
            navigation.navigate("PriceEstimate", {
              pickup: pickupLocation,
              dropoff: dropoffLocation,
              weight: weight ? parseFloat(weight) : undefined,
              dimensions,
              contents: contents || undefined,
            });
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.nextText}>Next → Get Estimate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        </ScrollView>
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
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl + 100, // Extra padding for keyboard
    flexGrow: 1,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },

  preview: {
    width: "100%",
    height: 180,
    borderRadius: radius.sm,
    marginBottom: spacing.xl,
  },

  aiBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  aiText: {
    ...typography.body,
    color: colors.textSecondary,
  },

  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
  },
  photoText: {
    ...typography.buttonSmall,
    color: colors.white,
  },

  label: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    padding: spacing.md + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    fontSize: 15,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  inputSmall: {
    flex: 1,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  nextBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
    marginTop: spacing.huge,
  },
  nextText: {
    ...typography.button,
    color: colors.white,
  },

  backBtn: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  backText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
