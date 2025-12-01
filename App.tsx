import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNavigator from "./src/navigation/RootNavigator";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import { RoleProvider } from "./src/context/RoleContext";
import { validateSupabase } from "./src/lib/supabase";
import { useEffect } from "react";

export default function App() {
  // Validate Supabase on app start
  useEffect(() => {
    const validation = validateSupabase();
    if (!validation.valid) {
      console.warn("⚠️ App started with invalid Supabase config:", validation.error);
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RoleProvider>
            <NavigationContainer>
              <StatusBar style="dark" />
              <RootNavigator />
            </NavigationContainer>
          </RoleProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
