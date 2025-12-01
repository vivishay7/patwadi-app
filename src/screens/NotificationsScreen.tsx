import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";
import { Ionicons } from "@expo/vector-icons";

interface Notification {
  id: number;
  title: string;
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const dummyNotifications: Notification[] = [
  {
    id: 1,
    title: "Parcel pickup delayed",
    time: "Just now",
    icon: "alert-circle-outline",
  },
  {
    id: 2,
    title: "Driver assigned to your order",
    time: "5 min ago",
    icon: "person-outline",
  },
  {
    id: 3,
    title: "Parcel reached bus depot",
    time: "20 min ago",
    icon: "cube-outline",
  },
  {
    id: 4,
    title: "Delivery complete",
    time: "Yesterday",
    icon: "checkmark-done-outline",
  },
];

export default function NotificationsScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Notifications</Text>

        {dummyNotifications.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon} size={20} color={colors.white} />
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.time}>{item.time}</Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.dark}
              style={styles.chevron}
            />
          </View>
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
  heading: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.lg,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.bodyLarge,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  time: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  chevron: {
    opacity: 0.4,
  },
});
