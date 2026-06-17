// src/screens/HomeScreen.tsx
import CustomerHome from "./home/CustomerHome";
import DriverHome from "./home/DriverHome";
import { useRole } from "../context/RoleContext";

export default function HomeScreen() {
  const { role } = useRole();

  // OPERATOR VIEW (LMP / linehaul)
  if (role === "lmp" || role === "linehaul") {
    return <DriverHome />;
  }

  // CUSTOMER VIEW
  return <CustomerHome />;
}
