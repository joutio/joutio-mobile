import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PageDots, tokens, useTheme, TOP_BAR_HEIGHT } from '@/design-system'

export const STEP_COUNT = 3

export interface StepsProps {
  index: number
  /** À droite des points : Passer, Explorer l'accueil. */
  action?: ReactNode
  /** Le contenu remplit l'écran et gère son propre défilement. */
  fill?: boolean
  footer: ReactNode
  children: ReactNode
}

/** Gabarit des étapes : points de progression, contenu, actions fixes en bas. */
export function Steps({ index, action, fill = false, footer, children }: StepsProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const content = {
    gap: fill ? tokens.space[5] : tokens.space[6],
    paddingHorizontal: tokens.space[5],
    paddingTop: tokens.space[3],
    paddingBottom: fill ? tokens.space[3] : tokens.space[5],
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View
        style={{
          minHeight: TOP_BAR_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: tokens.space[4],
          paddingLeft: tokens.space[5],
          paddingRight: tokens.space[3],
        }}
      >
        <PageDots count={STEP_COUNT} index={index} />
        {action}
      </View>
      {fill ? (
        <View style={[{ flex: 1 }, content]}>{children}</View>
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={content}>
          {children}
        </ScrollView>
      )}
      <View
        style={{ paddingHorizontal: tokens.space[5], paddingTop: tokens.space[3], paddingBottom: insets.bottom + tokens.space[5], backgroundColor: colors.bg }}
      >
        {footer}
      </View>
    </View>
  )
}
