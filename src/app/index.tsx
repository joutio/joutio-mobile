import { Redirect } from 'expo-router'
import { useSessionStore } from '@/features/auth'
import { useMe } from '@/features/me'
import { config } from '@/lib/config'
import { useEntryStore } from '@/shared/stores/entry-store'

/**
 * Entrée de l'app. Au lancement, le catalogue (tant qu'il est activé) ; ensuite l'accueil, l'onboarding ou la
 * connexion selon la session. Le layout racine attend la session et `me`.
 */
export default function Index() {
  const entered = useEntryStore((state) => state.entered)
  const authenticated = useSessionStore((state) => state.authenticated)
  const me = useMe(authenticated)
  if (config.catalogEnabled && !entered) return <Redirect href="/catalog" />
  if (!authenticated) return <Redirect href="/login" />
  return <Redirect href={me.data?.onboardingCompleted ? '/home' : '/universes'} />
}
