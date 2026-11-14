import { tokens, type TierCode } from '@/design-system'
import { useTopicOverview } from '@/features/topic/hooks/use-topic'

/**
 * Nom du titre porté (`topicId:TIER`) : les vues ne portent que la clé, le nom vient des titres du sujet, avec le repli
 * « Palier · Sujet » (même règle que la fiche joueur).
 */
export function useEquippedTitle(key: string | null | undefined): string | undefined {
  const [topicId = '', tier] = (key ?? '').split(':') as [string?, TierCode?]
  const overview = useTopicOverview(topicId)
  if (!tier || !overview.data) return undefined
  return overview.data.titles?.fr?.[tier] ?? `${tokens.tier[tier].label} · ${overview.data.topic.names?.fr ?? ''}`
}
