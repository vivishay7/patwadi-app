import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import { useConductorLock } from "../hooks/useConductorLock";
import { useIncompleteTripAction } from "../hooks/useIncompleteTripAction";
import ConductorLockOverlay from "./ConductorLockOverlay";
import TripArrivalExtensionPrompt from "./TripArrivalExtensionPrompt";
import TripIncompleteActionPrompt from "./TripIncompleteActionPrompt";

/**
 * Linehaul-only gates: full-screen lock when handoffs are overdue,
 * arrival extension prompt while en route, incomplete-trip co-conductor check.
 */
export default function LinehaulConductorGates() {
  const { role } = useRole();
  const { user } = useAuth();
  const lockState = useConductorLock();
  const { trip: incompleteTrip, refresh, dismiss } = useIncompleteTripAction();

  useEffect(() => {
    if (role === "linehaul" && user?.id && !lockState.locked) {
      void refresh();
    }
  }, [role, user?.id, lockState.locked, refresh]);

  if (role !== "linehaul") return null;

  return (
    <>
      <ConductorLockOverlay lockState={lockState} />
      {!lockState.locked && <TripArrivalExtensionPrompt />}
      {!lockState.locked && incompleteTrip && user?.id ? (
        <TripIncompleteActionPrompt
          visible
          trip={incompleteTrip}
          conductorId={user.id}
          onClose={dismiss}
          onResolved={() => void refresh()}
        />
      ) : null}
    </>
  );
}
