import PagerView, { type PagerViewRef } from '@expo/ui/community/pager-view'
import { useRef, type ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ShareNetworkIcon } from '../icons'
import { Button } from '../primitives/button'
import { IconButton } from '../primitives/icon-button'
import { PageDots } from '../primitives/page-dots'
import { ForceDark, useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { UnlockActiveContext } from './unlock-content'

export interface UnlockSequenceProps {
  /** Un déblocage par page : `RankPromotion`, `TitleUnlock` ou `BadgeUnlock`. */
  pages: readonly ReactNode[]
  /** Page affichée. */
  step: number
  /** Page choisie au balayage ou par « Continuer ». */
  onStepChange: (step: number) => void
  /** « Tout passer », ou « Voir le résultat » sur la dernière page. */
  onDone: () => void
  /** Partage du déblocage affiché. */
  onShare?: () => void
}

function Body({ pages, step, onStepChange, onDone, onShare }: UnlockSequenceProps) {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const pager = useRef<PagerViewRef>(null)
  const steps = pages.length
  const last = step >= steps - 1
  const next = () => {
    if (last) return onDone()
    pager.current?.setPage(step + 1)
    onStepChange(step + 1)
  }
  return (
    <View style={{ flex: 1, overflow: 'hidden', backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingLeft: tokens.space[5], paddingRight: tokens.space[3] }}>
        <View style={{ flex: 1 }} />
        <PageDots count={steps} index={step} />
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          {!last && (
            <Button variant="plain" tone="neutral" size="M" onPress={onDone}>
              Tout passer
            </Button>
          )}
        </View>
      </View>
      {/* Balayage horizontal entre les déblocages (pager natif) ; chacun défile entre les deux barres si l'écran est court. */}
      <PagerView ref={pager} style={{ flex: 1 }} initialPage={step} onPageSelected={(event) => onStepChange(event.nativeEvent.position)}>
        {pages.map((page, index) => (
          <View key={index} style={{ flex: 1 }}>
            <UnlockActiveContext.Provider value={index === step}>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
                {page}
              </ScrollView>
            </UnlockActiveContext.Provider>
          </View>
        ))}
      </PagerView>
      <View
        style={{
          flexDirection: 'row',
          gap: tokens.space[3],
          paddingHorizontal: tokens.space[6],
          paddingTop: tokens.space[4],
          paddingBottom: insets.bottom + tokens.space[7],
        }}
      >
        <IconButton icon={ShareNetworkIcon} label="Partager" variant="gray" size="L" onPress={onShare} style={{ width: 52, borderRadius: radius.sm }} />
        <View style={{ flex: 1 }}>
          <Button full onPress={next}>
            {last ? 'Voir le résultat' : 'Continuer'}
          </Button>
        </View>
      </View>
    </View>
  )
}

/** Plein écran de la séquence de déblocages après un duel : une page par déblocage, balayables. Toujours sombre. */
export function UnlockSequence(props: UnlockSequenceProps) {
  return (
    <ForceDark>
      <Body {...props} />
    </ForceDark>
  )
}
