import * as FileSystem from "expo-file-system/legacy";

/** Read a local camera/gallery URI into bytes for Supabase Storage upload. */
export async function uriToUploadBody(
  uri: string,
  mimeType = "image/jpeg"
): Promise<{ body: Uint8Array; mimeType: string }> {
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    const res = await fetch(uri);
    if (!res.ok) {
      throw new Error("Could not download the photo. Check your connection and try again.");
    }
    const buffer = await res.arrayBuffer();
    return { body: new Uint8Array(buffer), mimeType: res.headers.get("content-type") || mimeType };
  }

  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new Error("Photo file is missing. Take the bus photo again.");
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { body: bytes, mimeType };
}
