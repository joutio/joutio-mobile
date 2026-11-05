import { View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { Text } from './text'

export interface MessageProps {
  text: string
  from: 'me' | 'opp'
  meta?: string
  /** Pseudonyme de l'auteur, lu avant le texte : à l'écran, seul le côté le dit. */
  author?: string
  /** Appui long (Signaler). */
  onLongPress?: () => void
  style?: StyleProp<ViewStyle>
}

/** Bulle de discussion ou de commentaire : les miennes à droite, en accent. */
export function Message({ text, from, meta, author, onLongPress, style }: MessageProps) {
  const { colors, radius } = useTheme()
  const mine = from === 'me'
  return (
    <View style={[{ alignSelf: 'stretch', gap: tokens.space[2], alignItems: mine ? 'flex-end' : 'flex-start' }, style]}>
      <Text
        accessibilityLabel={[author, text, meta].filter(Boolean).join(', ')}
        onLongPress={onLongPress}
        color={mine ? 'onAccent' : 'text'}
        style={{
          maxWidth: '78%',
          paddingHorizontal: tokens.space[4],
          paddingVertical: tokens.space[3],
          borderRadius: radius.lg,
          [mine ? 'borderBottomRightRadius' : 'borderBottomLeftRadius']: radius.xs,
          backgroundColor: mine ? colors.accent : colors.raised,
          overflow: 'hidden',
        }}
      >
        {text}
      </Text>
      {meta && (
        <Text variant="caption" color="muted">
          {meta}
        </Text>
      )}
    </View>
  )
}
