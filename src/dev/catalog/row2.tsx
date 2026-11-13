import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { router } from '@/shared/navigation/router'
import {
  BellIcon,
  BottomNav,
  Button,
  CompassIcon,
  HouseIcon,
  IconButton,
  ListRow,
  MagnifyingGlassIcon,
  MobileTopBar,
  Screen,
  SearchField,
  StickyBar,
  SwordIcon,
  Text,
  tokens,
  UserIcon,
  UsersIcon,
  useStickyBar,
} from '@/design-system'
import { Specimen } from './kit'

export const NAV_ITEMS = [
  { key: 'home', label: 'Accueil', icon: HouseIcon },
  { key: 'topics', label: 'Sujets', icon: CompassIcon },
  { key: 'social', label: 'Social', icon: UsersIcon },
  { key: 'challenges', label: 'Défis', icon: SwordIcon, badge: 3 },
  { key: 'profile', label: 'Profil', icon: UserIcon },
] as const

type NavKey = (typeof NAV_ITEMS)[number]['key']

export function MobileTopBarDemo() {
  return (
    <>
      <Specimen label="large (racine d'onglet)">
        <MobileTopBar title="Sujets" subtitle="17 univers" right={<IconButton icon={BellIcon} label="Notifications" badge={2} />} />
      </Specimen>
      <Specimen label="inline (écran poussé)">
        <MobileTopBar variant="inline" title="Toutes les parties" subtitle="Rois de France" back="Sujet" onBack={() => undefined} />
      </Specimen>
      <Specimen label="modal (saisie)">
        <MobileTopBar variant="modal" title="Modifier le profil" confirm="Enregistrer" confirmDisabled />
      </Specimen>
      <Specimen label="glass">
        <MobileTopBar title="Social" glass />
      </Specimen>
    </>
  )
}

export function BottomNavDemo() {
  const [active, setActive] = useState<NavKey>('home')
  return (
    <>
      <Specimen label="Sans safe area ici : la vraie barre est dans l'aperçu des onglets">
        <BottomNav items={NAV_ITEMS} active={active} onChange={setActive} />
      </Specimen>
      <Button variant="tinted" full onPress={() => router.push('/tabs/home')}>
        Aperçu des onglets (Tabs + JoTabBar)
      </Button>
    </>
  )
}

/** Plein écran : Screen + StickyBar collée par `stickyHeaderIndices`. */
export function StickyScreenDemo() {
  const [query, setQuery] = useState('')
  const sticky = useStickyBar()
  return (
    <Screen header={<MobileTopBar variant="inline" title="Screen et StickyBar" back="Catalogue" onBack={() => router.back()} />} scroll={false}>
      <ScrollView onScroll={sticky.onScroll} scrollEventThrottle={16} stickyHeaderIndices={[1]} showsVerticalScrollIndicator={false}>
        <View style={{ padding: tokens.space[5], gap: tokens.space[3] }}>
          <Text variant="title2">Identité, défile</Text>
          <Text color="muted">Le contexte défile avec le contenu ; seule la recherche reste collée.</Text>
        </View>
        <StickyBar {...sticky.bar}>
          <View style={{ paddingHorizontal: tokens.space[5], paddingVertical: tokens.space[3] }}>
            <SearchField value={query} onChange={setQuery} onCancel={() => setQuery('')} />
          </View>
        </StickyBar>
        {Array.from({ length: 30 }, (_, index) => (
          <ListRow
            key={index}
            icon={MagnifyingGlassIcon}
            label={`Résultat ${index + 1}`}
            sub={sticky.stuck ? 'Barre collée' : 'Barre libre'}
            last={index === 29}
          />
        ))}
      </ScrollView>
    </Screen>
  )
}
