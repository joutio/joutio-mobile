import type { RewardState } from '@/design-system'
import { formatNumber } from '@/features/topic/lib/format'
import type { BadgeCollectionView, MeView, RewardsView } from '@/shared/types/bff'

export type AvatarStyleId = 'base' | 'micah' | 'lorelei' | 'notionists'

/** Styles d'avatar et leurs droits, comme `AvatarEntitlementPolicy` du BFF : base gratuit, Micah par récompense ou Premium, le reste Premium. */
export const AVATAR_STYLES: { id: AvatarStyleId; title: string }[] = [
  { id: 'base', title: 'Avatar de base' },
  { id: 'micah', title: 'Micah' },
  { id: 'lorelei', title: 'Lorelei' },
  { id: 'notionists', title: 'Notionists' },
]

const MICAH_REWARD = 'MICAH_AVATAR'
const DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

/** Style porté, lu dans les options sérialisées ; sans options, l'avatar de base. */
export function styleOf(avatarOptions: string | null | undefined): AvatarStyleId {
  if (!avatarOptions) return 'base'
  try {
    const style = (JSON.parse(avatarOptions) as { style?: string }).style
    return AVATAR_STYLES.some((item) => item.id === style) ? (style as AvatarStyleId) : 'micah'
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

  return AVATAR_STYLES.map(({ id, title }) => {
    const usable = id === 'base' || (id === 'micah' ? micahUnlocked : premium)
    const state: RewardState = id === current && usable ? 'active' : usable ? 'unlocked' : id === 'micah' ? 'locked' : 'premium'
    if (id === 'base') return { id, title, state, usable, rule: 'Offert à tous les joueurs.' }
    if (id !== 'micah') return { id, title, state, usable, rule: 'Inclus dans Premium.' }
    const badgeRule = condition ? `Badge ${condition.badgeLabel} : ${formatNumber(condition.target)} jours de série.` : 'Badge Régulier : 7 jours de série.'
    if (usable) {
      const when = micah?.unlockedAt ? ` Débloquée le ${DATE.format(new Date(micah.unlockedAt))}.` : premium && !micah?.unlocked ? ' Inclus dans Premium.' : ''
      return { id, title, state, usable, rule: `${badgeRule}${when}` }
    }
    const target = badge?.target ?? condition?.target ?? 7
    const done = Math.min(badge?.progress ?? 0, target)
    return { id, title, state, usable, rule: badgeRule, progress: Math.round((done / Math.max(1, target)) * 100), progressLabel: `${done} sur ${target}` }
  })
}
