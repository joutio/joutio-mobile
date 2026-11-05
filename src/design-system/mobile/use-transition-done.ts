import { useNavigation } from 'expo-router'
import { useEffect, useState } from 'react'

/** Repli si l'événement de fin de transition n'arrive pas (écran racine, animation désactivée). */
const FALLBACK_MS = 450

/**
 * Vrai une fois l'animation d'entrée de l'écran terminée : on y attend pour monter le contenu lourd (listes, onglets)
 * et l'écran s'ouvre tout de suite, des squelettes à la place, sans saccade pendant la transition.
 */
export function useTransitionDone(): boolean {
  const navigation = useNavigation()
  const [done, setDone] = useState(false)
  useEffect(() => {
    const finish = () => setDone(true)
    const timer = setTimeout(finish, FALLBACK_MS)
    // `transitionEnd` (native-stack) n'est pas typé sur la navigation générique d'expo-router.
    const unsubscribe = (navigation.addListener as (event: string, callback: () => void) => () => void)('transitionEnd', finish)
    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [navigation])
  return done
}
