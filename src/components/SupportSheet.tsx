import { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Linking,
  Alert,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";
import {
  buildSupportDeepLink,
  SupportContext,
} from "../lib/support/buildSupportDeepLink";

interface SupportSheetProps {
  visible: boolean;
  onClose: () => void;
  context: SupportContext;
  issueTypes: readonly string[];
  title?: string;
}

export default function SupportSheet({
  visible,
  onClose,
  context,
  issueTypes,
  title = "Contact support",
}: SupportSheetProps) {
  const [issueType, setIssueType] = useState(issueTypes[0] ?? "Other");
  const [message, setMessage] = useState("");

  const handleOpenWhatsApp = async () => {
    const url = buildSupportDeepLink(context, issueType, message);
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(
          "Cannot open WhatsApp",
          "Please install WhatsApp or try again from your device browser."
        );
        return;
      }
      await Linking.openURL(url);
      onClose();
    } catch {
      Alert.alert("Error", "Failed to open WhatsApp.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Choose an issue type and add a short note. WhatsApp opens with context
            pre-filled — you tap send.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {issueTypes.map((type) => {
              const selected = issueType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setIssueType(type)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TextInput
            style={styles.input}
            placeholder="Add details (optional)"
            placeholderTextColor={colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity style={styles.waButton} onPress={handleOpenWhatsApp} activeOpacity={0.8}>
            <Ionicons name="logo-whatsapp" size={22} color={colors.white} />
            <Text style={styles.waButtonText}>Open WhatsApp</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  chipsRow: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.secondary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
  input: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    marginBottom: spacing.lg,
  },
  waButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
  },
  waButtonText: {
    ...typography.button,
    color: colors.white,
  },
});
