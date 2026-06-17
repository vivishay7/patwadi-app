import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";
import ConductorPickerSheet from "./ConductorPickerSheet";
import type { LinehaulTrip } from "../lib/db/types";
import {
  declareIncompleteTripCoConductor,
  resolveIncompleteTripSolo,
} from "../services/tripService";
import { incompleteTripActionMessage } from "../lib/domain/incompleteTrip";

type Props = {
  visible: boolean;
  trip: LinehaulTrip;
  conductorId: string;
  onClose: () => void;
  onResolved: () => void;
};

export default function TripIncompleteActionPrompt({
  visible,
  trip,
  conductorId,
  onClose,
  onResolved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!visible) setPickerOpen(false);
  }, [visible]);

  const handleSolo = async () => {
    setLoading(true);
    const result = await resolveIncompleteTripSolo(trip.id);
    setLoading(false);
    if ("error" in result) return;
    onResolved();
    onClose();
  };

  const handleCoConductor = async (coId: string) => {
    setLoading(true);
    const result = await declareIncompleteTripCoConductor(trip.id, coId);
    setLoading(false);
    if ("error" in result) return;
    onResolved();
    onClose();
  };

  return (
    <>
      <Modal visible={visible && !pickerOpen} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={styles.iconRow}>
              <Ionicons name="alert-circle-outline" size={28} color={colors.warning} />
              <Text style={styles.title}>Quick check on your trip</Text>
            </View>
            <Text style={styles.body}>{incompleteTripActionMessage(trip)}</Text>
            <Text style={styles.hint}>
              This helps us keep custody records accurate. Ops may follow up if needed.
            </Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setPickerOpen(true)}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>Yes — another conductor took over</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => void handleSolo()}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.secondaryBtnText}>No — I ran the full trip solo</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={styles.dismiss}>
              <Text style={styles.dismissText}>Remind me later</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ConductorPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        currentConductorId={conductorId}
        title="Who took over?"
        onSelect={(id) => void handleCoConductor(id)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: { ...typography.h2, color: colors.textPrimary, flex: 1 },
  body: { ...typography.body, color: colors.textPrimary, marginBottom: spacing.sm },
  hint: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  primaryBtnText: { ...typography.button, color: colors.white },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  secondaryBtnText: { ...typography.button, color: colors.primary },
  dismiss: { alignItems: "center", paddingVertical: spacing.sm },
  dismissText: { ...typography.caption, color: colors.textSecondary },
});
