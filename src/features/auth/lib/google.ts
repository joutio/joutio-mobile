import { Platform } from 'react-native'
import { config } from '@/lib/config'
import { t } from '@/lib/i18n'

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin')

/** Erreur Google lisible par l'écran de connexion. */
export class GoogleSignInError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GoogleSignInError'
  }
}

const DEVELOPER_ERROR = () => t('mobile.auth.google.notConfigured')
const NETWORK_ERROR = () => t('mobile.auth.google.network')
const UNKNOWN_ERROR = () => t('mobile.auth.google.failed')

let configured = false

/** Google natif (dev build) : Android toujours, iOS dès qu'un client iOS est configuré. */
export function isGoogleSignInAvailable(): boolean {
  const platformConfigured = Platform.OS === 'android' || (Platform.OS === 'ios' && Boolean(config.googleIosClientId))
  return platformConfigured && config.googleSignInEnabled && Boolean(config.googleWebClientId)
}

async function loadGoogleSignin(): Promise<GoogleSigninModule> {
  let module: GoogleSigninModule
  try {
    module = await import('@react-native-google-signin/google-signin')
  } catch {
    throw new GoogleSignInError(t('mobile.auth.google.unavailableBuild'))
  }
  if (!configured) {
    module.GoogleSignin.configure({
      webClientId: config.googleWebClientId,
      iosClientId: config.googleIosClientId || undefined,
      scopes: ['profile', 'email'],
      offlineAccess: false,
    })
    configured = true
  }
  return module
}

/** Ouvre le sélecteur de compte Google natif et retourne l'ID token ; `null` si la personne annule. */
export async function signInWithGoogle(): Promise<string | null> {
  if (!isGoogleSignInAvailable()) throw new GoogleSignInError(t('mobile.auth.google.unavailableDevice'))
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = await loadGoogleSignin()
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    const response = await GoogleSignin.signIn()
    if (!isSuccessResponse(response)) return null
    const idToken = response.data.idToken ?? (await GoogleSignin.getTokens()).idToken
    if (!idToken) throw new GoogleSignInError(t('mobile.auth.google.noIdToken'))
    return idToken
  } catch (error) {
    if (error instanceof GoogleSignInError) throw error
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return null
      if (error.code === statusCodes.IN_PROGRESS) throw new GoogleSignInError(t('mobile.auth.google.inProgress'))
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new GoogleSignInError(t('mobile.auth.google.playServices'))
      if (error.code === '10' || /DEVELOPER_ERROR/i.test(error.message)) {
        // Toujours journalisé (sans secret) : visible dans `adb logcat` sur l'APK.
        console.warn('[GoogleSignIn] DEVELOPER_ERROR:', error.message)
        throw new GoogleSignInError(DEVELOPER_ERROR())
      }
      if (error.code === '7' || /NETWORK_ERROR/i.test(error.message)) throw new GoogleSignInError(NETWORK_ERROR())
    }
    if (__DEV__) console.warn('[GoogleSignIn]', error)
    throw new GoogleSignInError(UNKNOWN_ERROR())
  }
}

/** Efface la session Google native (best-effort, ne bloque jamais la déconnexion). */
export async function signOutGoogle(): Promise<void> {
  if (!isGoogleSignInAvailable()) return
  try {
    const { GoogleSignin } = await loadGoogleSignin()
    await GoogleSignin.signOut()
  } catch {
    // La session Joutio est déjà purgée.
  }
}
