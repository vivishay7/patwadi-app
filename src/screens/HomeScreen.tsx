// src/screens/HomeScreen.tsx
import { CustomerHomeScreen, DriverHomeScreen } from "./home";
import { useRole } from "../context/RoleContext";

/**
 * HomeScreen
 * Role-aware wrapper that renders the appropriate home screen
 * based on the current user's role (customer or driver)
 */
export default function HomeScreen() {
  const { role } = useRole();

  // DRIVER VIEW
  if (role === "driver") {
    return <DriverHomeScreen />;
  }

  // CUSTOMER VIEW
  return <CustomerHomeScreen />;
}
