export default {
  expo: {
    name: "patwadi",
    slug: "patwadi",
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
      bundleIdentifier: "com.anonymous.patwadi",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.anonymous.patwadi",
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      [
        "react-native-vision-camera",
        {
          cameraPermission: "Allow Patwadi to access your camera.",
          microphonePermission: "Allow Patwadi to access your microphone.",
        },
      ],
    ],
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON,
      mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN,
    },
  },
};
