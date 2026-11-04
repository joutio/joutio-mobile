import type { ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { tokens } from '../tokens.generated'
import { Text } from './text'

export interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  style?: StyleProp<ViewStyle>
}

/** Titre de section (`title2`), sous-titre `callout` `muted`, action à droite. Annoncé comme en-tête. */
export function SectionHeader({ title, subtitle, action, style }: SectionHeaderProps) {
  return (
    <View style={[{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space[4] }, style]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="title2" numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle && (
          <Text variant="callout" color="muted">
            {subtitle}
          </Text>
        )}
      </View>
      {action}
    </View>
  )
}
