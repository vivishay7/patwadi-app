// src/screens/HomeScreen.tsx
import CustomerHome from "./home/CustomerHome";
import DriverHome from "./home/DriverHome";
import { useRole } from "../context/RoleContext";

export default function HomeScreen() {
  const { role } = useRole();

  // DRIVER VIEW
  if (role === "driver") {
    return <DriverHome />;
  }

  // CUSTOMER VIEW
  return <CustomerHome />;
}
