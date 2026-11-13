import { requireOptionalNativeModule } from 'expo'

/**
 * Module natif `expo-application`, lu de façon optionnelle : un dev build antérieur à son ajout (2026-11-13) ne le
 * contient pas, et un import direct ferait planter l'app au lancement.
 */
interface ExpoApplicationModule {
  nativeApplicationVersion?: string | null
  nativeBuildVersion?: string | null
  getInstallReferrerAsync?: () => Promise<string>
}

const native = requireOptionalNativeModule<ExpoApplicationModule>('ExpoApplication')

/** Version affichée dans Réglages › Aide : `1.8.0 (412)`. */
export const appVersion = native ? `${native.nativeApplicationVersion ?? '—'} (${native.nativeBuildVersion ?? '—'})` : '—'

/** Play Install Referrer (Android) ; chaîne vide sans module ni referrer. */
export async function installReferrer(): Promise<string> {
  try {
    return (await native?.getInstallReferrerAsync?.()) ?? ''
  } catch {
    return ''
  }
}
