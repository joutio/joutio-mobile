import { View, type StyleProp, type ViewStyle } from 'react-native'
import { TitleRibbon } from '../brand/title-ribbon'
import { HAIRLINE } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'
import { Button } from './button'
import { Pill } from './pill'
import { Text } from './text'

export interface TitleRowProps {
  tier: TierCode
  title: string
  /** Sous le ruban : le sujet, ou la condition quand le titre est verrouillé. */
  topic?: string
  /** Titre actuellement porté. */
  worn?: boolean
  /** Pas encore décroché. */
  locked?: boolean
  onWear?: () => void
  /** Requête de port en cours. */
  wearing?: boolean
  last?: boolean
  style?: StyleProp<ViewStyle>
}

/** Titre d'un sujet : ruban, condition, et Porter (ou Porté). */
export function TitleRow({ tier, title, topic, worn = false, locked = false, onWear, wearing = false, last = false, style }: TitleRowProps) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        {
          minHeight: 64,
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.space[4],
          paddingHorizontal: tokens.space[5],
          paddingVertical: tokens.space[3],
        },
        style,
      ]}
    >
      <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-start', gap: tokens.space[2] }}>
        <TitleRibbon tier={tier} text={title} width={220} state={locked ? 'locked' : 'earned'} />
        {topic && (
          <Text variant="caption" color="muted" numberOfLines={1} style={{ paddingLeft: tokens.space[2] }}>
            {topic}
          </Text>
        )}
      </View>
      {locked ? null : worn ? (
        <Pill tone="online">Porté</Pill>
      ) : (
        <Button variant="gray" tone="neutral" size="S" loading={wearing} onPress={onWear} accessibilityLabel={`Porter ${title}`}>
          Porter
        </Button>
      )}
      {!last && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: tokens.space[5], right: 0, bottom: 0, height: HAIRLINE, backgroundColor: colors.border }}
        />
      )}
    </View>
  )
}
