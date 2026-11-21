import { useSegments } from 'expo-router'
import { router } from '@/shared/navigation/router'
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { ListGroup, MobileTopBar, Screen, SectionHeader, Text, tokens } from '@/design-system'
import { useT } from '@/lib/i18n'

/** Origine des Réglages : pile de l'onglet Profil ou de l'onglet Accueil (roue dentée des deux écrans). */
export type SettingsOrigin = 'home' | 'profile'

export function useSettingsOrigin(): SettingsOrigin {
  return (useSegments() as string[]).includes('home') ? 'home' : 'profile'
}

export type SettingsPage = 'account' | 'privacy' | 'notifications' | 'game' | 'display' | 'help'

/** Ouvre une catégorie dans la pile d'origine. */
export function openSettingsPage(origin: SettingsOrigin, page: SettingsPage) {
  router.push(origin === 'home' ? { pathname: '/home/settings/[page]', params: { page } } : { pathname: '/profile/settings/[page]', params: { page } })
}

/** Joueurs bloqués, poussé depuis Confidentialité dans la pile d'origine. */
export function openBlockedPlayers(origin: SettingsOrigin) {
  router.push(origin === 'home' ? '/home/settings/blocked' : '/profile/settings/blocked')
}

/**
 * Cadre d'une page des Réglages : retour « Profil » ou « Accueil » à la racine, « Réglages » dans une catégorie, `back`
 * dans une page poussée depuis une catégorie.
 */
export function SettingsFrame({
  title,
  root = false,
  back: backLabel,
  overlay,
  children,
}: {
  title: string
  root?: boolean
  /** Libellé du retour d'une page poussée depuis une catégorie (« Confidentialité et sécurité »). */
  back?: string
  overlay?: ReactNode
  children: ReactNode
}) {
  const t = useT()
  const origin = useSettingsOrigin()
  const back = backLabel ?? (root ? (origin === 'home' ? t('nav.home') : t('nav.profile')) : t('profile.settings'))
  return (
    <Screen
      inTabs
      header={<MobileTopBar variant="inline" back={back} onBack={() => router.back()} title={title} />}
      overlay={overlay}
      contentStyle={{ gap: tokens.space[6], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[3], paddingBottom: tokens.space[7] }}
    >
      {children}
    </Screen>
  )
}

export function Group({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  return (
    <View style={{ gap: tokens.space[3] }}>
      {title && <SectionHeader title={title} />}
      <ListGroup surface="surface">{children}</ListGroup>
      {footer && (
        <Text variant="caption" color="muted" style={{ paddingHorizontal: tokens.space[1] }}>
          {footer}
        </Text>
      )}
    </View>
  )
}
