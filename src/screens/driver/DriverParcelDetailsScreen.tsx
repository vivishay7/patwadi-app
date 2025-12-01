import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { Ionicons } from "@expo/vector-icons";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "DriverParcelDetails">;
type RouteProps = RouteProp<RootStackParamList, "DriverParcelDetails">;

export default function DriverParcelDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { parcel } = route.params;

  const handleAccept = () => {
    // Later: mark in Supabase + notify customer via WhatsApp
    navigation.navigate("Main");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backHeader}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.heading}>Parcel Details</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Parcel ID</Text>
            <Text style={styles.value}>{parcel.id}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Route</Text>
            <Text style={styles.value}>{parcel.route}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Pickup</Text>
            <Text style={styles.value}>{parcel.pickup}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Dropoff</Text>
            <Text style={styles.value}>{parcel.drop}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Size / Weight</Text>
            <Text style={styles.value}>
              {parcel.size} • {parcel.weight}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={handleAccept}
          activeOpacity={0.8}
        >
          <Text style={styles.acceptText}>Accept Parcel</Text>
        </TouchableOpacity>

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
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: spacing.xl,
  },
  backHeader: {
    marginBottom: spacing.lg,
  },
  heading: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xl,
  },
  row: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.bodyLarge,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  acceptBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  acceptText: {
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
