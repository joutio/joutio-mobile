import type { ConfigContext, ExpoConfig } from 'expo/config'
import packageJson from './package.json'
import tokens from './src/design-system/tokens.generated.json'

/** Identifiant définitif côté stores, conservé lors du remplacement de l’ancienne app. */
const APP_ID = 'com.joutio.app'

const [major = 1, minor = 0, patch = 0] = packageJson.version.split('.').map((part) => Number.parseInt(part, 10) || 0)
/**
 * `versionCode` Android : 10 000 000 + `major * 1e6 + minor * 1e3 + patch`, strictement croissant. Le décalage le
 * place au-dessus de l’ancienne app (1.1.2 = 1 001 002) : la nouvelle app s'installe par-dessus l'ancienne.
 */
const VERSION_CODE = Number(process.env.ANDROID_VERSION_CODE ?? 10_000_000 + major * 1_000_000 + minor * 1_000 + patch)

/**
 * Connexions sociales natives (identifiants publics, mêmes valeurs par défaut que `src/lib/config.ts`). Chaque plugin
 * n'est ajouté que si sa connexion est active et configurée ; sinon le bouton est masqué et le natif absent.
 */
const GOOGLE_IOS_URL_SCHEME = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ?? 'com.googleusercontent.apps.13717769562-pi67m17nqa3bv9p3h01kk43d5h27i5j5'
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '2122240041993058'
const FACEBOOK_CLIENT_TOKEN = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN ?? 'f738cf848ac1e463102db9d39f455872'
const socialPlugins: NonNullable<ExpoConfig['plugins']> = [
  ...(process.env.EXPO_PUBLIC_GOOGLE_SIGN_IN_ENABLED !== 'false' && GOOGLE_IOS_URL_SCHEME
    ? [['@react-native-google-signin/google-signin', { iosUrlScheme: GOOGLE_IOS_URL_SCHEME }] as [string, object]]
    : []),
  ...(process.env.EXPO_PUBLIC_FACEBOOK_SIGN_IN_ENABLED !== 'false' && FACEBOOK_APP_ID && FACEBOOK_CLIENT_TOKEN
    ? [
        [
          'react-native-fbsdk-next',
          {
            appID: FACEBOOK_APP_ID,
            clientToken: FACEBOOK_CLIENT_TOKEN,
            displayName: 'Joutio',
            scheme: `fb${FACEBOOK_APP_ID}`,
            advertiserIDCollectionEnabled: false,
            autoLogAppEventsEnabled: false,
            isAutoInitEnabled: true,
          },
        ] as [string, object],
      ]
    : []),
]

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Joutio',
  slug: 'joutio-mobile',
  owner: 'joutio-organization',
  version: packageJson.version,
  extra: {
    ...config.extra,
    eas: {
      ...config.extra?.eas,
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '7a0a8f58-6662-486f-a2d3-2e92f8eb83a2',
    },
  },
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
    ...(process.env.GOOGLE_SERVICES_JSON ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON } : {}),
    versionCode: VERSION_CODE,
    adaptiveIcon: {
      backgroundColor: tokens.color.dark.bg,
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: true,
    // La fenêtre se redimensionne sous le clavier (keyboard-controller gère ensuite les écrans bord à bord).
    softwareKeyboardLayoutMode: 'resize',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-image',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        // Même taille que le logo de `LaunchScreen`, qui prend le relais en fondu.
        imageWidth: 96,
        // Le lancement est toujours sombre (onboarding.md § 1), dans les deux thèmes.
        backgroundColor: tokens.color.dark.bg,
        dark: { backgroundColor: tokens.color.dark.bg },
      },
    ],
    'expo-secure-store',
    'expo-notifications',
    'expo-dev-client',
    './plugins/withAndroidReleaseSigning',
    ...socialPlugins,
  ],
  experiments: {
    typedRoutes: true,
  },
})
