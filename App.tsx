import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNavigator from "./src/navigation/RootNavigator";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import { ProfileProvider } from "./src/context/ProfileContext";
import { RoleProvider } from "./src/context/RoleContext";
import { DriverStatusProvider } from "./src/context/DriverStatusContext";
import { validateSupabaseConfig } from "./src/lib/supabaseClient";
import { useEffect } from "react";

export default function App() {
  // Validate Supabase on app start
  useEffect(() => {
    const validation = validateSupabaseConfig();
    if (!validation.valid) {
      console.warn("⚠️ App started with invalid Supabase config:", validation.error);
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ProfileProvider>
            <DriverStatusProvider>
              <RoleProvider>
                <NavigationContainer>
                  <StatusBar style="dark" />
                  <RootNavigator />
                </NavigationContainer>
              </RoleProvider>
            </DriverStatusProvider>
          </ProfileProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
