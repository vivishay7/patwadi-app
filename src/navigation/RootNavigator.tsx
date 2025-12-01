import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Auth screens
import SplashScreen from "../screens/SplashScreen";
import LoginScreen from "../screens/LoginScreen";
import RoleSelectScreen from "../screens/RoleSelectScreen";

// Main app
import MainTabs from "./MainTabs";

// Customer Parcel Flow
import SendParcelScreen from "../screens/SendParcelScreen";
import PickupScreen from "../screens/parcel/PickupScreen";
import DropoffScreen from "../screens/parcel/DropoffScreen";
import ParcelDetailsScreen from "../screens/parcel/ParcelDetailsScreen";
import PriceEstimateScreen from "../screens/parcel/PriceEstimateScreen";
import ConfirmOrderScreen from "../screens/parcel/ConfirmOrderScreen";

// Camera
import CameraMeasureScreen from "../screens/camera/CameraMeasureScreen";

// Driver Parcel Flow
import DriverParcelsScreen from "../screens/driver/DriverParcelsScreen";
import DriverParcelDetailsScreen from "../screens/driver/DriverParcelDetailsScreen";

// Driver Onboarding
import {
  DriverKycScreen,
  DriverBusDetailsScreen,
  DriverTermsScreen,
} from "../screens/onboarding/driver";

/**
 * Parcel data structure for driver flow
 */
export interface ParcelData {
  id: string;
  route: string;
  size: string;
  weight: string;
  pickup: string;
  drop: string;
}

/**
 * Root Stack navigation param list with strict typing
 */
export type RootStackParamList = {
  // Auth Flow
  Splash: undefined;
  Login: undefined;
  RoleSelect: undefined;

  // Driver Onboarding
  DriverKyc: undefined;
  DriverBusDetails: undefined;
  DriverTerms: undefined;

  // Main App
  Main: undefined;

  // Customer Parcel Flow
  SendParcel: undefined;
  Pickup: undefined;
  Dropoff: undefined;
  ParcelDetails: { capturedImage?: string } | undefined;
  PriceEstimate: undefined;
  ConfirmOrder: undefined;

  // Camera
  CameraMeasure: undefined;

  // Driver Flow
  DriverParcels: undefined;
  DriverParcelDetails: { parcel: ParcelData };
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
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />

      {/* Driver Onboarding */}
      <Stack.Screen name="DriverKyc" component={DriverKycScreen} />
      <Stack.Screen name="DriverBusDetails" component={DriverBusDetailsScreen} />
      <Stack.Screen name="DriverTerms" component={DriverTermsScreen} />

      {/* Main App */}
      <Stack.Screen name="Main" component={MainTabs} />

      {/* Customer Parcel Flow */}
      <Stack.Screen name="SendParcel" component={SendParcelScreen} />
      <Stack.Screen name="Pickup" component={PickupScreen} />
      <Stack.Screen name="Dropoff" component={DropoffScreen} />
      <Stack.Screen name="ParcelDetails" component={ParcelDetailsScreen} />
      <Stack.Screen name="PriceEstimate" component={PriceEstimateScreen} />
      <Stack.Screen name="ConfirmOrder" component={ConfirmOrderScreen} />

      {/* Camera */}
      <Stack.Screen name="CameraMeasure" component={CameraMeasureScreen} />

      {/* Driver Flow */}
      <Stack.Screen name="DriverParcels" component={DriverParcelsScreen} />
      <Stack.Screen
        name="DriverParcelDetails"
        component={DriverParcelDetailsScreen}
      />
    </Stack.Navigator>
  );
}
