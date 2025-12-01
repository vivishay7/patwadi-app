import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CustomerHome() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Search bar */}
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.8}>
          <Ionicons name="search-outline" size={20} color={colors.dark} />
          <Text style={styles.searchText}>Enter pickup location</Text>
        </TouchableOpacity>

        {/* Big banner */}
        <View style={styles.card}>
          <Image
            source={{ uri: "https://i.imgur.com/mUyXe2o.jpeg" }}
            style={styles.cardImage}
          />
          <Text style={styles.cardTitle}>Rapido Pickup Point</Text>
          <Text style={styles.cardMeta}>Secure packaging • Efficient pickup</Text>

          <TouchableOpacity
            style={styles.cardButton}
            onPress={() => navigation.navigate("SendParcel")}
            activeOpacity={0.8}
          >
            <Text style={styles.cardButtonText}>Explore more options</Text>
          </TouchableOpacity>
        </View>

        {/* Depot card */}
        <View style={styles.card}>
          <Image
            source={{ uri: "https://i.imgur.com/86FoyKm.jpeg" }}
            style={styles.cardImage}
          />
          <Text style={styles.cardTitle}>Intercity Bus Depot</Text>
          <Text style={styles.cardMeta}>
            Standard seating • Complimentary scans
          </Text>

          <TouchableOpacity style={styles.cardButton} activeOpacity={0.8}>
            <Text style={styles.cardButtonText}>Check availability</Text>
          </TouchableOpacity>
        </View>

        {/* Tracking card */}
        <View style={styles.card}>
          <Image
            source={{ uri: "https://i.imgur.com/YcYqD2s.jpeg" }}
            style={styles.cardImage}
          />
          <Text style={styles.cardTitle}>Real-time Delivery Tracking</Text>
          <Text style={styles.cardMeta}>Live updates • History logs</Text>

          <TouchableOpacity style={styles.cardButton} activeOpacity={0.8}>
            <Text style={styles.cardButtonText}>View details</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.nextPage}>Next page →</Text>
        </TouchableOpacity>
      </ScrollView>
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
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.massive + spacing.massive,
  },

  /* Search */
  searchBar: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flexDirection: "row",
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xl,
  },
  searchText: {
    marginLeft: spacing.md,
    ...typography.body,
    color: colors.textSecondary,
  },

  /* Cards */
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardImage: {
    width: "100%",
    height: 130,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.bodyLarge,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  cardMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  cardButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  cardButtonText: {
    ...typography.buttonSmall,
    color: colors.white,
  },

  nextPage: {
    marginTop: spacing.md,
    textAlign: "center",
    ...typography.body,
    color: colors.primary,
  },
});
