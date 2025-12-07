/**
 * SectionHeader Component
 * Reusable section header with optional "See all" button
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import colors from "../theme/colors";
import { spacing, typography } from "../constants";

interface SectionHeaderProps {
  /** Section title */
  title: string;
  /** Optional "See all" callback */
  onPress?: () => void;
  /** Custom "See all" text */
  actionText?: string;
}

export function SectionHeader({ 
  title, 
  onPress, 
  actionText = "See all" 
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {onPress && (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          <Text style={styles.action}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.bodyLarge,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  action: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: "600",
  },
});

export default SectionHeader;
