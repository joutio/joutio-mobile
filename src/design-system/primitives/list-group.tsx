import type { ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme/theme-provider'

export interface ListGroupProps {
  /** `raised` dans une feuille (défaut), `surface` sur le fond d'un écran. */
  surface?: 'raised' | 'surface'
  style?: StyleProp<ViewStyle>
  children: ReactNode
}

/**
 * Groupe de lignes (`ListRow`, `TopicRow`…) : carte aux coins `lg`, qui découpe les lignes et leurs filets —
 * le `overflow-hidden rounded-jo-lg bg-jo-raised` du lab. Pour un choix unique, y poser un `RadioGroup`.
 */
export function ListGroup({ surface = 'raised', style, children }: ListGroupProps) {
  const { colors, radius } = useTheme()
  return <View style={[{ overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors[surface] }, style]}>{children}</View>
}
