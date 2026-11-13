import { router } from 'expo-router'
import {
  BellIcon,
  CrownSimpleIcon,
  GameControllerIcon,
  GiftIcon,
  LifebuoyIcon,
  ListRow,
  Notice,
  PaletteIcon,
  PencilSimpleIcon,
  ShieldCheckIcon,
  showDialog,
  SignOutIcon,
  SquaresFourIcon,
  useThemeStore,
  UserCircleIcon,
} from '@/design-system'
import { useLogout } from '@/features/auth'
import { useCatalogAccess } from '@/features/auth/hooks/use-catalog-access'
import { useMe } from '@/features/me'
import { usePremiumSheet } from '@/features/premium/premium-store'
import { APPEARANCE, LANGUAGES } from '../lib/settings-options'
import { Group, openSettingsPage, SettingsFrame, useSettingsOrigin } from './settings-frame'

/**
 * Réglages (`reglages.md` § 1, refonte du 2026-11-13) : racine de catégories, ouverte par la roue dentée du Profil ou
 * de l'Accueil. Carte Premium, catégories (une page chacune), Création et Inviter, Aide, Se déconnecter. Les champs
 * publics du profil sont dans Éditer le profil.
 */
export function SettingsScreen() {
  const origin = useSettingsOrigin()
  const catalogAccess = useCatalogAccess()
  const data = useMe(true).data
  const logout = useLogout()
  const appearance = useThemeStore((state) => state.preference)
  const showPremium = usePremiumSheet((state) => state.show)
  const open = (page: Parameters<typeof openSettingsPage>[1]) => () => openSettingsPage(origin, page)
  const display = `${APPEARANCE.find((option) => option.value === appearance)?.label ?? 'Système'} · ${LANGUAGES.find((option) => option.value === (data?.language ?? 'fr'))?.label}`

  const confirmLogout = () =>
    showDialog({
      title: 'Se déconnecter ?',
      message: 'Tes parties et ta progression restent liées à ton compte.',
      icon: SignOutIcon,
      sheet: true,
      actions: [
        { label: 'Se déconnecter', variant: 'tinted', tone: 'destructive', onPress: () => logout.mutateAsync() },
        { label: 'Annuler', variant: 'plain', tone: 'neutral' },
      ],
    })

  return (
    <SettingsFrame title="Réglages" root>
      <Notice
        tone={data?.premium ? 'success' : 'live'}
        icon={CrownSimpleIcon}
        title={data?.premium ? 'Premium actif' : 'Passe à Premium'}
        message={data?.premium ? 'Merci de soutenir Joutio.' : 'Sujets illimités, détail par sujet et aucune publicité. Essai de 7 jours.'}
        action={{ label: data?.premium ? 'Gérer' : 'Découvrir', onPress: () => showPremium() }}
      />
      <Group>
        <ListRow icon={UserCircleIcon} label="Compte" sub="E-mail, date de naissance" control="chevron" onPress={open('account')} />
        <ListRow icon={ShieldCheckIcon} label="Confidentialité et sécurité" control="chevron" onPress={open('privacy')} />
        <ListRow icon={BellIcon} label="Notifications" control="chevron" onPress={open('notifications')} />
        <ListRow icon={GameControllerIcon} label="Jeu" sub="Duel, entraînement, centres d'intérêt" control="chevron" onPress={open('game')} />
        <ListRow icon={PaletteIcon} label="Affichage et langue" value={display} control="chevron" onPress={open('display')} last />
      </Group>
      <Group>
        <ListRow icon={PencilSimpleIcon} label="Mes sujets" control="chevron" onPress={() => router.push('/profile/topics')} />
        <ListRow icon={GiftIcon} label="Inviter des amis" sub="Ton lien de parrainage" control="chevron" onPress={open('invite')} last />
      </Group>
      <Group>
        <ListRow icon={LifebuoyIcon} label="Aide et à propos" control="chevron" onPress={open('help')} last />
      </Group>
      <Group>
        <ListRow icon={SignOutIcon} label="Se déconnecter" control="none" destructive onPress={confirmLogout} last />
      </Group>
      {catalogAccess && (
        <Group title="Dev">
          <ListRow icon={SquaresFourIcon} label="Catalogue des composants" control="chevron" onPress={() => router.push('/catalog')} last />
        </Group>
      )}
    </SettingsFrame>
  )
}
