import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { CompositeNavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { OperatorTabParamList } from "../../navigation/MainTabs";
import { useAuth } from "../../context/AuthContext";
import { getUserDisplayName } from "../../lib/userDisplayName";
import { useLocale } from "../../context/LocaleContext";
import { useOperatorAlerts } from "../../context/OperatorAlertsContext";
import { useRole } from "../../context/RoleContext";
import { supabase } from "../../lib/supabase";
import LanguageToggle from "../../components/LanguageToggle";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { Ionicons } from "@expo/vector-icons";
import { formatTransferStatusMessage } from "../../lib/domain/transferDisplay";

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<OperatorTabParamList, "Home">,
  NativeStackNavigationProp<RootStackParamList>
>;

function welcomeName(user: { full_name?: string | null; email?: string | null; phone?: string | null }, accountEmail: string | null): string {
  return getUserDisplayName({
    fullName: user.full_name,
    email: user.email || accountEmail,
    phone: user.phone,
  });
}

function CardBadge({ color }: { color: "green" | "red" }) {
  return (
    <View
      style={[
        styles.cardBadge,
        { backgroundColor: color === "green" ? colors.success : colors.error },
      ]}
    />
  );
}

export default function DriverHome() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { t } = useLocale();
  const { role } = useRole();
  const isLinehaul = role === "linehaul";
  const {
    availableJobsCount,
    pendingTransfers,
    parcelsActionRequired,
    acceptTransfer,
  } = useOperatorAlerts();
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setAccountEmail(null);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setAccountEmail(data.user?.email ?? null);
    });
  }, [user?.id]);

  const handleAccept = async (transferId: string) => {
    setAcceptingId(transferId);
    try {
      await acceptTransfer(transferId);
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.welcome}>
          {t("welcome")}, {welcomeName(user ?? {}, accountEmail)}
        </Text>
        <Text style={styles.subtitle}>{t("welcomeSubtitle")}</Text>
        {accountEmail ? (
          <Text style={styles.accountEmail}>
            {t("signedInAs")} {accountEmail}
          </Text>
        ) : null}

        {isLinehaul &&
          pendingTransfers.map((transfer) => (
          <View key={transfer.id} style={styles.alertCardTransfer}>
            <Text style={styles.alertTitle}>{t("transferOfferTitle")}</Text>
            <Text style={styles.alertBody}>
              {formatTransferStatusMessage(transfer, "receiver")}
            </Text>
            <TouchableOpacity
              style={styles.alertBtn}
              onPress={() => handleAccept(transfer.id)}
              disabled={acceptingId === transfer.id}
              activeOpacity={0.85}
            >
              {acceptingId === transfer.id ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.alertBtnText}>{t("acceptLoad")}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("Trips")}
              activeOpacity={0.7}
            >
              <Text style={styles.alertLink}>{t("viewTrips")}</Text>
            </TouchableOpacity>
          </View>
          ))}

        {availableJobsCount > 0 && (
          <TouchableOpacity
            style={styles.alertCardJobs}
            onPress={() => navigation.navigate("Parcels", { showAvailable: true })}
            activeOpacity={0.85}
          >
            <Text style={styles.alertTitle}>{t("newJobsTitle")}</Text>
            <Text style={styles.alertBody}>
              <Text style={styles.alertCount}>{availableJobsCount}</Text> {t("newJobsBody")}
            </Text>
            <Text style={styles.alertLink}>{t("viewJobs")}</Text>
          </TouchableOpacity>
        )}

        {isLinehaul ? (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate("CreateTrip")}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.white} />
            <Text style={styles.createButtonText}>{t("createTrip")}</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.quickActions}>
          {isLinehaul ? (
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate("Trips")}
              activeOpacity={0.7}
            >
              {pendingTransfers.length > 0 && <CardBadge color="green" />}
              <Ionicons name="bus-outline" size={32} color={colors.primary} />
              <Text style={styles.actionLabel}>{t("myTrips")}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Parcels")}
            activeOpacity={0.7}
          >
            {availableJobsCount > 0 && <CardBadge color="green" />}
            {parcelsActionRequired && <View style={styles.cardBadgeRedOffset}><CardBadge color="red" /></View>}
            <Ionicons name="cube-outline" size={32} color={colors.primary} />
            <Text style={styles.actionLabel}>{t("myParcels")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("MyHandoffCodes")}
            activeOpacity={0.7}
          >
            <Ionicons name="key-outline" size={32} color={colors.primary} />
            <Text style={styles.actionLabel}>{t("handoffCodes")}</Text>
          </TouchableOpacity>
        </View>

        <LanguageToggle />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  container: { padding: spacing.xl, paddingBottom: spacing.massive },
  welcome: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  accountEmail: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  alertCardTransfer: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  alertCardJobs: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.success,
  },
  alertTitle: {
    ...typography.body,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  alertBody: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.md },
  alertCount: { fontWeight: "700", color: colors.success },
  alertBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  alertBtnText: { ...typography.button, color: colors.white },
  alertLink: { ...typography.caption, color: colors.primary, fontWeight: "600" },
  createButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
  },
  createButtonText: {
    ...typography.button,
    color: colors.white,
    marginLeft: spacing.md,
  },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  actionCard: {
    backgroundColor: colors.surface,
    width: "47%",
    padding: spacing.xl,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
    position: "relative",
  },
  actionLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    marginTop: spacing.md,
    fontWeight: "500",
    textAlign: "center",
  },
  cardBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.white,
  },
  cardBadgeRedOffset: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.lg + 6,
  },
});
