import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../theme/colors";
import { spacing } from "../constants";

interface ScreenWrapperProps {
  children: React.ReactNode;
  /** Use ScrollView instead of View */
  scroll?: boolean;
  /** Add horizontal padding (default: true) */
  padded?: boolean;
  /** Use SafeAreaView (default: true) */
  safe?: boolean;
  /** Enable keyboard avoiding behavior */
  keyboardAvoiding?: boolean;
  /** Custom background color */
  backgroundColor?: string;
  /** Custom container style */
  style?: ViewStyle;
  /** Content container style for ScrollView */
  contentContainerStyle?: ViewStyle;
}

export function ScreenWrapper({
  children,
  scroll = false,
  padded = true,
  safe = true,
  keyboardAvoiding = false,
  backgroundColor = colors.background,
  style,
  contentContainerStyle,
}: ScreenWrapperProps) {
  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
  };

  const paddingStyle: ViewStyle = padded
    ? { paddingHorizontal: spacing.xl }
    : {};

  const content = scroll ? (
    <ScrollView
      style={[styles.scrollView, paddingStyle]}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.container, paddingStyle, style]}>{children}</View>
  );

  const wrappedContent = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  if (safe) {
    return (
      <SafeAreaView style={containerStyle} edges={["top", "left", "right"]}>
        <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
        {wrappedContent}
      </SafeAreaView>
    );
  }

  return (
    <View style={containerStyle}>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      {wrappedContent}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.massive,
  },
});

export default ScreenWrapper;

