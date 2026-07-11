import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  AppLocale,
  LOCALE_LABELS,
  LOCALE_ORDER,
  LOCALE_SHORT_LABELS,
} from "../i18n/strings";
import { useLocale } from "../context/LocaleContext";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";

type Props = {
  compact?: boolean;
};

export default function LanguageToggle({ compact }: Props) {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);

  const handleSelect = (code: AppLocale) => {
    setLocale(code);
    setOpen(false);
  };

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.row}>
        {!compact && <Text style={styles.label}>{t("language")}</Text>}
        <TouchableOpacity
          style={styles.trigger}
          onPress={() => setOpen(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t("language")}
        >
          <Text style={styles.triggerText}>{LOCALE_SHORT_LABELS[locale]}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.menu} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.menuTitle}>{t("language")}</Text>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {LOCALE_ORDER.map((code: AppLocale) => {
                const active = locale === code;
                return (
                  <TouchableOpacity
                    key={code}
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => handleSelect(code)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.optionShort, active && styles.optionTextActive]}>
                      {LOCALE_SHORT_LABELS[code]}
                    </Text>
                    <Text style={[styles.optionLabel, active && styles.optionTextActive]}>
                      {LOCALE_LABELS[code]}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={18} color={colors.white} />
                    ) : (
                      <View style={styles.checkPlaceholder} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  wrapCompact: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    minWidth: 64,
    justifyContent: "center",
  },
  triggerText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    maxHeight: "70%",
  },
  menuTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  optionActive: {
    backgroundColor: colors.primary,
  },
  optionShort: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.textPrimary,
    width: 28,
  },
  optionLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    flex: 1,
  },
  optionTextActive: {
    color: colors.white,
  },
  checkPlaceholder: {
    width: 18,
  },
});
