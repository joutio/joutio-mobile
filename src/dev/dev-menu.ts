import { router } from 'expo-router'

/**
 * Entrées du menu de dev d'Expo (roue dentée, ou secouer l'appareil) : accès au catalogue et aux aperçus du parcours
 * d'entrée, sans session. Dev seulement : `expo-dev-menu` n'existe pas dans un build de release.
 */
export function registerDevMenu() {
  if (!__DEV__) return
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { registerDevMenuItems } = require('expo-dev-menu') as typeof import('expo-dev-menu')
  registerDevMenuItems([
    { name: 'Catalogue des composants', callback: () => router.push('/catalog'), shouldCollapse: true },
    { name: 'Aperçu : connexion', callback: () => router.push('/preview/login'), shouldCollapse: true },
    { name: 'Aperçu : univers', callback: () => router.push('/preview/universes'), shouldCollapse: true },
    { name: 'Aperçu : premier thème', callback: () => router.push('/preview/first-topic'), shouldCollapse: true },
  ]).catch(() => undefined)
}
