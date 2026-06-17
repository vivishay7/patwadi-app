import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigatorScreenParams } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { View, Text, StyleSheet } from "react-native";

// Auth screens
import SplashScreen from "../screens/SplashScreen";
import LoginScreen from "../screens/LoginScreen";
import RoleSelectScreen from "../screens/RoleSelectScreen";

// Main app
import MainTabs from "./MainTabs";
import AdminStack from "./AdminStack";

// Customer Parcel Flow
import SendParcelScreen from "../screens/SendParcelScreen";
import PackageInfoScreen from "../screens/parcel/PackageInfoScreen";
import PickupScreen from "../screens/parcel/PickupScreen";
import DropoffScreen from "../screens/parcel/DropoffScreen";
import ParcelDetailsScreen from "../screens/parcel/ParcelDetailsScreen";
import PriceEstimateScreen from "../screens/parcel/PriceEstimateScreen";
import ConfirmOrderScreen from "../screens/parcel/ConfirmOrderScreen";

// Camera
import CameraMeasureScreen from "../screens/camera/CameraMeasureScreen";

// Packages screens
import PackageDetailsScreen from "../screens/packages/PackageDetailsScreen";
import TrackingDetailsScreen from "../screens/packages/TrackingDetailsScreen";
import AdminLoginScreen from "../screens/admin/AdminLoginScreen";

// Handoff
import ConfirmHandoffScreen from "../screens/handoff/ConfirmHandoffScreen";
import MyHandoffCodesScreen from "../screens/handoff/MyHandoffCodesScreen";

// Driver Parcel Flow
import DriverParcelsScreen from "../screens/driver/DriverParcelsScreen";
import DriverParcelDetailsScreen from "../screens/driver/DriverParcelDetailsScreen";
import MyTripsScreen from "../screens/driver/MyTripsScreen";
import TripDetailScreen from "../screens/driver/TripDetailScreen";
import CreateTripScreen from "../screens/driver/CreateTripScreen";
import AddressBookScreen from "../screens/AddressBookScreen";
import CompleteProfileScreen from "../screens/CompleteProfileScreen";
import { CustomerTabParamList } from "./MainTabs";

import OperatorPendingScreen from "../screens/OperatorPendingScreen";
import { LocationData } from "../types/location";

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
 * Order creation flow data (passed through screens)
 */
export interface OrderFlowData {
  pickup?: LocationData;
  dropoff?: LocationData;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  contents?: string;
  priceEstimate?: number;
  corridorKey?: string;
  capturedImage?: string;
}

/**
 * Root Stack navigation param list with strict typing
 */
export type RootStackParamList = {
  // Auth Flow
  Splash: undefined;
  Login: { mode?: "signin" | "signup"; resumeCheckout?: boolean } | undefined;
  AdminLogin: undefined;
  RoleSelect: undefined;

  OperatorPending: undefined;

  // Main App
  Main: NavigatorScreenParams<CustomerTabParamList> | undefined;
  Admin: undefined;

  // Customer Parcel Flow
  SendParcel: undefined;
  PackageInfo: undefined; // New comprehensive package details screen
  Pickup: { packageInfo?: any } | undefined; // Receives package info
  Dropoff: { pickup?: LocationData; packageInfo?: any } | undefined; // Passes package info through
  ParcelDetails: { pickup?: LocationData; dropoff?: LocationData; packageInfo?: any } | undefined; // Old screen kept for now
  PriceEstimate:
    | {
        pickup?: LocationData;
        dropoff?: LocationData;
        packageInfo?: any;
        priceEstimate?: number;
        corridorKey?: string;
      }
    | undefined;
  ConfirmOrder:
    | {
        pickup?: LocationData;
        dropoff?: LocationData;
        packageInfo?: any;
        priceEstimate?: number;
        corridorKey?: string;
      }
    | undefined;

  // Packages screens (nested in Main tabs or standalone)
  MyPackages: undefined;
  PackageDetails: { orderId: string };
  TrackingDetails: { orderId: string };

  // Custody handoff
  ConfirmHandoff: {
    parcelId: string;
    step: "customer_to_lmp" | "lmp_to_linehaul" | "linehaul_to_lmp" | "lmp_to_customer";
  };

  MyHandoffCodes: undefined;

  // Camera
  CameraMeasure: undefined;
  CameraMeasureResult: { capturedImage: string; dimensions?: { length: number; width: number; height: number } } | undefined;

  // Driver Flow
  DriverParcels: undefined;
  DriverParcelDetails: {
    parcel?: ParcelData;
    orderId?: string;
    availableParcel?: {
      id: string;
      pickup_location: string;
      dropoff_location: string;
      weight_kg?: number | null;
      corridor_key?: string | null;
      created_at: string;
    };
  };
  MyTrips: undefined;
  TripDetail: { tripId: string };
  CreateTrip: undefined;

  AddressBook: undefined;

  CompleteProfile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AdminGate() {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <View style={gateStyles.container}>
        <Text style={gateStyles.title}>Access denied</Text>
        <Text style={gateStyles.subtitle}>Admin permission required.</Text>
      </View>
    );
  }
  return <AdminStack />;
}

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false }}
    >
      {/* Auth Flow */}
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
      <Stack.Screen name="OperatorPending" component={OperatorPendingScreen} />

      {/* Main App */}
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="Admin" component={AdminGate} />

      {/* Customer Parcel Flow */}
      <Stack.Screen name="SendParcel" component={SendParcelScreen} />
      <Stack.Screen name="PackageInfo" component={PackageInfoScreen} />
      <Stack.Screen name="Pickup" component={PickupScreen} />
      <Stack.Screen name="Dropoff" component={DropoffScreen} />
      <Stack.Screen name="ParcelDetails" component={ParcelDetailsScreen} />
      <Stack.Screen name="PriceEstimate" component={PriceEstimateScreen} />
      <Stack.Screen name="ConfirmOrder" component={ConfirmOrderScreen} />

      {/* Camera */}
      <Stack.Screen name="CameraMeasure" component={CameraMeasureScreen} />

      {/* Packages screens */}
      <Stack.Screen name="PackageDetails" component={PackageDetailsScreen} />
      <Stack.Screen name="TrackingDetails" component={TrackingDetailsScreen} />

      {/* Custody handoff */}
      <Stack.Screen name="ConfirmHandoff" component={ConfirmHandoffScreen} />
      <Stack.Screen name="MyHandoffCodes" component={MyHandoffCodesScreen} />

      {/* Driver Flow */}
      <Stack.Screen name="DriverParcels" component={DriverParcelsScreen} />
      <Stack.Screen name="DriverParcelDetails" component={DriverParcelDetailsScreen} />
      <Stack.Screen name="MyTrips" component={MyTripsScreen} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} />
      <Stack.Screen name="CreateTrip" component={CreateTripScreen} />
      <Stack.Screen name="AddressBook" component={AddressBookScreen} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
    </Stack.Navigator>
  );
}

const gateStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { marginTop: 8, opacity: 0.7 },
});
