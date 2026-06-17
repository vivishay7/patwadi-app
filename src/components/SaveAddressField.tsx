import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";
import { ADDRESS_LABEL_PRESETS } from "../services/addressBookService";

type Props = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  label: string;
  onLabelChange: (value: string) => void;
  disabled?: boolean;
  disabledHint?: string;
};

export default function SaveAddressField({
  enabled,
  onEnabledChange,
  label,
  onLabelChange,
  disabled,
  disabledHint,
}: Props) {
  const isPreset = label === "Home" || label === "Work";
  const showCustomLabel = enabled && !isPreset;

  return (
    <View style={styles.wrap}>
      <View style={styles.switchRow}>
        <View style={styles.switchLabel}>
          <Ionicons name="bookmark-outline" size={20} color={colors.primary} />
          <Text style={styles.switchText}>Save to address book</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onEnabledChange}
          disabled={disabled}
          trackColor={{ false: colors.borderLight, true: colors.secondary }}
          thumbColor={enabled ? colors.primary : colors.white}
        />
      </View>

      {disabled && disabledHint ? (
        <Text style={styles.hint}>{disabledHint}</Text>
      ) : null}

      {enabled && !disabled ? (
        <View style={styles.labelSection}>
          <Text style={styles.labelTitle}>Save as</Text>
          <View style={styles.presetRow}>
            {ADDRESS_LABEL_PRESETS.map((preset) => {
              const active =
                preset === "Other" ? showCustomLabel : label === preset;
              return (
                <TouchableOpacity
                  key={preset}
                  style={[styles.presetChip, active && styles.presetChipActive]}
                  onPress={() => {
                    if (preset === "Other") {
                      onLabelChange("");
                    } else {
                      onLabelChange(preset);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.presetText, active && styles.presetTextActive]}>
                    {preset}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {showCustomLabel ? (
            <TextInput
              style={styles.labelInput}
              placeholder="e.g. Mom's place, Office gate…"
              placeholderTextColor={colors.textSecondary}
              value={label}
              onChangeText={onLabelChange}
              maxLength={40}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  switchText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  labelSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  labelTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  presetChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  presetText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  presetTextActive: {
    color: colors.white,
  },
  labelInput: {
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
});
