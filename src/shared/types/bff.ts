/** Contrats de la surface BFF (`services/joutio-bff/AGENTS.md` § 3), limités à ce que l'app consomme. */

export type Language = 'fr' | 'en'
export type TopicNames = Record<string, string>
export type TopicStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

/** `GET /api/me`, champs lus par l'app. */
export interface MeView {
  userId: string
  email: string
  pseudonym: string
  language: Language
  /** Codes d'univers ordonnés (premier = principal), 3 au plus. */
  interests: string[]
  onboardingCompleted: boolean
  premium: boolean
}

export interface TopicCardView {
  topicId: string
  names: TopicNames
  description: string | null
  category: string | null
  categoryLabel: string | null
  imageUrl: string | null
  bannerUrl: string | null
  followersCount: number
  questionsCount: number
  followed: boolean
  status: TopicStatus
}
