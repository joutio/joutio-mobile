/**
 * Configuration runtime (`EXPO_PUBLIC_*`, figées dans le bundle). Par défaut, la production.
 * La stack locale se surcharge dans `.env.local` (IP LAN de la machine sur appareil physique).
 */
const trim = (url: string) => url.replace(/\/$/, '')

export const config = {
  apiUrl: trim(process.env.EXPO_PUBLIC_API_URL ?? 'https://api.joutio.com'),
  identityUrl: trim(process.env.EXPO_PUBLIC_IDENTITY_URL ?? process.env.EXPO_PUBLIC_OIDC_AUTHORITY ?? 'https://identity.joutio.com'),
  clientId: process.env.EXPO_PUBLIC_OIDC_CLIENT_ID ?? 'mobile',
  /** Site public : conditions d'utilisation et confidentialité. */
  siteUrl: trim(process.env.EXPO_PUBLIC_SITE_URL ?? 'https://joutio.com'),
  /**
   * Connexions sociales (identifiants **publics**, repris de joutio-mobile `AGENTS.md` § 4). `*_SIGN_IN_ENABLED=false`
   * les masque ; un identifiant vide aussi. Les secrets restent côté identity.
   */
  googleSignInEnabled: process.env.EXPO_PUBLIC_GOOGLE_SIGN_IN_ENABLED !== 'false',
  /** Client OAuth **Web** du projet Google Cloud : audience des ID tokens vérifiés par identity. */
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '13717769562-f0lmfij51imcthmn3rudsijjh6r4bll7.apps.googleusercontent.com',
  /** Client OAuth iOS (bundle `com.joutio.app`). Android est résolu par package + SHA-1, sans identifiant. */
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '13717769562-pi67m17nqa3bv9p3h01kk43d5h27i5j5.apps.googleusercontent.com',
  facebookSignInEnabled: process.env.EXPO_PUBLIC_FACEBOOK_SIGN_IN_ENABLED !== 'false',
  facebookAppId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '2122240041993058',
  /** Client Token **public** du SDK Facebook (embarqué dans toute app Facebook ; à rotationner chez Meta si besoin). */
  facebookClientToken: process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN ?? 'f738cf848ac1e463102db9d39f455872',
  /**
   * Catalogue des composants et aperçus, **première page** au lancement (phase de construction, 2026-11-04).
   * `false` pour un build de production : l'app s'ouvre alors directement sur son parcours.
   */
  catalogEnabled: process.env.EXPO_PUBLIC_CATALOG !== 'false',
} as const
