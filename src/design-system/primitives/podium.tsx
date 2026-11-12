import { View, type StyleProp, type ViewStyle } from 'react-native'
import { CrownSimpleIcon } from '../icons'
import { tint } from '../theme/color'
import { useTheme } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'
import { PlayerName } from './player-name'
import { Avatar } from './avatar'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

/** Couleur et hauteur de chaque marche, de la 1re à la 3e place. */
const STEPS: { tier: TierCode; height: number }[] = [
  { tier: 'OR', height: 96 },
  { tier: 'ARGENT', height: 72 },
  { tier: 'BRONZE', height: 56 },
]

export interface PodiumPlayer {
  name: string
  premium?: boolean
  tier?: TierCode
  src?: string
  /** Score, en mono sous le nom. */
  value: string
  onPress?: () => void
}

export interface PodiumProps {
  /** Les trois premiers, dans l'ordre du classement. */
  players: readonly PodiumPlayer[]
  style?: StyleProp<ViewStyle>
}

function Step({ player, rank }: { player: PodiumPlayer; rank: number }) {
  const { radius } = useTheme()
  const { tier, height } = STEPS[rank - 1] ?? { tier: 'BRONZE' as const, height: 56 }
  const color = tokens.tier[tier].hex
  return (
    <PressableScale
      accessibilityRole={player.onPress ? 'button' : 'text'}
      accessibilityLabel={`${rank}${rank === 1 ? 're' : 'e'} place, ${player.name}, ${player.value}`}
      disabled={!player.onPress}
      onPress={player.onPress}
      style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: tokens.space[2] }}
    >
      <CrownSimpleIcon size={20} weight="fill" color={color} />
      <Avatar name={player.name} src={player.src} tier={player.tier} size="lg" decorative />
      <PlayerName
        name={player.name}
        premium={player.premium}
        badgeSize={16}
        variant="callout"
        weight="600"
        justify="center"
        style={{ marginTop: tokens.space[2] }}
      />
      <Text variant="caption" color="muted" mono>
        {player.value}
      </Text>
      <View
        style={{
          alignSelf: 'stretch',
          height,
          marginTop: tokens.space[2],
          alignItems: 'center',
          justifyContent: 'center',
          borderTopLeftRadius: radius.md,
          borderTopRightRadius: radius.md,
          backgroundColor: tint(color),
        }}
      >
        <Text variant="title2" weight="700" mono color={color}>
          {rank}
        </Text>
      </View>
    </PressableScale>
  )
}

/** Les trois premiers d'un classement : le 1er au centre, le 2e à gauche, le 3e à droite. */
export function Podium({ players, style }: PodiumProps) {
  const [first, second, third] = players
  return (
    <View accessibilityLabel="Podium" style={[{ flexDirection: 'row', alignItems: 'flex-end', gap: tokens.space[3] }, style]}>
      {second ? <Step player={second} rank={2} /> : <View style={{ flex: 1 }} />}
      {first && <Step player={first} rank={1} />}
      {third ? <Step player={third} rank={3} /> : <View style={{ flex: 1 }} />}
    </View>
  )
}
