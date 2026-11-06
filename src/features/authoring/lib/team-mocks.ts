import type { TierCode } from '@/design-system'

/**
 * Équipe d'un sujet : **mock** (`design/specs/screens/creation.md` § 5). Le backend n'a ni rôle administrateur ni
 * rédacteur : l'écriture est réservée au créateur. Mêmes membres pour tous les sujets ; changer un rôle, inviter ou
 * retirer reste local à l'écran.
 */
export type TeamRole = 'admin' | 'writer'

export interface TeamMemberMock {
  id: string
  name: string
  tier: TierCode
  role: TeamRole
}

/** Candidats à inviter, 20 par page (`FeedFooter`). */
export const CANDIDATES_PAGE = 20

export const TEAM_MOCK: readonly TeamMemberMock[] = [
  { id: 'm2', name: 'Sofia R.', tier: 'PLATINE', role: 'admin' },
  { id: 'm3', name: 'Hugo L.', tier: 'OR', role: 'writer' },
  { id: 'm4', name: 'Inès B.', tier: 'ARGENT', role: 'writer' },
]

const NAMES = ['Camille D.', 'Yanis K.', 'Léa M.', 'Noah P.', 'Jade T.', 'Adam S.', 'Chloé V.', 'Malo G.', 'Zoé F.', 'Liam C.', 'Rose A.', 'Nathan E.']
const TIERS: TierCode[] = ['FER', 'BRONZE', 'ARGENT', 'OR', 'PLATINE', 'EMERAUDE', 'DIAMANT']

export const CANDIDATES_MOCK: readonly Omit<TeamMemberMock, 'role'>[] = Array.from({ length: 48 }, (_, index) => ({
  id: `c${index}`,
  name: index < NAMES.length ? (NAMES[index] ?? '') : `${NAMES[index % NAMES.length] ?? ''} ${Math.floor(index / NAMES.length) + 1}`,
  tier: TIERS[index % TIERS.length] ?? 'FER',
}))
