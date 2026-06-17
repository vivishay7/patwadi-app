import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import AdminParcelsScreen from "../screens/admin/AdminParcelsScreen";
import AdminParcelDetailsScreen from "../screens/admin/AdminParcelDetailsScreen";

export type AdminStackParamList = {
  AdminDashboard: undefined;
  AdminParcels: undefined;
  AdminParcelDetails: { orderId: string };
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export default function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminParcels" component={AdminParcelsScreen} />
      <Stack.Screen name="AdminParcelDetails" component={AdminParcelDetailsScreen} />
    </Stack.Navigator>
  );
}

