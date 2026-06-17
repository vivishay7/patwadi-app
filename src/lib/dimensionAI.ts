import * as FileSystem from "expo-file-system";

// Dimension AI endpoint (hardcoded - does not require Supabase client)
const DIMENSION_AI_ENDPOINT =
  "https://xkaxwxdjzklpxnnhkkwo.supabase.co/functions/v1/dim-ai";

export interface DimensionEstimate {
  estimated_length_cm: number;
  estimated_width_cm: number;
  estimated_height_cm: number;
  confidence?: number;
}

/**
 * Sends an image to the dimension AI service and returns estimated dimensions
 * @param imageUri - The local URI of the image (e.g., file:///path/to/image.jpg)
 * @returns Dimension estimates or null if failed
 */
export async function estimateDimensionsFromImage(
  imageUri: string
): Promise<DimensionEstimate | null> {
  try {
    // Read image as base64
    // Check if EncodingType exists, otherwise use string literal
    const encoding = FileSystem.EncodingType?.Base64 || "base64";
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: encoding as FileSystem.EncodingType,
    });

    const response = await fetch(DIMENSION_AI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      console.error("Dimension AI error:", response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    return data as DimensionEstimate;
  } catch (error) {
    console.error("Error estimating dimensions:", error);
    return null;
  }
}

/**
 * Legacy function name for backwards compatibility
 * @deprecated Use estimateDimensionsFromImage instead
 */
export async function sendImageForMeasurement(
  imageUri: string
): Promise<DimensionEstimate | null> {
  return estimateDimensionsFromImage(imageUri);
}
