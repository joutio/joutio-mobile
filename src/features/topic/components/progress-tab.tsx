import { ListGroup, TabScrollView, TitleRow, tokens } from '@/design-system'
import type { TopicOverviewView } from '@/shared/types/bff'
import { topicName } from '@/shared/utils/topic-name'
import { useMyTitles, useWearTitle } from '../hooks/use-topic'
import { formatNumber, MASTERY_TIERS, MASTERY_XP, tierLabel } from '../lib/format'

/** Onglet Progression : tous les titres du sujet et leurs conditions. Un seul porté. */
export function ProgressTab({ overview }: { overview: TopicOverviewView }) {
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
      <ListGroup surface="surface">
        {MASTERY_TIERS.map((tier, index) => {
          const earned = played && index <= reached
          const key = `${topic.topicId}:${tier}`
          return (
            <TitleRow
              key={tier}
              tier={tier}
              title={label(tier)}
              progress={
                !earned && index === 0
                  ? { value: 0, label: '1 partie restante' }
                  : !earned && progress && index > 0
                  ? {
                      value: Math.min(100, (progress.xp / MASTERY_XP[tier]) * 100),
                      label: `${formatNumber(Math.max(0, MASTERY_XP[tier] - progress.xp))} XP restants`,
                    }
                  : undefined
              }
              locked={!earned}
              worn={titles.data?.equippedKey === key}
              wearing={wear.isPending && wear.variables === key}
              disabled={wear.isPending}
              onWear={() => wear.mutate(titles.data?.equippedKey === key ? null : key)}
              last={index === MASTERY_TIERS.length - 1}
            />
          )
        })}
      </ListGroup>
    </TabScrollView>
  )
}
