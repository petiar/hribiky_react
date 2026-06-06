import 'dotenv/config';

export default {
  expo: {
    name: "Hríbiky",
    slug: "hribiky",
    scheme: "hribiky",
    plugins: [
      "expo-router",
      "expo-localization",
      "expo-font",
      ["react-native-maps", {
        "iosGoogleMapsApiKey": process.env.GOOGLE_MAPS_API_KEY
      }]
    ],
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "sk.hribiky.app",
      buildNumber: "1",
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "Aplikácia používa vašu aktuálnu polohu na automatické zaznamenanie GPS súradníc turistického rozcestníka (hríbika), ktorý pridávate do databázy. Súradnice sa uložia spolu so záznamom a zobrazia sa ostatným turistom na mape.",
        NSCameraUsageDescription: "Aplikácia používa kameru na fotenie turistických rozcestníkov (hríbikov). Odfotené snímky môžete priložiť k novému záznamu alebo komentáru a zdieľať ich s ostatnými turistami v aplikácii.",
        NSPhotoLibraryUsageDescription: "Aplikácia potrebuje prístup k fotoknižnici, aby ste mohli vybrať existujúce fotky turistických rozcestníkov (hríbikov) a priložiť ich k novému záznamu alebo komentáru v aplikácii.",
        NSPhotoLibraryAddUsageDescription: "Aplikácia ukladá fotky turistických rozcestníkov (hríbikov) do vašej fotoknižnice, ak si ich chcete ponechať lokálne po odfotení.",
        ITSAppUsesNonExemptEncryption: false,
      }
    },
    android: {
      package: "sk.hribiky.app",
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      router: {},
      eas: {
        projectId: "cb85f0c9-f616-492e-ad3c-07d0f0c71a39"
      }
    }
  }
};