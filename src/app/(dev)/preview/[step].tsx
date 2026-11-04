import { useLocalSearchParams } from 'expo-router'
import { CodeScreen, LaunchScreen, LoginScreen, SessionEndedScreen } from '@/features/auth'
import { FirstTopicStep, NotificationsStep, UniversesStep } from '@/features/onboarding'

/**
 * Aperçu d'un écran du parcours d'entrée sans session (`joutio://preview/<étape>`), pour la revue de design.
 * Les appels réseau y échouent (pas de token) : les états d'erreur restent visibles.
 */
export default function Preview() {
  const { step } = useLocalSearchParams<{ step: string }>()
  switch (step) {
    case 'launch':
      return <LaunchScreen />
    case 'login':
      return <LoginScreen />
    case 'code':
      return <CodeScreen />
    case 'universes':
      return <UniversesStep />
    case 'notifications':
      return <NotificationsStep />
    case 'first-topic':
      return <FirstTopicStep />
    case 'suspended':
      return <SessionEndedScreen reason="suspended" onLogin={() => undefined} />
    default:
      return <SessionEndedScreen reason="expired" onLogin={() => undefined} />
  }
}
