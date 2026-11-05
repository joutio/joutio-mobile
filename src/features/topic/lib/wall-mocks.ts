import type { TierCode } from '@/design-system'

/**
 * Mur d'un sujet : **mock** (`design/specs/screens/fiche-sujet.md` § 5). Le BFF n'expose ni publications, ni
 * commentaires, ni mentions J'aime. Mêmes données pour tous les sujets ; publier, aimer et commenter restent locaux.
 */
export interface WallPostMock {
  id: string
  name: string
  tier: TierCode
  meta: string
  text: string
  likes: number
  comments: number
}

export interface WallCommentMock {
  id: string
  author: string
  text: string
  meta: string
}

export const WALL_PAGE_SIZE = 20
export const COMMENTS_PAGE_SIZE = 20

const TIERS: TierCode[] = ['FER', 'BRONZE', 'ARGENT', 'OR', 'PLATINE', 'EMERAUDE', 'DIAMANT']
const TIER_LABEL: Record<TierCode, string> = {
  FER: 'Fer',
  BRONZE: 'Bronze',
  ARGENT: 'Argent',
  OR: 'Or',
  PLATINE: 'Platine',
  EMERAUDE: 'Émeraude',
  DIAMANT: 'Diamant',
}
const NAMES = ['Idriss B.', 'Yanis M.', 'Sofia R.', 'Léa P.', 'Noah T.', 'Hugo D.', 'Inès K.', 'Malik S.', 'Chloé V.', 'Adam L.', 'Jade F.', 'Rayan O.']
const ANECDOTES = [
  'La phrase la plus citée de ce sujet apparaît pour la première fois bien après la mort de son auteur supposé.',
  'Astuce : regarde d’abord la date. La moitié des pièges se joue à un siècle près.',
  'Une réponse que tout le monde rate : la version la plus connue est une légende popularisée au XIXᵉ siècle.',
  'Je viens de gagner trois duels d’affilée grâce à cette règle : en cas de doute, la réponse la plus précise est souvent la bonne.',
  'Source à garder sous la main pour réviser : les chronologies officielles sont bien plus fiables que les citations.',
]

export const WALL_EVENT_MOCK = {
  tier: 'OR' as TierCode,
  title: 'Sofia R. a obtenu Éclair · Or',
  context: '5 bonnes réponses en moins de 3 s · il y a 12 min',
}

export const WALL_POSTS_MOCK: WallPostMock[] = Array.from({ length: 32 }, (_, index) => {
  const tier = TIERS[(index * 3 + 3) % TIERS.length] ?? 'OR'
  const when = index === 0 ? 'il y a 1 h' : index === 1 ? 'hier' : `il y a ${index + 1} j`
  return {
    id: `post-${index}`,
    name: NAMES[index % NAMES.length] ?? 'Joueur',
    tier,
    meta: `${TIER_LABEL[tier]} · ${when}`,
    text: ANECDOTES[index % ANECDOTES.length] ?? '',
    likes: Math.max(0, 24 - index),
    comments: index % 8,
  }
})

export const WALL_COMMENTS_MOCK: WallCommentMock[] = Array.from({ length: 26 }, (_, index) => ({
  id: `comment-${index}`,
  author: NAMES[(index + 2) % NAMES.length] ?? 'Joueur',
  text: index === 0 ? 'La source citée le plus souvent date du XIXᵉ siècle. Rien de contemporain.' : 'Bonne remarque, merci pour la source.',
  meta: `${index + 1} h`,
}))
