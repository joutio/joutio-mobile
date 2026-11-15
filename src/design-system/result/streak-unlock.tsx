import { nextStreakMilestone } from '@joutio/client/profile'
import { View } from 'react-native'
import { FireIcon } from '../icons'
import { Text } from '../primitives/text'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { UnlockContent } from './unlock-content'
import { t, useT } from '@/lib/i18n'

const daysLabel = (days: number) => (days > 1 ? t('mobile.ds.daysMany', { count: days }) : t('mobile.ds.daysOne', { count: days }))

export interface StreakUnlockProps {
  /** Jours de série atteints avec cette partie. */
  days: number
  /** Suite de « Prochain : 7 jours », par exemple `débloque Micah.` Par défaut : les jours restants. */
  nextRule?: string
}

/**
 * Nouveau jour de série (2026-11-13, lab `StreakUnlock`) : la première partie classée du jour ouvre la séquence, avant
 * le rang, les titres et les badges. La flamme s'allume ; couleur d'accent, aucun rang en jeu.
 */
export function StreakUnlock({ days, nextRule }: StreakUnlockProps) {
  const t = useT()
  const { colors, radius } = useTheme()
  const next = nextStreakMilestone(days)
  return (
    <UnlockContent
      accent={{ glow: colors.accent, ink: colors.accentInk, label: daysLabel(days) }}
      crumbLead={<FireIcon size={16} weight="fill" color={colors.muted} />}
      crumbFrom={t('profile.streak')}
      hero={
        <View style={{ width: 160, height: 160, borderRadius: radius.full, backgroundColor: colors.warm, alignItems: 'center', justifyContent: 'center' }}>
          <FireIcon size={104} weight="fill" color={colors.accent} />
          <View
            style={{
              position: 'absolute',
              bottom: -tokens.space[2],
              paddingHorizontal: tokens.space[4],
              paddingVertical: tokens.space[1],
              borderRadius: radius.full,
              backgroundColor: colors.accent,
            }}
          >
            <Text variant="title1" color="onAccent">
              {days}
            </Text>
          </View>
        </View>
      }
      heroMotion="ignite"
      eyebrow={t('mobile.ds.newStreakDay')}
      headline={daysLabel(days)}
      text={days > 1 ? t('mobile.ds.streakPlayed', { days, next: daysLabel(days + 1) }) : t('mobile.ds.streakStarts')}
      next={
        next
          ? {
              label: daysLabel(next),
              rule: nextRule ?? t('mobile.ds.stillDays', { count: daysLabel(next - days) }),
              preview: (
                <View style={{ width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.raised, alignItems: 'center', justifyContent: 'center' }}>
                  <FireIcon size={28} weight="fill" color={colors.muted} />
                </View>
              ),
            }
          : undefined
      }
    />
  )
}
