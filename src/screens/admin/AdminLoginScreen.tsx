/**
 * Dead code — admin sign-in now uses LoginScreen (email/password) and routes via
 * admin_profiles.active. Kept for reference; Splash no longer links here.
 */
import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { adminSignInWithPassword, fetchAdminProfile } from "../../lib/api/adminAuth";
import { supabase } from "../../lib/supabase";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "AdminLogin">;

export default function AdminLoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Enter admin email and password.");
      return;
    }

    setLoading(true);
    try {
      const signIn = await adminSignInWithPassword(email.trim(), password);
      if (signIn.error) {
        Alert.alert("Login failed", signIn.error);
        return;
      }

      // Double-check admin membership before allowing access.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        Alert.alert("Login failed", "No authenticated admin session.");
        return;
      }
      const adminProfile = await fetchAdminProfile(user.id);
      if (adminProfile.error || !adminProfile.data) {
        await supabase.auth.signOut();
        Alert.alert("Access denied", "This account does not have admin access.");
        return;
      }

      // AuthContext will hydrate isAdmin after SIGNED_IN.
      navigation.replace("Admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Admin Login</Text>
        <Text style={styles.subtitle}>Restricted ops access</Text>

        <TextInput
          style={styles.input}
          placeholder="admin@patwadi.com"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} activeOpacity={0.8} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Sign in</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.replace("Splash")} style={styles.backBtn}>
          <Text style={styles.backText}>Back to app</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.xl, justifyContent: "center" },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xl },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: spacing.md,
  },
  buttonText: { ...typography.button, color: colors.white },
  backBtn: { marginTop: spacing.lg, alignItems: "center" },
  backText: { ...typography.bodySmall, color: colors.textSecondary },
});

