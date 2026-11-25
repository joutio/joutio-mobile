import type { TopicNames } from '@joutio/client/topics'
import { currentLanguage } from '@/lib/i18n'

/** Nom d'un sujet dans la langue demandée (par défaut celle de l'app), avec repli sur le français, l'anglais, puis le premier nom. */
export function topicName(names: TopicNames | null | undefined, language: string = currentLanguage()): string {
  if (!names) return ''
  return names[language] ?? names.fr ?? names.en ?? Object.values(names)[0] ?? ''
}
