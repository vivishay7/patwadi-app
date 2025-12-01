import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

export default function SplashScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoInitial}>P</Text>
        </View>
        <Text style={styles.brand}>Patwadi</Text>
        <Text style={styles.subTitle}>Overnight Intercity Parcels</Text>
        <Text style={styles.tagline}>Bus-first delivery for real India.</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.primary]}
          onPress={() => navigation.navigate("Login")}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonPrimaryText}>Log in</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.outline]}
          onPress={() => navigation.navigate("Login")}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonOutlineText}>Sign up</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.replace("Main")}
          activeOpacity={0.7}
        >
          <Text style={styles.guest}>Continue as guest</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Intercity • Bus corridors • Same-day potential
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xxl + 2,
    paddingVertical: spacing.massive,
    justifyContent: "space-between",
  },
  logoContainer: {
    marginTop: spacing.massive,
    alignItems: "center",
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: radius.xxl,
    backgroundColor: colors.surfaceDark,
    justifyContent: "center",
    alignItems: "center",
  },
  logoInitial: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.primary,
  },
  brand: {
    marginTop: spacing.xl,
    ...typography.display2,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  subTitle: {
    marginTop: spacing.xs,
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  tagline: {
    marginTop: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  actions: {
    gap: spacing.md + 2,
  },
  button: {
    borderRadius: radius.xxl,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  primary: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonPrimaryText: {
    ...typography.button,
    color: colors.textOnDark,
  },
  buttonOutlineText: {
    ...typography.button,
    color: colors.primary,
  },
  guest: {
    marginTop: spacing.md,
    textAlign: "center",
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  footerText: {
    marginTop: spacing.xl,
    textAlign: "center",
    ...typography.caption,
    color: colors.textSecondary,
  },
});
