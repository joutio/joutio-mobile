import type { TopicNames } from '@/shared/types/bff'

/** Nom d'un sujet dans la langue demandée, avec repli sur le français, l'anglais, puis le premier nom. */
export function topicName(names: TopicNames | null | undefined, language = 'fr'): string {
  if (!names) return ''
  return names[language] ?? names.fr ?? names.en ?? Object.values(names)[0] ?? ''
}
