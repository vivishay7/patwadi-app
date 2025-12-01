// src/lib/whatsapp.ts
import { Linking, Alert } from "react-native";

export async function openWhatsApp(phone: string, message: string) {
  const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;

  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    Alert.alert("WhatsApp not installed", "Please install WhatsApp to continue.");
    return;
  }
  return Linking.openURL(url);
}
