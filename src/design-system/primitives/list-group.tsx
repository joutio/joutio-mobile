import type { ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme/theme-provider'

export interface ListGroupProps {
  style?: StyleProp<ViewStyle>
  children: ReactNode
}

/**
 * Groupe de lignes (`ListRow`, `TopicRow`…) : carte `raised` aux coins `lg`, qui découpe les lignes et leurs filets —
 * le `overflow-hidden rounded-jo-lg bg-jo-raised` du lab. Pour un choix unique, y poser un `RadioGroup`.
 */
export function ListGroup({ style, children }: ListGroupProps) {
  const { colors, radius } = useTheme()
  return <View style={[{ overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.raised }, style]}>{children}</View>
}
