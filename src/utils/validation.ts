/**
 * Validation Utilities
 * Reusable validation functions for forms
 */

/**
 * Validate Indian phone number (10 digits)
 */
export function validatePhoneNumber(phone: string): {
  isValid: boolean;
  error?: string;
} {
  // Remove all non-digits
  const digitsOnly = phone.replace(/\D/g, "");

  // Check if it's exactly 10 digits
  if (digitsOnly.length === 0) {
    return { isValid: false, error: "Phone number is required" };
  }

  if (digitsOnly.length !== 10) {
    return {
      isValid: false,
      error: "Phone number must be exactly 10 digits",
    };
  }

  // Check if all digits are valid (not all zeros, etc.)
  if (!/^[1-9]\d{9}$/.test(digitsOnly)) {
    return {
      isValid: false,
      error: "Please enter a valid phone number",
    };
  }

  return { isValid: true };
}

/**
 * Validate email address
 */
export function validateEmail(email: string): {
  isValid: boolean;
  error?: string;
} {
  if (!email.trim()) {
    return { isValid: false, error: "Email is required" };
  }

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  // Check for valid domain
  const parts = email.trim().split("@");
  if (parts.length !== 2 || !parts[1].includes(".")) {
    return { isValid: false, error: "Please enter a valid email with domain" };
  }

  return { isValid: true };
}

/**
 * Format phone number for display (adds +91 prefix)
 */
export function formatPhoneNumber(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, "");
  if (digitsOnly.length === 10) {
    return `+91 ${digitsOnly.substring(0, 5)} ${digitsOnly.substring(5)}`;
  }
  return phone;
}

/**
 * Validate dimensions (max suitcase size: ~70cm x 40cm x 40cm or ~28" x 16" x 16")
 */
export function validateDimensions(
  length: number,
  width: number,
  height: number,
  unit: "cm" | "inches"
): {
  isValid: boolean;
  error?: string;
} {
  const maxDimensions = {
    cm: { length: 70, width: 40, height: 40 },
    inches: { length: 28, width: 16, height: 16 },
  };

  const max = maxDimensions[unit];

  if (length <= 0 || width <= 0 || height <= 0) {
    return {
      isValid: false,
      error: "All dimensions must be greater than 0",
    };
  }

  if (length > max.length) {
    return {
      isValid: false,
      error: `Length cannot exceed ${max.length}${unit === "cm" ? "cm" : '"'}`,
    };
  }

  if (width > max.width) {
    return {
      isValid: false,
      error: `Width cannot exceed ${max.width}${unit === "cm" ? "cm" : '"'}`,
    };
  }

  if (height > max.height) {
    return {
      isValid: false,
      error: `Height cannot exceed ${max.height}${unit === "cm" ? "cm" : '"'}`,
    };
  }

  return { isValid: true };
}

/**
 * Auto-select packaging based on dimensions and fragility
 * Returns: "mailer" | "box-small" | "box-medium" | "box-large"
 */
export function autoSelectPackaging(
  length: number,
  width: number,
  height: number,
  unit: "cm" | "inches",
  isFragile: boolean
): "mailer" | "box-small" | "box-medium" | "box-large" {
  // Fragile items always go in a box
  if (isFragile) {
    const volume = length * width * height;
    // Convert to cm^3 for comparison
    const volumeCm3 =
      unit === "inches" ? volume * 16.387 : volume; // 1 cubic inch = 16.387 cm^3

    if (volumeCm3 < 1000) return "box-small";
    if (volumeCm3 < 5000) return "box-medium";
    return "box-large";
  }

  // Mailer size limits: ~10" x 6" x 1" or ~25cm x 15cm x 2.5cm
  const mailerMax = {
    cm: { length: 25, width: 15, height: 2.5 },
    inches: { length: 10, width: 6, height: 1 },
  };

  const max = mailerMax[unit];

  // Check if item fits in mailer
  if (
    length <= max.length &&
    width <= max.width &&
    height <= max.height
  ) {
    return "mailer";
  }

  // Otherwise, select box size based on volume
  const volume = length * width * height;
  const volumeCm3 =
    unit === "inches" ? volume * 16.387 : volume;

  if (volumeCm3 < 1000) return "box-small";
  if (volumeCm3 < 5000) return "box-medium";
  return "box-large";
}

/**
 * Get packaging charge based on type
 */
export function getPackagingCharge(
  packagingType: "mailer" | "box-small" | "box-medium" | "box-large"
): number {
  const charges = {
    mailer: 15,
    "box-small": 20,
    "box-medium": 25,
    "box-large": 35,
  };
  return charges[packagingType];
}




