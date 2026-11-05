import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ShareNetworkIcon } from '../icons'
import { Button } from '../primitives/button'
import { IconButton } from '../primitives/icon-button'
import { PageDots } from '../primitives/page-dots'
import { ForceDark, useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'

export interface UnlockSequenceProps {
  /** Déblocage affiché : `RankPromotion` ou `TitleUnlock`. */
  children: ReactNode
  step?: number
  steps?: number
  /** Dernier écran : « Voir le résultat », sans « Tout passer ». */
  last?: boolean
  onContinue?: () => void
  onSkip?: () => void
  onShare?: () => void
}

function Body({ children, step = 0, steps = 1, last = false, onContinue, onSkip, onShare }: UnlockSequenceProps) {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, overflow: 'hidden', backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingLeft: tokens.space[5], paddingRight: tokens.space[3] }}>
        <View style={{ flex: 1 }} />
        <PageDots count={steps} index={step} />
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          {!last && (
            <Button variant="plain" tone="neutral" size="M" onPress={onSkip}>
              Tout passer
            </Button>
          )}
        </View>
      </View>
      {/* Le déblocage défile entre les deux barres quand l'écran est trop court. */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
        {children}
      </ScrollView>
      <View
        style={{
          flexDirection: 'row',
          gap: tokens.space[3],
          paddingHorizontal: tokens.space[6],
          paddingTop: tokens.space[4],
          paddingBottom: insets.bottom + tokens.space[3],
        }}
      >
        <IconButton icon={ShareNetworkIcon} label="Partager" variant="gray" size="L" onPress={onShare} style={{ width: 52, borderRadius: radius.sm }} />
        <View style={{ flex: 1 }}>
          <Button full onPress={onContinue}>
            {last ? 'Voir le résultat' : 'Continuer'}
          </Button>
        </View>
      </View>
    </View>
  )
}

/** Plein écran de la séquence de déblocages après un duel. Toujours sombre. */
export function UnlockSequence(props: UnlockSequenceProps) {
  return (
    <ForceDark>
      <Body {...props} />
    </ForceDark>
  )
}
