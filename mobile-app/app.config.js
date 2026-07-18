// EAS automatically injects EAS_BUILD_PROFILE during a cloud build
const IS_DEV = process.env.EAS_BUILD_PROFILE === 'development';
const IS_PREVIEW = process.env.EAS_BUILD_PROFILE === 'preview';

let appName = "433 Sport";
let packageName = "com.anonymous.footballstreamapp"; // base production package name

// Dynamically change names based on the build type
if (IS_DEV) {
  appName += " (Dev)";
  packageName += ".dev";
} else if (IS_PREVIEW) {
  appName += " (Preview)";
  packageName += ".preview";
}


export default {
  expo: {
    name: appName,
    slug: "football-stream-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "footballstreamapp",
    userInterfaceStyle: "dark",
    ios: {
      supportsTablet: true,
      bundleIdentifier: packageName
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#0B0C10",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png"
      },
      predictiveBackGestureEnabled: false,
      package: packageName
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-web-browser",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          resizeMode: "contain",
          backgroundColor: "#0B0C10"
        }
      ],
      [
        "expo-build-properties",
        {
          android: {
            enableSeparateBuildPerCPUArchitecture: true,
            enableProguardInReleaseBuilds: true
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "40037678-a753-42c4-8b1e-7bf1511f6810"
      }
    }
  }
}
