import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Auth screens
import SplashScreen from "../screens/SplashScreen";
import { LoginScreen, OTPScreen } from "../screens/auth";
import RoleSelectScreen from "../screens/RoleSelectScreen";

// Main app
import MainTabs from "./MainTabs";

// Camera (fullscreen modal)
import CameraMeasureScreen from "../screens/camera/CameraMeasureScreen";

// Driver Onboarding
import {
  DriverKycScreen,
  DriverBusDetailsScreen,
  DriverTermsScreen,
} from "../screens/driver";

// Profile
import { ProfileSetupScreen, EditProfileScreen } from "../screens/profile";

// Re-export ParcelData for backward compatibility
export { ParcelData } from "./HomeStack";

/**
 * Root Stack navigation param list with strict typing
 *
 * Navigation Structure:
 * ├── Auth Flow (Splash → Login → OTP → RoleSelect)
 * ├── Profile Setup (ProfileSetup)
 * ├── Driver Onboarding (DriverKyc → DriverBusDetails → DriverTerms)
 * ├── Main (Tab Navigator)
 * │   ├── Home (HomeStack)
 * │   ├── Packages (PackagesStack)
 * │   ├── Notifications
 * │   └── More (MoreStack)
 * └── CameraMeasure (Modal)
 */
export type RootStackParamList = {
  // Auth Flow
  Splash: undefined;
  Login: undefined;
  OTP: { phone: string };
  RoleSelect: undefined;

  // Profile Setup
  ProfileSetup: undefined;

  // Driver Onboarding
  DriverKyc: undefined;
  DriverBusDetails: undefined;
  DriverTerms: undefined;

  // Main App (contains 4 tabs: Home, Packages, Notifications, More)
  Main: undefined;

  // Camera (fullscreen modal - no tab bar)
  CameraMeasure: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false }}
    >
      {/* Auth Flow */}
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />

      {/* Profile Setup */}
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />

      {/* Driver Onboarding */}
      <Stack.Screen name="DriverKyc" component={DriverKycScreen} />
      <Stack.Screen name="DriverBusDetails" component={DriverBusDetailsScreen} />
      <Stack.Screen name="DriverTerms" component={DriverTermsScreen} />

      {/* Main App */}
      <Stack.Screen name="Main" component={MainTabs} />

      {/* Camera (fullscreen modal - no tab bar) */}
      <Stack.Screen name="CameraMeasure" component={CameraMeasureScreen} />
    </Stack.Navigator>
  );
}
