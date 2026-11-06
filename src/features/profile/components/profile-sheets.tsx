import { View } from 'react-native'
import { Avatar, HAIRLINE, MobileSheet, Pill, RankLadder, Text, tokens, useTheme, type TierCode } from '@/design-system'
import type { BadgeFamilySummary } from '../lib/badges'
import { RANKS, rankRule } from '../lib/format'

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
