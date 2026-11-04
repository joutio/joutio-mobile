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
  /** Connexions sociales : masquées tant que leur configuration native n'est pas reprise. */
  googleSignInEnabled: process.env.EXPO_PUBLIC_GOOGLE_SIGN_IN_ENABLED === 'true',
  facebookSignInEnabled: process.env.EXPO_PUBLIC_FACEBOOK_SIGN_IN_ENABLED === 'true',
  /**
   * Catalogue des composants et aperçus, **première page** au lancement (phase de construction, 2026-11-04).
   * `false` pour un build de production : l'app s'ouvre alors directement sur son parcours.
   */
  catalogEnabled: process.env.EXPO_PUBLIC_CATALOG !== 'false',
} as const
