import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, StyleSheet } from "react-native";
import HomeScreen from "../screens/HomeScreen";
import MyPackagesScreen from "../screens/packages/MyPackagesScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import MyTripsScreen from "../screens/driver/MyTripsScreen";
import DriverParcelsScreen from "../screens/driver/DriverParcelsScreen";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";
import { spacing, radius } from "../constants";
import { useRole } from "../context/RoleContext";
import { OperatorAlertsProvider, useOperatorAlerts } from "../context/OperatorAlertsContext";

export type CustomerTabParamList = {
  Home: undefined;
  Packages: { openTrack?: boolean } | undefined;
  Notifications: undefined;
  Settings: undefined;
};

export type OperatorTabParamList = {
  Home: undefined;
  Trips: undefined;
  Parcels: { showAvailable?: boolean } | undefined;
  Settings: undefined;
};

const CustomerTab = createBottomTabNavigator<CustomerTabParamList>();
const OperatorTab = createBottomTabNavigator<OperatorTabParamList>();

type BadgeColor = "red" | "green";

function TabIcon({
  routeName,
  focused,
  badges = [],
}: {
  routeName: string;
  focused: boolean;
  badges?: BadgeColor[];
}) {
  let iconName: keyof typeof Ionicons.glyphMap = "home-outline";

  if (routeName === "Home") iconName = "home-outline";
  if (routeName === "Packages" || routeName === "Parcels") iconName = "cube-outline";
  if (routeName === "Trips") iconName = "bus-outline";
  if (routeName === "Notifications") iconName = "notifications-outline";
  if (routeName === "Settings") iconName = "menu-outline";

  return (
    <View style={styles.tabItem}>
      <View style={styles.iconWrap}>
        <Ionicons name={iconName} size={26} color={colors.black} style={styles.tabIcon} />
        {badges.includes("red") ? <View style={[styles.badgeDot, styles.badgeRed]} /> : null}
        {badges.includes("green") ? (
          <View
            style={[
              styles.badgeDot,
              styles.badgeGreen,
              badges.includes("red") && styles.badgeGreenOffset,
            ]}
          />
        ) : null}
      </View>
      {focused && <View style={styles.activeIndicator} />}
    </View>
  );
}

const tabScreenOptions = (routeName: string) => ({
  headerShown: false,
  tabBarShowLabel: false,
  tabBarStyle: styles.tabBar,
  tabBarIcon: ({ focused }: { focused: boolean }) => (
    <TabIcon routeName={routeName} focused={focused} />
  ),
});

function OperatorTabsInner() {
  const { role } = useRole();
  const isLinehaul = role === "linehaul";
  const { availableJobsCount, pendingTransfers, parcelsActionRequired } = useOperatorAlerts();

  const parcelsBadges: BadgeColor[] = [];
  if (role === "linehaul" && parcelsActionRequired) parcelsBadges.push("red");
  if (availableJobsCount > 0) parcelsBadges.push("green");

  const tripsBadges: BadgeColor[] =
    role === "linehaul" && pendingTransfers.length > 0 ? ["green"] : [];

  const homeBadges: BadgeColor[] = [];
  if (availableJobsCount > 0 || pendingTransfers.length > 0) homeBadges.push("green");

  return (
    <OperatorTab.Navigator>
      <OperatorTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon routeName="Home" focused={focused} badges={homeBadges} />
          ),
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: styles.tabBar,
        }}
      />
      {isLinehaul ? (
        <OperatorTab.Screen
          name="Trips"
          component={MyTripsScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon routeName="Trips" focused={focused} badges={tripsBadges} />
            ),
            headerShown: false,
            tabBarShowLabel: false,
            tabBarStyle: styles.tabBar,
          }}
        />
      ) : null}
      <OperatorTab.Screen
        name="Parcels"
        component={DriverParcelsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon routeName="Parcels" focused={focused} badges={parcelsBadges} />
          ),
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: styles.tabBar,
        }}
      />
      <OperatorTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon routeName="Settings" focused={focused} />,
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: styles.tabBar,
        }}
      />
    </OperatorTab.Navigator>
  );
}

export default function MainTabs() {
  const { role } = useRole();
  const isOperator = role === "linehaul" || role === "lmp";

  if (isOperator) {
    return (
      <OperatorAlertsProvider>
        <OperatorTabsInner />
      </OperatorAlertsProvider>
    );
  }

  return (
    <CustomerTab.Navigator screenOptions={({ route }) => tabScreenOptions(route.name)}>
      <CustomerTab.Screen name="Home" component={HomeScreen} />
      <CustomerTab.Screen name="Packages" component={MyPackagesScreen} />
      <CustomerTab.Screen name="Notifications" component={NotificationsScreen} />
      <CustomerTab.Screen name="Settings" component={SettingsScreen} />
    </CustomerTab.Navigator>
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
  tabItem: { alignItems: "center", justifyContent: "center" },
  iconWrap: { position: "relative" },
  tabIcon: { marginBottom: spacing.xs },
  badgeDot: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.white,
  },
  badgeRed: { backgroundColor: colors.error },
  badgeGreen: { backgroundColor: colors.success },
  badgeGreenOffset: { right: 6, top: 4 },
  activeIndicator: {
    width: 22,
    height: 3,
    borderRadius: radius.xs,
    backgroundColor: colors.primary,
  },
});
