import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { useAuth } from "../../context/AuthContext";
import { DEFAULT_CONDUCTOR_TIMEZONE, validateTripSchedule } from "../../lib/domain/tripLimits";
import {
  formatVehiclePlateInput,
  validateIndianVehiclePlate,
} from "../../lib/domain/vehiclePlate";
import { fetchApprovedCorridorsForOperator, type CorridorDefinition } from "../../lib/domain/corridors";
import {
  createLinehaulTrip,
  previewTripCreation,
  publishTripToOpen,
  fetchEligibleLinehaulConductors,
  type EligibleLinehaulConductor,
} from "../../services/tripService";
import { startTripTracking } from "../../lib/location/tripTracking";
import ConductorPickerSheet from "../../components/ConductorPickerSheet";
import EmptyState from "../../components/EmptyState";
import { LoadingButton } from "../../components/LoadingButton";
import { useToast } from "../../hooks/useToast";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { Ionicons } from "@expo/vector-icons";

type Nav = NativeStackNavigationProp<RootStackParamList, "CreateTrip">;

const TZ = DEFAULT_CONDUCTOR_TIMEZONE;

function splitLocalDateTime(d: Date): { date: string; time: string } {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("day")}/${get("month")}/${get("year")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

function defaultDepartureDate(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 3, 0, 0, 0);
  return d;
}

