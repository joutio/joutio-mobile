import type { ConfigContext, ExpoConfig } from 'expo/config'
import packageJson from './package.json'
import tokens from './src/design-system/tokens.generated.json'

/** Identifiant définitif côté stores (joutio-mobile est archivé). */
const APP_ID = 'com.joutio.app'

const [major = 2, minor = 0, patch = 0] = packageJson.version.split('.').map((part) => Number.parseInt(part, 10) || 0)
/**
 * `versionCode` Android dérivé de la version (`major * 1e6 + minor * 1e3 + patch`) : strictement croissant, et
 * supérieur à celui de joutio-mobile (1.x), pour s'installer par-dessus l'ancienne app.
 */
const VERSION_CODE = Number(process.env.ANDROID_VERSION_CODE ?? major * 1_000_000 + minor * 1_000 + patch)

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Joutio',
  slug: 'joutio-mobile-expo',
  version: packageJson.version,
  scheme: 'joutio',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: tokens.color.dark.bg,
  ios: {
    bundleIdentifier: APP_ID,
    supportsTablet: false,
  },
  android: {
    package: APP_ID,
    versionCode: VERSION_CODE,
    adaptiveIcon: {
      backgroundColor: tokens.color.dark.bg,
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: true,
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-image',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 120,
        // Le lancement est toujours sombre (onboarding.md § 1), dans les deux thèmes.
        backgroundColor: tokens.color.dark.bg,
        dark: { backgroundColor: tokens.color.dark.bg },
      },
    ],
    'expo-secure-store',
    'expo-notifications',
    'expo-dev-client',
    './plugins/withAndroidReleaseSigning',
  ],
  experiments: {
    typedRoutes: true,
  },
})
