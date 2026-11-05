import { TitleRibbon } from '../brand/title-ribbon'
import { CheckCircleIcon } from '../icons'
import { Button } from '../primitives/button'
import { Pill } from '../primitives/pill'
import type { TierCode } from '../tokens.generated'
import { UnlockContent } from './unlock-content'

export interface TitleUnlockProps {
  tier: TierCode
  title: string
  topic: string
  text: string
  next?: TierCode
  nextRule?: string
  /** Porté : « Porter ce titre » laisse place à la pastille « Titre porté », sans décaler la suite. */
  worn?: boolean
  wearing?: boolean
  onWear?: () => void
}

/** Un déblocage par titre gagné : le ruban se déroule. */
export function TitleUnlock({ tier, title, topic, text, next, nextRule, worn = false, wearing = false, onWear }: TitleUnlockProps) {
  return (
    <UnlockContent
      tier={tier}
      crumbFrom={topic}
      hero={<TitleRibbon tier={tier} text={title} width={300} />}
      heroMotion="unroll"
      eyebrow="Nouveau titre débloqué"
      headline={title}
      text={text}
      extra={
        worn ? (
          <Pill tone="correct" icon={CheckCircleIcon}>
            Titre porté
          </Pill>
        ) : (
          <Button variant="gray" tone="neutral" size="S" icon={CheckCircleIcon} loading={wearing} onPress={onWear}>
            Porter ce titre
          </Button>
        )
      }
      next={next && nextRule ? { tier: next, rule: nextRule, preview: <TitleRibbon tier={next} text="" width={96} state="locked" /> } : undefined}
    />
  )
}
