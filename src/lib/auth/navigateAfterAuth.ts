import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppUser } from "../db/types";
import { isProfileIdentityComplete } from "../userDisplayName";
import {
  clearPendingCheckout,
  getPendingCheckout,
} from "../checkout/pendingCheckout";
import { resolvePostAuthRoute, PostAuthRoute } from "./postAuthRoute";
import type { RootStackParamList } from "../../navigation/RootNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Resume parcel checkout after auth — keeps draft until ConfirmOrder opens. */
export async function tryResumeCheckoutNavigation(
  navigation: Nav,
  user: AppUser
): Promise<boolean> {
  const pending = await getPendingCheckout();
  if (!pending) return false;
  if (user.role !== "customer") return false;
  if (!isProfileIdentityComplete(user.full_name)) return false;

  await clearPendingCheckout();
  navigation.replace("ConfirmOrder", pending);
  return true;
}

export async function navigateAfterAuth(
  navigation: Nav,
  user: AppUser
): Promise<void> {
  if (await tryResumeCheckoutNavigation(navigation, user)) return;
  navigation.replace(resolvePostAuthRoute(user) as PostAuthRoute);
}
