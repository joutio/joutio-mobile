/**
 * Données de l'Accueil que le BFF n'expose pas encore (`design/specs/screens/accueil.md` § 10). Chaque valeur est un
 * **mock** affiché tel quel ; à remplacer par le champ BFF correspondant dès qu'il existe.
 */
export const HOME_MOCKS = {
  /**
   * Série en **jours** consécutifs de jeu (« 4 jours de série »). `/api/me` ne donne que `stats.currentWinStreak`
   * (victoires d'affilée), qui n'est pas la même mesure.
   */
  streakDays: 4,
  /** Défis reçus en attente (badge de l'onglet Défis) : aucun compteur dédié côté BFF. */
  pendingChallenges: 2,
} as const
