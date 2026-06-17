import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { SavedAddress } from "../lib/db/types";
import {
  fetchSavedAddresses,
  savedAddressToLocationData,
} from "../services/addressBookService";
import { LocationData } from "../types/location";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";

type Props = {
  onSelect: (location: LocationData, saved: SavedAddress) => void;
};

export default function SavedAddressPicker({ onSelect }: Props) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setAddresses([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchSavedAddresses(user.id);
      setAddresses(rows);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (!user?.id) return null;

  if (loading && addresses.length === 0) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!addresses.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Saved addresses</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {addresses.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.chip}
            onPress={() => onSelect(savedAddressToLocationData(item), item)}
            activeOpacity={0.85}
          >
            <Ionicons name="location" size={16} color={colors.primary} />
            <View style={styles.chipText}>
              <Text style={styles.chipLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.chipAddress} numberOfLines={1}>
                {item.apartment_building ? `${item.apartment_building}, ` : ""}
                {item.address}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  loadingWrap: {
    marginBottom: spacing.lg,
    alignItems: "flex-start",
  },
  title: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    maxWidth: 220,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  chipText: {
    flexShrink: 1,
  },
  chipLabel: {
    ...typography.bodySmall,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  chipAddress: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
