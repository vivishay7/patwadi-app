import { Platform } from "react-native";
import type { TranslationKey } from "../../i18n/strings";
import { STRINGS, AppLocale } from "../../i18n/strings";

type NotificationsModule = typeof import("expo-notifications");

let Notifications: NotificationsModule | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require("expo-notifications") as NotificationsModule;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  Notifications = null;
}

let permissionRequested = false;

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("operator-alerts", {
      name: "Operator alerts",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
  }

  if (permissionRequested) {
    const settings = await Notifications.getPermissionsAsync();
    return settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  }
  permissionRequested = true;
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function notifyOperatorAlert(params: {
  id: string;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  bodyArgs?: string;
  locale?: AppLocale;
}): Promise<void> {
  if (!Notifications) return;

  const ok = await ensureNotificationPermission();
  if (!ok) return;

  const locale = params.locale ?? "en";
  const title = STRINGS[locale][params.titleKey];
  let body = STRINGS[locale][params.bodyKey];
  if (params.bodyArgs) {
    body = `${params.bodyArgs} ${body}`;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: params.id,
    content: {
      title,
      body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null,
  });
}
