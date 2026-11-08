import { useState } from 'react'
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native'
import { TitleRibbon } from '../brand/title-ribbon'
import { HAIRLINE } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'
import { PressableScale } from './pressable-scale'
import { Text } from './text'
import { ProgressBar } from './progress-bar'

export interface TitleRowProps {
  tier: TierCode
  title: string
  topic?: string
  progress?: { value: number; label: string }
  worn?: boolean
  locked?: boolean
  /** Bascule Porter / Enlever, selon `worn`. */
  onWear?: () => void
  wearing?: boolean
  disabled?: boolean
  last?: boolean
  style?: StyleProp<ViewStyle>
}

/** Toute la ligne porte/enlève le titre ; le ruban tient dans la ligne, avec ellipse si nécessaire. */
export function TitleRow({
  tier,
  title,
  progress,
  worn = false,
  locked = false,
  onWear,
  wearing = false,
  disabled = false,
  last = false,
  style,
}: TitleRowProps) {
  const { colors } = useTheme()
  const [availableWidth, setAvailableWidth] = useState(220)
  const inactive = locked || disabled || wearing || !onWear
  return (
    <PressableScale
      pressedScale={1}
      ripple
      disabled={inactive}
      accessibilityRole={locked || !onWear ? 'text' : 'button'}
      accessibilityLabel={locked ? `${title}, verrouillé` : `${worn ? 'Enlever' : 'Porter'} ${title}`}
      accessibilityState={{ disabled: inactive, selected: worn, busy: wearing }}
      onPress={onWear}
      style={({ pressed }) => [
        {
          minHeight: 64,
          overflow: 'hidden',
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.space[3],
          paddingHorizontal: tokens.space[5],
          paddingVertical: tokens.space[3],
          backgroundColor: pressed ? colors.hover : 'transparent',
        },
        style,
      ]}
    >
      <View onLayout={(event) => setAvailableWidth(event.nativeEvent.layout.width)} style={{ flex: 1, minWidth: 0, gap: tokens.space[2] }}>
        <TitleRibbon tier={tier} text={title} width={availableWidth} state={locked ? 'locked' : 'earned'} />
        {locked && progress && <ProgressBar value={progress.value} label={progress.label} tone={tier} />}
      </View>
      {wearing ? (
        <ActivityIndicator color={colors.muted} style={{ position: 'absolute', right: tokens.space[3], top: tokens.space[2] }} />
      ) : worn ? (
        <View
          pointerEvents="none"
          accessible={false}
          style={{
            position: 'absolute',
            right: -tokens.space[5],
            top: tokens.space[4],
            width: tokens.space[5] * 5,
            backgroundColor: colors.correct,
            transform: [{ rotate: '45deg' }],
            alignItems: 'center',
          }}
        >
          <Text variant="caption" weight="600" color={colors.bg} maxFontSizeMultiplier={1}>
            Porté
          </Text>
        </View>
      ) : null}
      {!last && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: HAIRLINE, backgroundColor: colors.border }} />}
    </PressableScale>
  )
}
