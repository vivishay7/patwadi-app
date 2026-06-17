import { Alert } from "react-native";
import { useRole } from "../context/RoleContext";
import { useTripArrivalExtension } from "../hooks/useTripArrivalExtension";
import ConfirmDialog from "./ConfirmDialog";

export default function TripArrivalExtensionPrompt() {
  const { role } = useRole();
  const { trip, distanceKm, extending, dismiss, acceptExtension } =
    useTripArrivalExtension();

  if (role !== "linehaul" || !trip) {
    return null;
  }

  const distanceLabel =
    distanceKm != null ? `${Math.round(distanceKm)} km` : "far from destination";

  const handleConfirm = async () => {
    const result = await acceptExtension();
    if (!result.ok) {
      Alert.alert("Could not extend arrival", result.error ?? "Please try again.");
      return;
    }
    Alert.alert(
      "Arrival extended",
      "Expected arrival has been extended by 30 minutes. Our team has been notified."
    );
  };

  return (
    <ConfirmDialog
      visible
      title="Extend expected arrival?"
      message={`You are about ${distanceLabel} from ${trip.route_label.split(" → ").pop()?.trim() ?? "destination"} with roughly 30 minutes until the scheduled arrival.\n\nWould you like to extend expected arrival by 30 minutes? This can only be done once for this trip.`}
      confirmLabel="Extend 30 min"
      cancelLabel="Not now"
      loading={extending}
      onCancel={dismiss}
      onConfirm={() => {
        void handleConfirm();
      }}
    />
  );
}
