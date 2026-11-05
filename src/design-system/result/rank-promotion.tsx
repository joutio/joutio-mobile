import { Avatar } from '../primitives/avatar'
import { tokens, type TierCode } from '../tokens.generated'
import { UnlockContent } from './unlock-content'

export interface RankPromotionProps {
  from: TierCode
  tier: TierCode
  next?: TierCode
  name: string
  src?: string
  text: string
  /** Suite de « Prochain : Émeraude », par exemple `à 1 200.` */
  nextRule?: string
}

/** Premier déblocage de la séquence : le cadre se forge. */
export function RankPromotion({ from, tier, next, name, src, text, nextRule }: RankPromotionProps) {
  return (
    <UnlockContent
      tier={tier}
      crumbLead={<Avatar name={name} src={src} tier={from} size="sm" decorative />}
      crumbFrom={tokens.tier[from].label}
      hero={<Avatar name={name} src={src} tier={tier} size="hero" decorative />}
      heroMotion="celebrate"
      eyebrow="Nouveau rang débloqué"
      headline={tokens.tier[tier].label}
      text={text}
      next={next && nextRule ? { tier: next, rule: nextRule, preview: <Avatar name={name} src={src} tier={next} size="row" locked decorative /> } : undefined}
    />
  )
}
