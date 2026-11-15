import { Platform } from 'react-native'
import { config } from '@/lib/config'
import { t } from '@/lib/i18n'

type FacebookSdkModule = typeof import('react-native-fbsdk-next')

/** Identité Facebook native : ID token OIDC + nonce (iOS, Limited Login) ou access token Graph (Android). */
export type FacebookCredential = { idToken: string; nonce: string } | { accessToken: string }

/** Erreur Facebook lisible par l'écran de connexion. */
export class FacebookSignInError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FacebookSignInError'
  }
}

const UNKNOWN_ERROR = () => t('mobile.auth.facebook.failed')

/** Facebook natif (dev build) : masqué si l'App ID ou le Client Token public manque. */
export function isFacebookSignInAvailable(): boolean {
  return (
    (Platform.OS === 'ios' || Platform.OS === 'android') && config.facebookSignInEnabled && Boolean(config.facebookAppId) && Boolean(config.facebookClientToken)
  )
}

async function loadFacebookSdk(): Promise<FacebookSdkModule> {
  try {
    return await import('react-native-fbsdk-next')
  } catch {
    throw new FacebookSignInError(t('mobile.auth.facebook.unavailableBuild'))
  }
}

/** Nonce transmis au SDK et vérifié par identity dans l'ID token (iOS). */
const createNonce = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`

/** Ouvre le login Facebook natif ; `null` si la personne annule. */
export async function signInWithFacebook(): Promise<FacebookCredential | null> {
  if (!isFacebookSignInAvailable()) throw new FacebookSignInError(t('mobile.auth.facebook.unavailableDevice'))
  const { LoginManager, AuthenticationToken, AccessToken } = await loadFacebookSdk()
  try {
    if (Platform.OS === 'ios') {
      const nonce = createNonce()
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email'], 'limited', nonce)
      if (result.isCancelled) return null
      const token = await AuthenticationToken.getAuthenticationTokenIOS()
      if (!token?.authenticationToken) throw new FacebookSignInError(t('mobile.auth.facebook.noIdToken'))
      // Le SDK peut normaliser le nonce : on renvoie celui du token, sinon identity le refuse.
      return { idToken: token.authenticationToken, nonce: token.nonce || nonce }
    }
    const result = await LoginManager.logInWithPermissions(['public_profile', 'email'])
    if (result.isCancelled) return null
    const token = await AccessToken.getCurrentAccessToken()
    if (!token?.accessToken) throw new FacebookSignInError(t('mobile.auth.facebook.noAccessToken'))
    return { accessToken: token.accessToken }
  } catch (error) {
    if (error instanceof FacebookSignInError) throw error
    if (__DEV__) console.warn('[FacebookSignIn]', error)
    throw new FacebookSignInError(UNKNOWN_ERROR())
  }
}

/** Efface la session Facebook native (best-effort, ne bloque jamais la déconnexion). */
export async function signOutFacebook(): Promise<void> {
  if (!isFacebookSignInAvailable()) return
  try {
    const { LoginManager } = await loadFacebookSdk()
    LoginManager.logOut()
  } catch {
    // La session Joutio est déjà purgée.
  }
}
