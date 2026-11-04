# domain/

Logique client sans React ni React Native (chronologie du duel, calculs d'Elo, de score, etc.).
Elle est isolée ici pour être extraite plus tard dans un paquet partagé (Lot 5, `design/specs/mobile-kit.md` § 8).

Règles : aucun import de `react`, `react-native`, `expo-*` ni de `src/design-system`. Fonctions pures et types.
