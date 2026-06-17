import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { AppLocale, LOCALE_LABELS, LOCALE_ORDER } from "../i18n/strings";
import { useLocale } from "../context/LocaleContext";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";

type Props = {
  compact?: boolean;
};

export default function LanguageToggle({ compact }: Props) {
  const { locale, setLocale, t } = useLocale();

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {!compact && <Text style={styles.label}>{t("language")}</Text>}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {LOCALE_ORDER.map((code: AppLocale) => {
          const active = locale === code;
          return (
            <TouchableOpacity
              key={code}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setLocale(code)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {LOCALE_LABELS[code]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  chipTextActive: {
    color: colors.white,
  },
});
