import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, StyleSheet } from "react-native";
import HomeScreen from "../screens/HomeScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";
import { spacing, radius } from "../constants";

export type BottomTabParamList = {
  Home: undefined;
  Notifications: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home-outline";

          if (route.name === "Home") iconName = "home-outline";
          if (route.name === "Notifications") iconName = "notifications-outline";
          if (route.name === "Settings") iconName = "menu-outline";

          return (
            <View style={styles.tabItem}>
              <Ionicons
                name={iconName}
                size={26}
                color={colors.black}
                style={styles.tabIcon}
              />
              {focused && <View style={styles.activeIndicator} />}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    height: 60,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabIcon: {
    marginBottom: spacing.xs,
  },
  activeIndicator: {
    width: 22,
    height: 3,
    borderRadius: radius.xs,
    backgroundColor: colors.primary,
  },
});
