import type { RewardState } from '@/design-system'
import { formatNumber } from '@/features/topic/lib/format'
import type { BadgeCollectionView, MeView, RewardsView } from '@joutio/client/api-types'
import { currentLanguage, formatDate, t } from '@/lib/i18n'

export type AvatarStyleId = 'base' | 'micah' | 'lorelei' | 'notionists'

/** Styles d'avatar et leurs droits, comme `AvatarEntitlementPolicy` du BFF : base gratuit, Micah par récompense ou Premium, le reste Premium. */
export const AVATAR_STYLES = (): { id: AvatarStyleId; title: string }[] => ([
  { id: 'base', title: t('mobile.avatar.styleBase') },
  { id: 'micah', title: 'Micah' },
  { id: 'lorelei', title: 'Lorelei' },
  { id: 'notionists', title: 'Notionists' },
])

const MICAH_REWARD = 'MICAH_AVATAR'

/** Style porté, lu dans les options sérialisées ; sans options, l'avatar de base. */
export function styleOf(avatarOptions: string | null | undefined): AvatarStyleId {
  if (!avatarOptions) return 'base'
  try {
    const style = (JSON.parse(avatarOptions) as { style?: string }).style
    return AVATAR_STYLES().some((item) => item.id === style) ? (style as AvatarStyleId) : 'micah'
  } catch {
    return 'base'
  }
}

export interface AvatarStyleEntry {
  id: AvatarStyleId
  title: string
  state: RewardState
  rule: string
  /** Droit d'utilisation (débloqué ou Premium). */
  usable: boolean
  progress?: number
  progressLabel?: string
}

/** État de chaque style pour le joueur : utilisé, débloqué, verrouillé (avec avancement) ou réservé à Premium. */
export function avatarStylesFor(me: MeView | undefined, rewards: RewardsView | undefined, badges: BadgeCollectionView | undefined): AvatarStyleEntry[] {
  const premium = me?.premium ?? false
  const current = styleOf(me?.avatarOptions)
  const micah = rewards?.rewards.find((reward) => reward.code === MICAH_REWARD)
  const micahUnlocked = premium || micah?.unlocked === true || (me?.rewards ?? []).includes(MICAH_REWARD)
  const condition = micah?.condition
  const badge = condition ? badges?.families.flatMap((family) => family.badges).find((item) => item.code === condition.badgeCode) : undefined

  return AVATAR_STYLES().map(({ id, title }) => {
    const usable = id === 'base' || (id === 'micah' ? micahUnlocked : premium)
    const state: RewardState = id === current && usable ? 'active' : usable ? 'unlocked' : id === 'micah' ? 'locked' : 'premium'
    if (id === 'base') return { id, title, state, usable, rule: t('avatar.ruleFree') }
    if (id !== 'micah') return { id, title, state, usable, rule: t('avatar.rulePremium') }
    const badgeRule = condition ? t('avatar.ruleMicah', { badge: condition.badgeLabel, count: formatNumber(condition.target) }) : t('mobile.avatar.ruleMicahDefault')
    if (usable) {
      const when = micah?.unlockedAt
        ? ` ${t('avatar.unlockedOn', { date: formatDate(new Date(micah.unlockedAt), currentLanguage(), { day: 'numeric', month: 'short' }) })}`
        : premium && !micah?.unlocked
          ? ` ${t('avatar.rulePremium')}`
          : ''
      return { id, title, state, usable, rule: `${badgeRule}${when}` }
    }
    const target = badge?.target ?? condition?.target ?? 7
    const done = Math.min(badge?.progress ?? 0, target)
    return { id, title, state, usable, rule: badgeRule, progress: Math.round((done / Math.max(1, target)) * 100), progressLabel: t('mobile.common.progress', { done, target }) }
  })
}
