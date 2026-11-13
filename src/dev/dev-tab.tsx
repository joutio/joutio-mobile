import { useScrollToTop } from 'expo-router'
import { router } from '@/shared/navigation/router'
import { useRef } from 'react'
import type { ScrollViewInstance } from 'react-native'
import { ListRow, MobileTopBar, Screen } from '@/design-system'

/** Onglet factice : liste longue pour éprouver le retour en haut au toucher de l'onglet actif. */
export function DevTab({ title }: { title: string }) {
  const scroller = useRef<ScrollViewInstance>(null)
  useScrollToTop(scroller)
  return (
    <Screen inTabs scrollRef={scroller} header={<MobileTopBar title={title} subtitle="Toucher l'onglet actif remonte en haut" />}>
      <ListRow label="Retour au catalogue" onPress={() => router.dismissTo('/catalog')} />
      {Array.from({ length: 40 }, (_, index) => (
        <ListRow key={index} label={`${title} ${index + 1}`} control="none" last={index === 39} />
      ))}
    </Screen>
  )
}
