import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HomeStackParamList } from "../navigation/HomeStack";

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

interface MenuOption {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const options: MenuOption[] = [
  { id: "1", label: "Track Delivery", icon: "navigate-outline" },
  { id: "2", label: "Schedule Pickup", icon: "calendar-outline" },
  { id: "3", label: "Important Updates", icon: "information-circle-outline" },
  { id: "4", label: "Weight Balance", icon: "barbell-outline" },
  { id: "5", label: "Bus Depots", icon: "bus-outline" },
  { id: "6", label: "Intercity Transport", icon: "swap-horizontal-outline" },
];

export default function SendParcelScreen() {
  const navigation = useNavigation<NavigationProp>();

  const handlePress = (label: string) => {
    if (label === "Schedule Pickup" || label === "Intercity Transport") {
      navigation.navigate("Pickup");
      return;
    }
    // Other menu items can be wired later
  };

  const renderItem = ({ item }: { item: MenuOption }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handlePress(item.label)}
      activeOpacity={0.8}
    >
      <Ionicons name={item.icon} size={26} color={colors.black} />
      <Text style={styles.label}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.heading}>Send Parcel</Text>

        <FlatList
          data={options}
          numColumns={2}
          columnWrapperStyle={styles.row}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: spacing.xl,
  },
  heading: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  row: {
    justifyContent: "space-between",
  },
  listContent: {
    paddingBottom: spacing.massive,
  },
  card: {
    backgroundColor: colors.surface,
    width: "48%",
    paddingVertical: spacing.xxl,
    borderRadius: radius.md,
    alignItems: "center",
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  label: {
    marginTop: spacing.md,
    ...typography.body,
    fontWeight: "500",
    color: colors.textPrimary,
    textAlign: "center",
  },
});
