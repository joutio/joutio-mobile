import { router, useSegments } from 'expo-router'
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { ListGroup, MobileTopBar, Screen, SectionHeader, Text, tokens } from '@/design-system'

/** Origine des Réglages : pile de l'onglet Profil ou de l'onglet Accueil (roue dentée des deux écrans). */
export type SettingsOrigin = 'home' | 'profile'

export function useSettingsOrigin(): SettingsOrigin {
  return (useSegments() as string[]).includes('home') ? 'home' : 'profile'
}

export type SettingsPage = 'account' | 'privacy' | 'notifications' | 'game' | 'display' | 'invite' | 'help'

/** Ouvre une catégorie dans la pile d'origine. */
export function openSettingsPage(origin: SettingsOrigin, page: SettingsPage) {
  router.push(origin === 'home' ? { pathname: '/home/settings/[page]', params: { page } } : { pathname: '/profile/settings/[page]', params: { page } })
}

/** Cadre d'une page des Réglages : retour « Profil » ou « Accueil » à la racine, « Réglages » dans une catégorie. */
export function SettingsFrame({ title, root = false, overlay, children }: { title: string; root?: boolean; overlay?: ReactNode; children: ReactNode }) {
  const origin = useSettingsOrigin()
  const back = root ? (origin === 'home' ? 'Accueil' : 'Profil') : 'Réglages'
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
