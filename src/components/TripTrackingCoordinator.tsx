import { useEffect } from "react";
import { AppState } from "react-native";
import { useAuth } from "../context/AuthContext";
import { refreshTrackingWindows } from "../lib/location/tripTracking";

/** Keeps §19.2 tracking windows in sync with auth + app foreground. */
export default function TripTrackingCoordinator() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const run = () => {
      refreshTrackingWindows({ userId: user.id, role: user.role }).catch((e) =>
        console.error("refreshTrackingWindows:", e)
      );
    };

    run();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") run();
    });
    return () => sub.remove();
  }, [isAuthenticated, user?.id, user?.role]);

  return null;
}
