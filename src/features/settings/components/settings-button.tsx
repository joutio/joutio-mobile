import { router } from 'expo-router'
import { GearSixIcon, IconButton } from '@/design-system'

/**
 * Roue dentée des en-têtes d'onglets (Sujets, Social, Défis) : ouvre les Réglages du Profil, comme celle de l'image
 * du Profil. Mêmes boutons `plain` que la cloche, qu'elle suit.
 */
export function SettingsButton() {
  return <IconButton icon={GearSixIcon} label="Réglages" variant="plain" tone="neutral" onPress={() => router.push('/profile/settings')} />
}
