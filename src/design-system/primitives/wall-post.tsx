import type { ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { ChatCircleIcon, DotsThreeVerticalIcon, HeartIcon } from '../icons'
import { useTheme } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'
import { Avatar } from './avatar'
import { IconButton } from './icon-button'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

export interface WallPostProps {
  name: string
  tier?: TierCode
  src?: string
  /** Rang et date, par exemple `Or · il y a 1 h`. */
  meta: string
  text: string
  likes: number
  comments: number
  liked?: boolean
  onLike?: () => void
  onComment?: () => void
  onMenu?: () => void
  style?: StyleProp<ViewStyle>
}

function Action({ label, onPress, children }: { label: string; onPress?: () => void; children: ReactNode }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      pressedScale={0.92}
      onPress={onPress}
      hitSlop={tokens.space[4]}
      style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] }}
    >
      {children}
    </PressableScale>
  )
}

/** Publication du mur d'un sujet. */
export function WallPost({ name, tier, src, meta, text, likes, comments, liked = false, onLike, onComment, onMenu, style }: WallPostProps) {
  const { colors, radius } = useTheme()
  return (
    <View style={[{ gap: tokens.space[4], padding: tokens.space[5], borderRadius: radius.lg, backgroundColor: colors.surface }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[4] }}>
        <Avatar name={name} src={src} tier={tier} size="md" decorative />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="callout" weight="600" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" color="muted" numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <IconButton icon={DotsThreeVerticalIcon} label={`Options de la publication de ${name}`} size="S" onPress={onMenu} style={{ marginRight: -tokens.space[3] }} />
      </View>
      <Text variant="callout" weight="400">
        {text}
      </Text>
      <View style={{ flexDirection: 'row', gap: tokens.space[6] }}>
        <Action label={`J'aime, ${likes}${liked ? ', aimé' : ''}`} onPress={onLike}>
          <HeartIcon size={16} weight={liked ? 'fill' : 'regular'} color={liked ? colors.wrong : colors.muted} />
          <Text variant="caption" color={liked ? 'wrong' : 'muted'} mono>
            {likes}
          </Text>
        </Action>
        <Action label={`Commentaires, ${comments}`} onPress={onComment}>
          <ChatCircleIcon size={16} color={colors.muted} />
          <Text variant="caption" color="muted" mono>
            {comments}
          </Text>
        </Action>
      </View>
    </View>
  )
}
