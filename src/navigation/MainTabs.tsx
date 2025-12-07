import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, StyleSheet } from "react-native";
import HomeStack from "./HomeStack";
import PackagesStack from "./PackagesStack";
import MoreStack from "./MoreStack";
import NotificationsScreen from "../screens/NotificationsScreen";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";
import { spacing } from "../constants";
import { useRole } from "../context/RoleContext";

export type BottomTabParamList = {
  Home: undefined;
  Packages: undefined;
  Notifications: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

/**
 * Main Tab Navigator
 *
 * 4 tabs: Home | Packages | Notifications | More
 *
 * Role-based behavior:
 * - Customer: Home shows discovery, Packages shows "My Packages"
 * - Driver: Home shows dashboard, Packages shows "Assigned Orders"
 */
export default function MainTabs() {
  const { role } = useRole();
  const isDriver = role === "driver";

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home-outline";

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Packages") {
            iconName = focused ? "cube" : "cube-outline";
          } else if (route.name === "Notifications") {
            iconName = focused ? "notifications" : "notifications-outline";
          } else if (route.name === "More") {
            iconName = focused ? "menu" : "menu-outline";
          }

          return (
            <View style={styles.tabItem}>
              <Ionicons name={iconName} size={26} color={color} />
              {focused && <View style={styles.activeIndicator} />}
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: isDriver ? "Dashboard" : "Home",
        }}
      />
      <Tab.Screen
        name="Packages"
        component={PackagesStack}
        options={{
          tabBarLabel: isDriver ? "Orders" : "Packages",
        }}
      />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="More" component={MoreStack} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    height: 70,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    elevation: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: spacing.xs,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  activeIndicator: {
    position: "absolute",
    top: -spacing.sm,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});
