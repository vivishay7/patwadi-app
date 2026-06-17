/**
 * LocationAutocomplete Component
 * Reusable autocomplete input for location search
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";
import { useAutocomplete } from "../hooks/useAutocomplete";
import { MapboxFeature, SelectedLocation } from "../lib/mapbox";

// ============================================
// TYPES
// ============================================

interface LocationAutocompleteProps {
  /** Placeholder text */
  placeholder?: string;
  /** Label text */
  label?: string;
  /** Initial value */
  initialValue?: string;
  /** Callback when location is selected */
  onSelect: (location: SelectedLocation) => void;
  /** Callback when input changes */
  onChangeText?: (text: string) => void;
  /** Countries to limit results */
  countries?: string[];
  /** City name to filter results by */
  city?: string;
  /** State name to filter results by */
  state?: string;
  /** Custom styles for container */
  containerStyle?: object;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Icon name (Ionicons) */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Whether the field is required */
  required?: boolean;
  /** Error message */
  errorMessage?: string;
}

// ============================================
// COMPONENT
// ============================================

export function LocationAutocomplete({
  placeholder = "Search location...",
  label,
  initialValue = "",
  onSelect,
  onChangeText,
  countries = ["in"],
  city,
  state,
  containerStyle,
  autoFocus = false,
  icon = "location-outline",
  required = false,
  errorMessage,
}: LocationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [showResults, setShowResults] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(initialValue || null);

  const {
    results,
    loading,
    error,
    setQuery,
    selectLocation,
    clearResults,
    isConfigured,
  } = useAutocomplete({ countries, city, state });

  // Handle text change
  const handleTextChange = useCallback((text: string) => {
    setInputValue(text);
    setSelectedAddress(null);
    setQuery(text);
    setShowResults(true);
    onChangeText?.(text);
  }, [setQuery, onChangeText]);

  // Handle location selection
  const handleSelect = useCallback((feature: MapboxFeature) => {
    const location = selectLocation(feature);
    setInputValue(feature.place_name);
    setSelectedAddress(feature.place_name);
    setShowResults(false);
    clearResults();
    Keyboard.dismiss();
    onSelect(location);
  }, [selectLocation, clearResults, onSelect]);

  // Handle clear
  const handleClear = useCallback(() => {
    setInputValue("");
    setSelectedAddress(null);
    setQuery("");
    clearResults();
    setShowResults(false);
  }, [setQuery, clearResults]);

  // Handle focus
  const handleFocus = useCallback(() => {
    if (inputValue && !selectedAddress) {
      setShowResults(true);
    }
  }, [inputValue, selectedAddress]);

  // Handle blur
  const handleBlur = useCallback(() => {
    // Delay hiding results to allow selection
    setTimeout(() => {
      setShowResults(false);
    }, 200);
  }, []);

  // Render result item
  const renderResultItem = useCallback(({ item }: { item: MapboxFeature }) => {
    // Extract locality/city from context
    const locality = item.context?.find(c => c.id.startsWith("place"))?.text;
    
    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <Ionicons name="location" size={20} color={colors.primary} style={styles.resultIcon} />
        <View style={styles.resultContent}>
          <Text style={styles.resultText} numberOfLines={1}>
            {item.text}
          </Text>
          <Text style={styles.resultSubtext} numberOfLines={1}>
            {item.place_name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [handleSelect]);

  // Not configured warning
  if (!isConfigured) {
    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        )}
        <View style={[styles.inputContainer, styles.inputDisabled]}>
          <Ionicons name={icon} size={20} color={colors.textSecondary} style={styles.inputIcon} />
          <Text style={styles.disabledText}>Location search unavailable</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <View style={styles.inputWrapper}>
        <View style={[
          styles.inputContainer,
          showResults && results.length > 0 && styles.inputContainerActive,
          errorMessage && styles.inputContainerError,
        ]}>
          <Ionicons name={icon} size={20} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            value={inputValue}
            onChangeText={handleTextChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            autoFocus={autoFocus}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {loading && (
            <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
          )}
          {inputValue.length > 0 && !loading && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Results dropdown */}
        {showResults && results.length > 0 && (
          <View style={styles.resultsContainer}>
            {results.map((item) => (
              <React.Fragment key={item.id}>{renderResultItem({ item })}</React.Fragment>
            ))}
          </View>
        )}

        {/* Error state */}
        {showResults && error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* Validation error */}
      {errorMessage && (
        <Text style={styles.validationError}>{errorMessage}</Text>
      )}

      {/* Selected address indicator */}
      {selectedAddress && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={styles.selectedText}>Location selected</Text>
        </View>
      )}
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.error,
  },
  inputWrapper: {
    position: "relative",
    zIndex: 100,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  inputContainerActive: {
    borderColor: colors.primary,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  inputContainerError: {
    borderColor: colors.error,
  },
  inputDisabled: {
    backgroundColor: colors.borderLight,
  },
  disabledText: {
    ...typography.body,
    color: colors.textSecondary,
    paddingVertical: spacing.md + 2,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md + 2,
    fontSize: 16,
    color: colors.textPrimary,
  },
  loader: {
    marginLeft: spacing.sm,
  },
  clearButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  resultsContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.primary,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    maxHeight: 250,
    overflow: "hidden",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  resultIcon: {
    marginRight: spacing.md,
  },
  resultContent: {
    flex: 1,
  },
  resultText: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  resultSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: "#FEE2E2",
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginLeft: spacing.xs,
  },
  validationError: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  selectedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  selectedText: {
    ...typography.caption,
    color: colors.success,
    marginLeft: spacing.xs,
  },
});

export default LocationAutocomplete;

