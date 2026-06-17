import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  ScrollView,
} from "react-native";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import {
  adminCreateCorridor,
  adminSetCorridorActive,
  fetchAdminCorridors,
} from "../../services/adminService";
import type { CorridorDefinition } from "../../lib/domain/corridors";
import EmptyState from "../EmptyState";
import ListSkeleton from "../ListSkeleton";
import { LoadingButton } from "../LoadingButton";

export default function AdminCorridorsSection() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [corridors, setCorridors] = useState<CorridorDefinition[]>([]);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [originCity, setOriginCity] = useState("");
  const [originLat, setOriginLat] = useState("");
  const [originLng, setOriginLng] = useState("");
  const [destCity, setDestCity] = useState("");
  const [destLat, setDestLat] = useState("");
  const [destLng, setDestLng] = useState("");
  const [durationHours, setDurationHours] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCorridors(await fetchAdminCorridors());
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load corridors");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (key: string, active: boolean) => {
    setTogglingKey(key);
    try {
      await adminSetCorridorActive(key, !active);
      await load();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to update corridor");
    } finally {
      setTogglingKey(null);
    }
  };

  const handleAdd = async () => {
    if (!originCity.trim() || !destCity.trim()) {
      Alert.alert("Missing fields", "Origin and destination cities are required.");
      return;
    }
    const oLat = parseFloat(originLat);
    const oLng = parseFloat(originLng);
    const dLat = parseFloat(destLat);
    const dLng = parseFloat(destLng);
    const hours = parseFloat(durationHours);
    if ([oLat, oLng, dLat, dLng, hours].some((n) => Number.isNaN(n))) {
      Alert.alert("Invalid numbers", "Enter valid lat/lng and duration hours.");
      return;
    }

    setSubmitting(true);
    try {
      await adminCreateCorridor({
        originCity: originCity.trim(),
        originLat: oLat,
        originLng: oLng,
        destinationCity: destCity.trim(),
        destinationLat: dLat,
        destinationLng: dLng,
        expectedDurationHours: hours,
      });
      setOriginCity("");
      setOriginLat("");
      setOriginLng("");
      setDestCity("");
      setDestLat("");
      setDestLng("");
      setDurationHours("");
      await load();
      Alert.alert("Corridor added", "New route is active and visible to operators.");
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to add corridor");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <ListSkeleton rows={2} />;
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
      }
    >
      <Text style={styles.sectionTitle}>All corridors</Text>
      {corridors.length === 0 ? (
        <EmptyState title="No corridors" message="Add a corridor below to enable operator routes." />
      ) : (
        corridors.map((c) => (
        <View key={c.key} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.route}>
              {c.origin.city} → {c.destination.city}
            </Text>
            <View style={[styles.badge, c.active ? styles.badgeOn : styles.badgeOff]}>
              <Text style={styles.badgeText}>{c.active ? "Active" : "Inactive"}</Text>
            </View>
          </View>
          <Text style={styles.meta}>Key: {c.key}</Text>
          <Text style={styles.meta}>
            {c.expected_duration_hours}h · origin ({c.origin.lat}, {c.origin.lng})
          </Text>
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => handleToggle(c.key, c.active)}
            disabled={togglingKey === c.key}
          >
            {togglingKey === c.key ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={styles.toggleText}>{c.active ? "Deactivate" : "Activate"}</Text>
            )}
          </TouchableOpacity>
        </View>
        ))
      )}

      <Text style={[styles.sectionTitle, styles.addTitle]}>Add corridor</Text>
      <View style={styles.form}>
        <Field label="Origin city" value={originCity} onChangeText={setOriginCity} />
        <Field label="Origin lat" value={originLat} onChangeText={setOriginLat} keyboard="decimal-pad" />
        <Field label="Origin lng" value={originLng} onChangeText={setOriginLng} keyboard="decimal-pad" />
        <Field label="Destination city" value={destCity} onChangeText={setDestCity} />
        <Field label="Destination lat" value={destLat} onChangeText={setDestLat} keyboard="decimal-pad" />
        <Field label="Destination lng" value={destLng} onChangeText={setDestLng} keyboard="decimal-pad" />
        <Field
          label="Expected duration (hours)"
          value={durationHours}
          onChangeText={setDurationHours}
          keyboard="decimal-pad"
        />
        <LoadingButton title="Add corridor" isLoading={submitting} onPress={handleAdd} style={styles.addBtnLoading} />
      </View>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboard,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboard?: "default" | "decimal-pad";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboard}
        placeholderTextColor={colors.textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginVertical: spacing.xl },
  sectionTitle: {
    ...typography.body,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  addTitle: { marginTop: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  route: { ...typography.body, fontWeight: "600", color: colors.textPrimary, flex: 1 },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeOn: { backgroundColor: colors.success + "25" },
  badgeOff: { backgroundColor: colors.textSecondary + "25" },
  badgeText: { ...typography.caption, fontWeight: "600" },
  meta: { ...typography.caption, color: colors.textSecondary, marginBottom: 2 },
  toggleBtn: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
  },
  toggleText: { ...typography.caption, color: colors.primary, fontWeight: "600" },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xl,
  },
  field: { marginBottom: spacing.sm },
  fieldLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.sm,
    padding: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  addBtnLoading: { marginTop: spacing.sm },
  addBtnText: { ...typography.button, color: colors.white },
});
