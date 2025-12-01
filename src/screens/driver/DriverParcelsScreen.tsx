import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList, ParcelData } from "../../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "DriverParcels">;

const dummyParcels: ParcelData[] = [
  {
    id: "PKG123",
    route: "Delhi → Jaipur",
    size: "Medium Box",
    weight: "1.5 kg",
    pickup: "Connaught Place",
    drop: "Bani Park",
  },
  {
    id: "PKG728",
    route: "Delhi → Kota",
    size: "Small Envelope",
    weight: "0.4 kg",
    pickup: "Sarojini",
    drop: "Rajeev Chowk",
  },
];

export default function DriverParcelsScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backHeader}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.heading}>Parcels on Your Route</Text>

        {dummyParcels.map((parcel) => (
          <TouchableOpacity
            key={parcel.id}
            style={styles.card}
            onPress={() => navigation.navigate("DriverParcelDetails", { parcel })}
            activeOpacity={0.8}
          >
            <View style={styles.cardContent}>
              <Text style={styles.parcelId}>{parcel.id}</Text>
              <Text style={styles.route}>{parcel.route}</Text>
              <Text style={styles.meta}>
                {parcel.size} • {parcel.weight}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={22}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    paddingBottom: spacing.massive,
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
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  cardContent: {
    flex: 1,
  },
  parcelId: {
    ...typography.bodyLarge,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  route: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
