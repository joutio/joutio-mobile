import { View } from 'react-native'
import {
  Avatar,
  Button,
  CrownSimpleIcon,
  HAIRLINE,
  MobileSheet,
  Pill,
  RankLadder,
  Text,
  TopicRow,
  toCategoryCode,
  tokens,
  useTheme,
  type TierCode,
} from '@/design-system'
import { formatNumber, tierLabel } from '@/features/topic/lib/format'
import type { TopicStatView } from '@/shared/types/bff'
import { topicName } from '@/shared/utils/topic-name'
import type { BadgeFamilySummary } from '../lib/badges'
import { masteryOf, RANKS, rankRule } from '../lib/format'

/** Rangs : les 7 rangs et leur seuil, le rang du joueur agrandi, les suivants verrouillés. */
export function RanksSheet({
  open,
  onClose,
  name,
  avatar,
  tier,
}: {
  open: boolean
  onClose: () => void
  name: string
  avatar?: string
  tier: TierCode | undefined
}) {
  const { colors, radius } = useTheme()
  const current = tier ? RANKS.indexOf(tier) : -1
  return (
    <MobileSheet open={open} onClose={onClose} title="Rangs">
      <View style={{ overflow: 'hidden', borderRadius: radius.md }}>
        {RANKS.map((rank, index) => {
          const isCurrent = index === current
          return (
            <View
              key={rank}
              accessible
              accessibilityLabel={[tokens.tier[rank].label, rankRule(rank), isCurrent && 'ton rang', index > current && 'verrouillé']
                .filter(Boolean)
                .join(', ')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: tokens.space[4],
                paddingHorizontal: tokens.space[5],
                paddingVertical: tokens.space[3],
                backgroundColor: isCurrent ? colors.raised : 'transparent',
                borderBottomWidth: index < RANKS.length - 1 ? HAIRLINE : 0,
                borderBottomColor: colors.border,
              }}
            >
              <Avatar name={name} src={avatar} tier={rank} size={isCurrent ? 'lg' : 'list'} locked={index > current} decorative />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="headline" numberOfLines={1}>
                  {tokens.tier[rank].label}
                </Text>
                <Text variant="caption" color="muted" numberOfLines={1}>
                  {rankRule(rank)}
                </Text>
              </View>
              {isCurrent && <Pill>Ton rang</Pill>}
            </View>
          )
        })}
      </View>
    </MobileSheet>
  )
}

/** Maîtrise par sujet : palier et XP de chaque sujet joué, puis l'encart Premium. */
export function MasterySheet({
  open,
  onClose,
  topics,
  onPremium,
}: {
  open: boolean
  onClose: () => void
  topics: readonly TopicStatView[]
  onPremium: () => void
}) {
  const { colors, radius } = useTheme()
  const sorted = [...topics].sort((a, b) => b.xp - a.xp)
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title="Maîtrise par sujet"
      tall
      footer={
        <View style={{ gap: tokens.space[3] }}>
          <Text variant="caption" color="muted" align="center">
            Victoires et temps de réponse sujet par sujet avec Premium.
          </Text>
          <Button full variant="tinted" icon={CrownSimpleIcon} onPress={onPremium}>
            Découvrir Premium
          </Button>
        </View>
      }
    >
      <View style={{ overflow: 'hidden', borderRadius: radius.md, backgroundColor: colors.raised }}>
        {sorted.map((topic, index) => (
          <TopicRow
            key={topic.topicId}
            title={topicName(topic.names)}
            category={toCategoryCode(undefined)}
            image={topic.imageUrl ?? undefined}
            sub={`${tierLabel(masteryOf(topic.xp))} · ${formatNumber(topic.xp)} XP`}
            last={index === sorted.length - 1}
          />
        ))}
      </View>
    </MobileSheet>
  )
}

/** Fiche d'une famille de badges : définition et échelle des 7 paliers. La famille reste affichée pendant la fermeture. */
export function BadgeFamilySheet({ open, family, onClose }: { open: boolean; family: BadgeFamilySummary | undefined; onClose: () => void }) {
  return (
    <MobileSheet open={open} onClose={onClose} title={family?.name ?? ''}>
      {family && (
        <View style={{ gap: tokens.space[4] }}>
          <Text variant="callout" color="muted" align="center">
            {family.description}
          </Text>
          <RankLadder rungs={family.rungs} icon={family.icon} />
        </View>
      )}
    </MobileSheet>
  )
}
