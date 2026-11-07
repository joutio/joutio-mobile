import { View, type StyleProp, type ViewStyle } from 'react-native'
import { CheckIcon } from '../icons'
import { Spinner } from '../primitives/spinner'
import { Text } from '../primitives/text'
import { alpha } from '../theme/color'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'

export interface PreparationStep {
  id: string
  label: string
}

export interface PreparationStepsProps {
  steps: readonly PreparationStep[]
  /** Étape en cours (index) ; `steps.length` = tout est fait. */
  current: number
  /** Précision sous l'étape en cours (« En attente de Sofia », « Les deux joueurs sont là »). */
  detail?: string
  /** Préparation terminée : carte en vert (`correct`) ; sinon en `warm` une fois engagée. */
  complete?: boolean
  /** Préparation engagée (les deux joueurs sont là) : carte teintée, on ne peut plus quitter. */
  engaged?: boolean
  style?: StyleProp<ViewStyle>
}

/**
 * Étapes de préparation d'une salle (2026-11-07, d'après le stepper de joutio-web) : les joueurs arrivent, profils,
 * tirage des questions, lancement. Faites cochées, en cours avec une roue, à venir en gris.
 */
export function PreparationSteps({ steps, current, detail, complete = false, engaged = false, style }: PreparationStepsProps) {
  const { colors, radius } = useTheme()
  const tint = complete ? colors.correct : engaged ? colors.accent : undefined
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Préparation du duel"
      accessibilityValue={{ min: 0, max: steps.length, now: Math.min(current, steps.length) }}
      style={[
        {
          gap: tokens.space[3],
          padding: tokens.space[4],
          borderRadius: radius.lg,
          backgroundColor: tint ? alpha(tint, 0.12) : colors.surface,
          borderWidth: 1,
          borderColor: tint ? alpha(tint, 0.4) : colors.border,
        },
        style,
      ]}
    >
      {steps.map((step, index) => {
        const done = index < current
        const active = index === current
        return (
          <View key={step.id} style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: done ? colors.correct : 'transparent',
                borderWidth: done ? 0 : 2,
                borderColor: active ? colors.accentInk : colors.border,
              }}
            >
              {done ? <CheckIcon size={14} weight="bold" color={colors.bg} /> : active ? <Spinner size={14} color={colors.accentInk} /> : null}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="callout" weight={active ? '600' : '400'} color={done || active ? 'text' : 'muted'}>
                {step.label.replace(/…$/, '')}
              </Text>
              {active && detail && (
                <Text variant="caption" color="muted" accessibilityLiveRegion="polite">
                  {detail}
                </Text>
              )}
            </View>
          </View>
        )
      })}
    </View>
  )
}
