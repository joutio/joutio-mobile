import { View } from 'react-native'
import { ListGroup, ProgressBar, TabScrollView, TitleRow, tokens, useTheme } from '@/design-system'
import type { TopicOverviewView } from '@/shared/types/bff'
import { topicName } from '@/shared/utils/topic-name'
import { useMyTitles, useWearTitle } from '../hooks/use-topic'
import { formatNumber, MASTERY_TIERS, MASTERY_XP, tierLabel } from '../lib/format'

/** Onglet Progression : complétion et maîtrise, puis tous les titres du sujet, décrochés ou non. Un seul porté. */
export function ProgressTab({ overview }: { overview: TopicOverviewView }) {
  const { colors, radius } = useTheme()
  const titles = useMyTitles()
  const wear = useWearTitle()
  const { topic, myProgress: progress } = overview
  const name = topicName(topic.names)
  const reached = progress ? MASTERY_TIERS.indexOf(progress.tier) : -1
  // Le premier titre demande au moins une partie humaine terminée (`ProfileUpdateService.updateEquippedTitle`).
  const played = (progress?.games ?? 0) > 0
  const label = (tier: (typeof MASTERY_TIERS)[number]) => overview.titles?.fr?.[tier] ?? `${tierLabel(tier)} · ${name}`

  return (
    <TabScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ gap: tokens.space[5], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[2], paddingBottom: tokens.space[7] }}
    >
      <View style={{ gap: tokens.space[5], padding: tokens.space[5], borderRadius: radius.lg, backgroundColor: colors.surface }}>
        <ProgressBar
          label={`Progression · ${progress?.completedQuestions ?? 0} / ${progress?.totalQuestions ?? topic.questionsCount}`}
          value={progress?.completionPercent ?? 0}
          showValue
        />
        <ProgressBar
          label={
            progress?.nextTier
              ? `Maîtrise · ${formatNumber(progress.tierRemainingXp)} XP avant ${tierLabel(progress.nextTier)}`
              : progress
                ? 'Maîtrise · palier maximal'
                : `Maîtrise · ${formatNumber(MASTERY_XP.BRONZE)} XP avant ${tierLabel('BRONZE')}`
          }
          value={progress?.tierProgressPercent ?? 0}
          tone={progress?.tier ?? 'FER'}
          showValue
        />
      </View>
      <ListGroup surface="surface">
        {MASTERY_TIERS.map((tier, index) => {
          const earned = played && index <= reached
          const key = `${topic.topicId}:${tier}`
          return (
            <TitleRow
              key={tier}
              tier={tier}
              title={label(tier)}
              topic={
                earned
                  ? `${tierLabel(tier)} · obtenu`
                  : index === 0
                    ? `${tierLabel(tier)} · après une partie`
                    : `${tierLabel(tier)} · à ${formatNumber(MASTERY_XP[tier])} XP`
              }
              locked={!earned}
              worn={titles.data?.equippedKey === key}
              wearing={wear.isPending && wear.variables === key}
              onWear={() => wear.mutate(key)}
              last={index === MASTERY_TIERS.length - 1}
            />
          )
        })}
      </ListGroup>
    </TabScrollView>
  )
}
