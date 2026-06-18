// Load environment variables from .env file
require("dotenv").config();

export default {
  expo: {
    name: "Patwadi",
    slug: "patwadi",
    owner: "patwadi",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.patwadi.app",
      buildNumber: "1",
      infoPlist: {
        UIBackgroundModes: ["location"],
        LSApplicationQueriesSchemes: [
          "upi",
          "phonepe",
          "gpay",
          "paytmmp",
          "bhim",
          "credpay",
          "mobikwik",
        ],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.patwadi.app",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION",
        "CAMERA",
        "READ_MEDIA_IMAGES",
        "POST_NOTIFICATIONS",
      ],
      privacyPolicy: "https://patwadi.com/docs/privacy-policy",
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      [
        "expo-image-picker",
        {
          photosPermission:
            "Allow Patwadi to access your photos for bus proof and parcel images.",
          cameraPermission:
            "Allow Patwadi to access your camera for bus proof and parcel photos.",
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Allow Patwadi to access your location for handoff and transfer verification.",
          locationAlwaysAndWhenInUsePermission:
            "Allow Patwadi to track your trip location while the app is open or in the background.",
          isAndroidForegroundServiceEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
        },
      ],
      "expo-notifications",
    ],
    extra: {
      eas: {
        projectId: "37086a26-e720-4ea4-9d72-917b70322206",
      },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON,
      mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN,
      razorpayKeyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID,
      supportWhatsapp: process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP,
      privacyPolicyUrl: "https://patwadi.com/docs/privacy-policy",
    },
  },
};
