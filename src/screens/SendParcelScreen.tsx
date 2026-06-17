import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuOption {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  subtitle?: string;
  onPress: () => void;
}

export default function SendParcelScreen() {
  const navigation = useNavigation<NavigationProp>();

  const primaryActions: MenuOption[] = [
    {
      id: "send-parcel",
      label: "Send a Parcel",
      icon: "cube-outline",
      subtitle: "Starts at ₹40/kg",
      onPress: () => navigation.navigate("PackageInfo"),
    },
    {
      id: "my-parcels",
      label: "My Parcels",
      icon: "list-outline",
      onPress: () => navigation.navigate("Main", { screen: "Packages" }),
    },
  ];

  const secondaryActions: MenuOption[] = [
    {
      id: "notifications",
      label: "Notifications",
      icon: "notifications-outline",
      onPress: () => navigation.navigate("Main", { screen: "Notifications" }),
    },
  ];

  const renderPrimaryCard = (item: MenuOption) => (
    <TouchableOpacity
      style={styles.primaryCard}
      onPress={item.onPress}
      activeOpacity={0.8}
    >
      <View style={styles.primaryCardContent}>
        <View style={styles.primaryIconContainer}>
          <Ionicons name={item.icon} size={32} color={colors.primary} />
        </View>
        <View style={styles.primaryTextContainer}>
          <Text style={styles.primaryLabel}>{item.label}</Text>
          {item.subtitle && (
            <Text style={styles.primarySubtitle}>{item.subtitle}</Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderSecondaryCard = (item: MenuOption) => (
    <TouchableOpacity
      style={styles.secondaryCard}
      onPress={item.onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={item.icon} size={24} color={colors.textPrimary} />
      <Text style={styles.secondaryLabel}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <Text style={styles.heading}>Send Parcel</Text>

          <View style={styles.section}>
            {primaryActions.map((item) => (
              <View key={item.id} style={styles.primaryCardWrapper}>
                {renderPrimaryCard(item)}
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.secondaryGrid}>
              {secondaryActions.map((item) => (
                <View key={item.id} style={styles.secondaryCardWrapper}>
                  {renderSecondaryCard(item)}
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.massive,
  },
  container: {
    padding: spacing.xl,
  },
  heading: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  primaryCardWrapper: {
    marginBottom: spacing.md,
  },
  primaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryCardContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  primaryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  primaryTextContainer: {
    flex: 1,
  },
  primaryLabel: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  primarySubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  secondaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  secondaryCardWrapper: {
    width: "48%",
    marginBottom: spacing.md,
  },
  secondaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 100,
    justifyContent: "center",
  },
  secondaryLabel: {
    ...typography.body,
    fontWeight: "500",
    color: colors.textPrimary,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
