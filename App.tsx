// Must be imported first for React Native Gesture Handler
import "react-native-gesture-handler";
import "react-native-url-polyfill/auto";
// §19 — register background location task before app renders
import "./src/lib/location/locationTask";

import { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import RootNavigator from "./src/navigation/RootNavigator";
import AuthNavigationSync from "./src/navigation/AuthNavigationSync";
import { navigationRef } from "./src/navigation/navigationRef";
import TripTrackingCoordinator from "./src/components/TripTrackingCoordinator";
import LinehaulConductorGates from "./src/components/LinehaulConductorGates";
import { AuthProvider } from "./src/context/AuthContext";
import { RoleProvider } from "./src/context/RoleContext";
import { LocaleProvider } from "./src/context/LocaleContext";
import { ToastProvider } from "./src/hooks/useToast";
import { OfflineBanner } from "./src/components/OfflineBanner";
import { validateSupabase } from "./src/lib/supabase";

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
        <ToastProvider>
          <OfflineBanner />
          <LocaleProvider>
            <AuthProvider>
              <RoleProvider>
                <TripTrackingCoordinator />
                <LinehaulConductorGates />
                <NavigationContainer ref={navigationRef}>
                  <AuthNavigationSync />
                  <StatusBar style="dark" />
                  <RootNavigator />
                </NavigationContainer>
              </RoleProvider>
            </AuthProvider>
          </LocaleProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
