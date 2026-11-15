import { customTitle } from '@joutio/client/authoring'
import type { TierCode } from '@/design-system'
import { currentLanguage, t, tierKey } from '@/lib/i18n'
import { topicName } from '@/shared/utils/topic-name'
import { useTopicOverview } from '@/features/topic/hooks/use-topic'

/**
 * Nom du titre porté (`topicId:TIER`) : les vues ne portent que la clé, le nom vient des titres du sujet, avec le repli
 * « Palier · Sujet » (même règle que la fiche joueur).
 */
export function useEquippedTitle(key: string | null | undefined): string | undefined {
  const [topicId = '', tier] = (key ?? '').split(':') as [string?, TierCode?]
  const overview = useTopicOverview(topicId)
  if (!tier || !overview.data) return undefined
  const topic = topicName(overview.data.topic.names)
  return customTitle(overview.data.titles, tier, currentLanguage()) ?? t('workshop.tierTitle', { tier: t(tierKey(tier)), topic })
}
