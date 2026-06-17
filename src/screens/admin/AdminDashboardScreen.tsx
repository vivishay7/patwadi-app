import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { AdminStackParamList } from "../../navigation/AdminStack";
import { fetchAdminOverview } from "../../services/adminService";
import AdminRecoverySection from "../../components/admin/AdminRecoverySection";
import AdminFlaggedTransfersSection from "../../components/admin/AdminFlaggedTransfersSection";
import AdminTripsSection from "../../components/admin/AdminTripsSection";
import AdminCorridorsSection from "../../components/admin/AdminCorridorsSection";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { useAuth } from "../../context/AuthContext";

type Nav = NativeStackNavigationProp<AdminStackParamList, "AdminDashboard">;
type DashboardTab = "overview" | "recovery" | "transfers" | "trips" | "corridors";

const TABS: { key: DashboardTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "recovery", label: "Recovery" },
  { key: "transfers", label: "Flagged" },
  { key: "trips", label: "Trips" },
  { key: "corridors", label: "Corridors" },
];

export default function AdminDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { signOut } = useAuth();
  const [tab, setTab] = useState<DashboardTab>("overview");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);

  const loadOverview = async () => {
    setLoading(true);
    try {
      setOverview(await fetchAdminOverview());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "overview") loadOverview();
  }, [tab]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <TouchableOpacity onPress={async () => await signOut()}>
            <Text style={styles.logout}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {tab === "overview" && (
          <>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <View style={styles.grid}>
                  <Card label="Total Parcels" value={overview?.totalParcels ?? 0} />
                  <Card label="Blocked" value={overview?.blockedExceptions ?? 0} />
                  <Card label="Pay Pending" value={overview?.paymentPending ?? 0} />
                  <Card label="Pay Confirmed" value={overview?.paymentConfirmed ?? 0} />
                  <Card label="Pay Failed" value={overview?.paymentFailed ?? 0} />
                </View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Derived custody states</Text>
                  {Object.entries(overview?.byDerivedState || {}).map(([k, v]) => (
                    <View key={k} style={styles.row}>
                      <Text style={styles.key}>{k}</Text>
                      <Text style={styles.val}>{String(v)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
            <TouchableOpacity
              style={styles.primary}
              onPress={() => navigation.navigate("AdminParcels")}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryText}>Open Parcels Overview</Text>
            </TouchableOpacity>
          </>
        )}

        {tab === "recovery" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recovery queue (§16.1)</Text>
            <AdminRecoverySection />
          </View>
        )}

        {tab === "transfers" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Flagged transfers (§16.2)</Text>
            <AdminFlaggedTransfersSection />
          </View>
        )}

        {tab === "trips" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trips overview (§16.3)</Text>
            <AdminTripsSection />
          </View>
        )}

        {tab === "corridors" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Corridors (§18)</Text>
            <AdminCorridorsSection />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, paddingBottom: spacing.massive },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: { ...typography.h2, color: colors.textPrimary },
  logout: { ...typography.bodySmall, color: colors.error },
  tabBar: { marginBottom: spacing.lg, flexGrow: 0 },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { ...typography.caption, color: colors.textSecondary, fontWeight: "600" },
  tabTextActive: { color: colors.white },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  card: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  cardLabel: { ...typography.caption, color: colors.textSecondary },
  cardValue: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.xs },
  section: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs },
  key: { ...typography.caption, color: colors.textSecondary },
  val: { ...typography.bodySmall, color: colors.textPrimary },
  primary: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  primaryText: { ...typography.button, color: colors.white },
});