function addHoursLocal(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

function combineLocalDateTime(date: string, time: string): string | null {
  const dm = date.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const tm = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!dm || !tm) return null;
  const day = Number(dm[1]);
  const month = Number(dm[2]);
  const year = Number(dm[3]);
  const hour = Number(tm[1]);
  const minute = Number(tm[2]);
  if (day < 1 || day > 31 || month < 1 || month > 12 || hour > 23 || minute > 59) {
    return null;
  }
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function formatPhoneInput(text: string): string {
  return text.replace(/\D/g, "").slice(0, 10);
}

export default function CreateTripScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { showSuccess } = useToast();

  const initialDeparture = defaultDepartureDate();
  const initialParts = splitLocalDateTime(initialDeparture);
  const initialArrival = splitLocalDateTime(addHoursLocal(initialDeparture, 5));

  const [corridorId, setCorridorId] = useState<string>("");
  const [corridors, setCorridors] = useState<CorridorDefinition[]>([]);
  const [corridorSearch, setCorridorSearch] = useState("");
  const [corridorsLoading, setCorridorsLoading] = useState(true);
  const [busNumber, setBusNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [departureDate, setDepartureDate] = useState(initialParts.date);
  const [departureTime, setDepartureTime] = useState(initialParts.time);
  const [arrivalDate, setArrivalDate] = useState(initialArrival.date);
  const [arrivalTime, setArrivalTime] = useState(initialArrival.time);
  const [capacityCount, setCapacityCount] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMimeType, setPhotoMimeType] = useState<string>("image/jpeg");
  const [plateHint, setPlateHint] = useState<string | null>(null);
  const [previewExtra, setPreviewExtra] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tripCoverageType, setTripCoverageType] = useState<"full" | "partial">("full");
  const [plannedCoConductorId, setPlannedCoConductorId] = useState<string | null>(null);
  const [coPickerOpen, setCoPickerOpen] = useState(false);
  const [coLabel, setCoLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setCorridors([]);
      setCorridorsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchApprovedCorridorsForOperator(user.id);
        if (!cancelled) {
          setCorridors(list);
          if (list.length === 1) {
            setCorridorId(list[0].key);
          } else if (list.length && !corridorId) {
            setCorridorId(list[0].key);
          }
        }
      } finally {
        if (!cancelled) setCorridorsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const filteredCorridors = useMemo(() => {
    const q = corridorSearch.trim().toLowerCase();
    if (!q) return corridors;
    return corridors.filter((c) => {
      const label = `${c.origin.city} ${c.destination.city} ${c.key}`.toLowerCase();
      return label.includes(q);
    });
  }, [corridors, corridorSearch]);

  const syncArrivalFromDeparture = (date: string, time: string) => {
    const depIso = combineLocalDateTime(date, time);
    if (!depIso) return;
    const arrival = splitLocalDateTime(addHoursLocal(new Date(depIso), 5));
    setArrivalDate(arrival.date);
    setArrivalTime(arrival.time);
  };

  const handlePreview = async () => {
    if (!user?.id) return;
    const scheduledDepartureAt = combineLocalDateTime(departureDate, departureTime);
    if (!scheduledDepartureAt) {
      Alert.alert("Check departure", "Use date DD/MM/YYYY and time HH:MM (24-hour).");
      return;
    }
    const preview = await previewTripCreation({
      conductorId: user.id,
      scheduledDepartureAt,
    });
    setPreviewExtra(preview.is_extra_trip);
    Alert.alert(
      preview.is_extra_trip ? "Extra trip on this date" : "Standard trip on this date",
      preview.is_extra_trip
        ? "You already have a trip departing on this calendar day. This one counts as an extra trip and needs admin approval before it can go live."
        : "This is your first trip on this departure date. After the bus photo is added, you can publish right away."
    );
  };

  const setPhotoFromAsset = (asset: ImagePicker.ImagePickerAsset) => {
    if (asset.uri) {
      setPhotoUri(asset.uri);
      setPhotoMimeType(asset.mimeType ?? "image/jpeg");
    }
  };

  const pickGallery = async () => {
    const lib = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
    });
    if (!lib.canceled && lib.assets[0]) {
      setPhotoFromAsset(lib.assets[0]);
    }
  };

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Camera permission needed",
          "Allow Camera in Settings → Patwadi, then try again.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Use gallery", onPress: () => void pickGallery() },
          ]
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoFromAsset(result.assets[0]);
      }
    } catch (e) {
      console.error("pickPhoto:", e);
      Alert.alert("Camera unavailable", "Try again or pick from gallery.", [
        { text: "Cancel", style: "cancel" },
        { text: "Gallery", onPress: () => void pickGallery() },
      ]);
    }
  };

  const handlePublish = async () => {
    if (!user?.id) return;
    if (!busNumber.trim() || !driverName.trim() || !driverPhone.trim()) {
      Alert.alert("Missing fields", "Bus number, driver name, and phone are required.");
      return;
    }
    const plate = validateIndianVehiclePlate(busNumber);
    if (!plate.ok) {
      Alert.alert("Invalid bus number plate", plate.reason);
      return;
    }
    if (driverPhone.length !== 10) {
      Alert.alert("Invalid phone", "Enter a 10-digit Indian mobile number.");
      return;
    }
    if (!photoUri) {
      Alert.alert("Bus proof required", "Take a photo of the bus before publishing.");
      return;
    }
    if (!corridorId) {
      Alert.alert("Select corridor", "Choose an active corridor for this trip.");
      return;
    }
    if (tripCoverageType === "partial" && !plannedCoConductorId) {
      Alert.alert("Co-conductor required", "Select who will take over partway through this trip.");
      return;
    }

    const scheduledDepartureAt = combineLocalDateTime(departureDate, departureTime);
    const expectedArrivalAt = combineLocalDateTime(arrivalDate, arrivalTime);
    if (!scheduledDepartureAt || !expectedArrivalAt) {
      Alert.alert(
        "Check date & time",
        "Use DD/MM/YYYY for dates and HH:MM (24-hour) for times, e.g. 15/06/2026 and 11:30."
      );
      return;
    }
    const schedule = validateTripSchedule({ scheduledDepartureAt, expectedArrivalAt });
    if (!schedule.ok) {
      Alert.alert("Check date & time", schedule.reason);
      return;
    }

    setSubmitting(true);
    const result = await createLinehaulTrip({
      conductorId: user.id,
      corridorId,
      busNumber: plate.normalized,
      driverName: driverName.trim(),
      driverPhone: driverPhone.trim(),
      scheduledDepartureAt,
      expectedArrivalAt,
      capacityCount: capacityCount ? Number(capacityCount) : undefined,
      busProofPhotoUri: photoUri,
      busProofMimeType: photoMimeType,
      tripCoverageType,
      plannedCoConductorId: plannedCoConductorId ?? undefined,
    });

    if ("error" in result) {
      setSubmitting(false);
      Alert.alert("Could not publish", result.error);
      return;
    }

    const publish = await publishTripToOpen(result.trip.id, user.id);
    setSubmitting(false);

    if ("error" in publish) {
      Alert.alert(
        "Trip saved as draft",
        publish.error + "\n\nOpen Trip Detail when ready to publish."
      );
      navigation.replace("TripDetail", { tripId: result.trip.id });
      return;
    }

    await startTripTracking({
      tripId: publish.trip.id,
      role: "linehaul",
      corridorId: publish.trip.corridor_id,
    });

    showSuccess("Trip published — your trip is live and accepting parcels.");
    navigation.replace("TripDetail", { tripId: publish.trip.id });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Publish Trip</Text>
        <Text style={styles.subtitle}>All times are in India Standard Time (IST).</Text>

        <Text style={styles.label}>Corridor</Text>
        {corridorsLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.chipLoader} />
        ) : corridors.length === 0 ? (
          <EmptyState
            title="No corridors assigned"
            message="Contact Patwadi ops to get corridor access before publishing trips."
            style={styles.corridorEmpty}
          />
        ) : (
          <>
            <TextInput
              style={styles.corridorSearch}
              value={corridorSearch}
              onChangeText={setCorridorSearch}
              placeholder="Search corridors…"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {filteredCorridors.length === 0 ? (
              <Text style={styles.emptyCorridors}>No corridors match your search.</Text>
            ) : (
              <View style={styles.corridorList}>
                {filteredCorridors.map((c) => {
                  const selected = corridorId === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      style={[styles.corridorRow, selected && styles.corridorRowOn]}
                      onPress={() => setCorridorId(c.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.corridorRowText, selected && styles.corridorRowTextOn]}>
                        {c.origin.city} → {c.destination.city}
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        <Field
          label="Bus number plate"
          value={busNumber}
          onChangeText={(v) => {
            const next = formatVehiclePlateInput(v);
            setBusNumber(next);
            const check = validateIndianVehiclePlate(next);
            if (!next.trim()) {
              setPlateHint(null);
            } else if (check.ok) {
              setPlateHint(`${check.format === "bharat" ? "Bharat (BH)" : "State"} plate · ${check.display}`);
            } else {
              setPlateHint(check.reason);
            }
          }}
          placeholder="CH 01 AB 1234 or 22 BH 1234"
          autoCapitalize="characters"
        />
        {plateHint ? (
          <Text
            style={[
              styles.plateHint,
              validateIndianVehiclePlate(busNumber).ok ? styles.plateHintOk : styles.plateHintError,
            ]}
          >
            {plateHint}
          </Text>
        ) : (
          <Text style={styles.plateHelp}>
            State plate: CH01AB1234 · Bharat plate: 22BH1234 or 22BH1234AA
          </Text>
        )}
        <Field label="Driver name" value={driverName} onChangeText={setDriverName} />
        <Field
          label="Driver phone"
          value={driverPhone}
          onChangeText={(v) => setDriverPhone(formatPhoneInput(v))}
          keyboardType="phone-pad"
          placeholder="10-digit mobile"
          maxLength={10}
        />

        <Text style={styles.sectionLabel}>Departure</Text>
        <View style={styles.dateTimeRow}>
          <Field
            label="Date"
            value={departureDate}
            onChangeText={(v) => {
              setDepartureDate(v);
              syncArrivalFromDeparture(v, departureTime);
            }}
            placeholder="DD/MM/YYYY"
            flex={1}
          />
          <Field
            label="Time"
            value={departureTime}
            onChangeText={(v) => {
              setDepartureTime(v);
              syncArrivalFromDeparture(departureDate, v);
            }}
            placeholder="HH:MM"
            flex={1}
          />
        </View>

        <Text style={styles.sectionLabel}>Expected arrival</Text>
        <View style={styles.dateTimeRow}>
          <Field
            label="Date"
            value={arrivalDate}
            onChangeText={setArrivalDate}
            placeholder="DD/MM/YYYY"
            flex={1}
          />
          <Field
            label="Time"
            value={arrivalTime}
            onChangeText={setArrivalTime}
            placeholder="HH:MM"
            flex={1}
          />
        </View>

        <Field
          label="Capacity (parcels)"
          value={capacityCount}
          onChangeText={setCapacityCount}
          keyboardType="number-pad"
        />

        <Text style={styles.sectionLabel}>Who is conducting?</Text>
        <TouchableOpacity
          style={[styles.mcqOption, tripCoverageType === "full" && styles.mcqOptionOn]}
          onPress={() => {
            setTripCoverageType("full");
            setPlannedCoConductorId(null);
            setCoLabel(null);
          }}
        >
          <Ionicons
            name={tripCoverageType === "full" ? "radio-button-on" : "radio-button-off"}
            size={20}
            color={tripCoverageType === "full" ? colors.primary : colors.textSecondary}
          />
          <Text style={styles.mcqText}>I'm conducting the full trip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mcqOption, tripCoverageType === "partial" && styles.mcqOptionOn]}
          onPress={() => setTripCoverageType("partial")}
        >
          <Ionicons
            name={tripCoverageType === "partial" ? "radio-button-on" : "radio-button-off"}
            size={20}
            color={tripCoverageType === "partial" ? colors.primary : colors.textSecondary}
          />
          <Text style={styles.mcqText}>Another conductor takes over partway</Text>
        </TouchableOpacity>
        {tripCoverageType === "partial" && (
          <TouchableOpacity style={styles.coPickBtn} onPress={() => setCoPickerOpen(true)}>
            <Text style={styles.coPickText}>
              {coLabel ? `Co-conductor: ${coLabel}` : "Select co-conductor"}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
          <Ionicons name="camera-outline" size={20} color={colors.white} />
          <Text style={styles.photoBtnText}>{photoUri ? "Retake bus proof" : "Take bus proof photo"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => void pickGallery()}>
          <Text style={styles.secondaryBtnText}>Choose bus photo from gallery</Text>
        </TouchableOpacity>
        {photoUri && <Image source={{ uri: photoUri }} style={styles.preview} />}

        {previewExtra != null && (
          <Text style={styles.previewNote}>
            {previewExtra
              ? "Extra trip on this date — admin must approve before publish."
              : "Standard trip on this date — can publish after bus photo."}
          </Text>
        )}

        <TouchableOpacity style={styles.secondaryBtn} onPress={handlePreview}>
          <Text style={styles.secondaryBtnText}>Check: standard or extra trip?</Text>
        </TouchableOpacity>
        <Text style={styles.previewHelp}>
          Uses your departure date to see if this is your first trip that day (standard) or a second+
          trip (extra, needs admin approval).
        </Text>

        <LoadingButton
          title="Publish Trip"
          isLoading={submitting}
          onPress={handlePublish}
          disabled={corridors.length === 0 || !corridorId}
          style={styles.primaryBtnMargin}
        />
      </ScrollView>

      {user?.id && (
        <ConductorPickerSheet
          visible={coPickerOpen}
          onClose={() => setCoPickerOpen(false)}
          currentConductorId={user.id}
          title="Planned co-conductor"
          onSelect={async (id) => {
            setPlannedCoConductorId(id);
            const list = await fetchEligibleLinehaulConductors();
            const match = list.find((c: EligibleLinehaulConductor) => c.id === id);
            setCoLabel(match?.phone ?? `${id.slice(0, 8)}…`);
          }}
        />
      )}
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  placeholder,
  maxLength,
  flex,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "phone-pad" | "number-pad";
  placeholder?: string;
  maxLength?: number;
  flex?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={[styles.field, flex != null && { flex }]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.massive },
  back: { marginBottom: spacing.md },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg },
  sectionLabel: { ...typography.bodySmall, fontWeight: "700", color: colors.textPrimary, marginBottom: spacing.sm },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  corridorSearch: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
  },
  corridorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  corridorRowOn: { borderColor: colors.primary, backgroundColor: colors.secondary },
  corridorRowText: { ...typography.bodySmall, color: colors.textPrimary },
  corridorRowTextOn: { color: colors.primary, fontWeight: "600" },
  corridorList: { marginBottom: spacing.lg },
  chipLoader: { marginBottom: spacing.lg },
  corridorEmpty: { paddingVertical: spacing.lg, marginBottom: spacing.lg },
  emptyCorridors: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg },
  primaryBtnMargin: { marginTop: spacing.lg },
  plateHelp: { ...typography.caption, color: colors.textSecondary, marginTop: -spacing.sm, marginBottom: spacing.md },
  plateHint: { ...typography.caption, marginTop: -spacing.sm, marginBottom: spacing.md },
  plateHintOk: { color: colors.success },
  plateHintError: { color: colors.error },
  dateTimeRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  field: { marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  photoBtn: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  photoBtnText: { ...typography.button, color: colors.white },
  preview: { width: "100%", height: 160, borderRadius: radius.md, marginBottom: spacing.md },
  previewNote: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  previewHelp: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  secondaryBtnText: { ...typography.body, color: colors.primary, fontWeight: "600" },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
  },
  primaryBtnText: { ...typography.button, color: colors.white },
  mcqOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  mcqOptionOn: { borderColor: colors.primary, backgroundColor: colors.secondary },
  mcqText: { ...typography.bodySmall, color: colors.textPrimary, flex: 1 },
  coPickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.lg,
  },
  coPickText: { ...typography.bodySmall, color: colors.primary, fontWeight: "600" },
});
