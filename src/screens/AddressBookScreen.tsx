import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../context/AuthContext";
import { SavedAddress } from "../lib/db/types";
import {
  deleteSavedAddress,
  fetchSavedAddresses,
  renameSavedAddress,
  isAddressBookExtended,
  addressBookLimitLabel,
  ADDRESS_HARD_LIMIT,
} from "../services/addressBookService";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";

type Nav = NativeStackNavigationProp<RootStackParamList, "AddressBook">;

export default function AddressBookScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [extended, setExtended] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  const load = useCallback(async () => {
    if (!user?.id) {
      setAddresses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [rows, ext] = await Promise.all([
        fetchSavedAddresses(user.id),
        isAddressBookExtended(user.id),
      ]);
      setAddresses(rows);
      setExtended(ext);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleDelete = (item: SavedAddress) => {
    Alert.alert("Remove address?", `Delete "${item.label}" from your address book?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const ok = await deleteSavedAddress(item.id);
          if (ok) void load();
        },
      },
    ]);
  };

  const handleRename = (item: SavedAddress) => {
    setRenameId(item.id);
    setRenameText(item.label);
  };

  const submitRename = async () => {
    if (!renameId || !renameText.trim()) return;
    const ok = await renameSavedAddress(renameId, renameText.trim());
    setRenameId(null);
    setRenameText("");
    if (ok) void load();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Address book</Text>
        {user?.id && addresses.length > 0 ? (
          <Text style={styles.limitHint}>
            {addressBookLimitLabel(addresses.length, extended)}
            {!extended && addresses.length >= ADDRESS_HARD_LIMIT - 5
              ? ` · up to ${ADDRESS_HARD_LIMIT} after you confirm`
              : ""}
          </Text>
        ) : null}
      </View>

      {!user?.id ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Log in to save and manage addresses.</Text>
        </View>
      ) : loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : addresses.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bookmark-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No saved addresses yet</Text>
          <Text style={styles.emptyText}>
            When you send a parcel, tick “Save to address book” and name the place — like Home or
            Work.
          </Text>
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardLabel}>{item.label}</Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => handleRename(item)} hitSlop={8}>
                    <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.cardLine} numberOfLines={2}>
                {item.apartment_building ? `${item.apartment_building}, ` : ""}
                {item.street ? `${item.street}, ` : ""}
                {item.address}
              </Text>
              {item.phone_number ? (
                <Text style={styles.cardMeta}>{item.phone_number}</Text>
              ) : null}
            </View>
          )}
        />
      )}

      <Modal visible={!!renameId} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename address</Text>
            <TextInput
              style={styles.modalInput}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Label"
              autoFocus
              maxLength={40}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setRenameId(null)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void submitRename()}>
                <Text style={styles.modalSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  back: { padding: spacing.xs },
  title: { ...typography.h2, color: colors.textPrimary, flex: 1 },
  limitHint: {
    ...typography.caption,
    color: colors.textSecondary,
    width: "100%",
    paddingLeft: spacing.xl + spacing.md,
  },
  loader: { marginTop: spacing.xxl },
  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  cardLabel: { ...typography.body, fontWeight: "700", color: colors.textPrimary },
  cardActions: { flexDirection: "row", gap: spacing.md },
  cardLine: { ...typography.bodySmall, color: colors.textSecondary },
  cardMeta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: { ...typography.body, fontWeight: "700", color: colors.textPrimary },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  modalTitle: { ...typography.body, fontWeight: "700", marginBottom: spacing.md },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  modalCancel: { ...typography.body, color: colors.textSecondary },
  modalSave: { ...typography.body, fontWeight: "700", color: colors.primary },
});
