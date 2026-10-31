# FIDELITY — joutio-mobile v4 (marque Joutio)

> **Référence : `design/Joutio App Mobile.dc.html`, `design/Joutio Mobile Foundations.dc.html`
> et `design/tokens.json`.** La direction « UI native adaptative » (SF Pro, indigo, NativeTabs
> seuls) est remplacée par la marque Joutio : Geist, ambre, surfaces plates, chrome custom.

## Décisions verrouillées (30 octobre 2026)

- **Pixel-perfect** sur le contenu et les barres Joutio : barre d'onglets, barre de titre,
  en-têtes, feuilles, composants.
- **Barres système réelles** : Android/iOS dessinent la status bar et la navigation
  (gestes ou 3 boutons). On ne simule ni l'heure, ni la batterie, ni le home indicator.
- **Android d'abord**, iOS ensuite.
- **Premium** : écran « bientôt », aucun achat, aucune pub, aucun ATT en V1.
- **Chat post-duel, blocage joueur et mur de sujet** : V1.1 (backend dédié).
- **Pas de retour** aux composants web, à HeroUI, Uniwind/Tailwind ou aux polices système
  comme police de contenu.

## Jetons

- Couleurs : `design/tokens.json` → `src/ui/tokens.ts` → `useNativeTheme()`.
- Typographie : **Geist** (400/500/600/700) + **Geist Mono** (chiffres tabulaires).
  Styles : `display`, `largeTitle`, `title1`, `title2`, `headline`, `body`, `callout`,
  `footnote`, `caption`, `numeric`.
- Dynamic Type : `AppText` reste `allowFontScaling` avec `maxFontSizeMultiplier=1.4`.
- Rayons : 4/8/12/16/24/9999. Espacement base 4 : 2/4/8/12/16/24/32/40/48/64.
- Ambre = action, jamais texte en clair sur fond clair : utiliser `accentInk`.
- Les deux thèmes du design system sont supportés : la palette suit l'apparence
  système (claire/sombre), avec `theme="light"`/`dark` disponibles dans les
  fichiers de design. Les écrans immersifs de duel restent à valider dans les
  deux thèmes.

## Navigation

- 5 onglets : **Accueil · Sujets · Social · Défis · Profil**.
- Les notifications passent par la **cloche** de la barre de titre, pas par un onglet.
- Barre d'onglets **custom** `JoTabBar`, conforme à `Jo Tab Bar` : icônes Phosphor, verre, filet
  haut, badge Défis. Remplace `NativeTabs`, dont le rendu Android s'écarte de la maquette et qui
  monte tous les onglets dès le démarrage. Bascule en cours (lots 1 et 3).
- Feuilles : `JoSheet` sur `Modal` React Native, la feuille Expo UI ne recevant pas les touches dans
  Expo Go. Les pièces de marque restent en React Native animé.
- Barres de titre custom, avec bouton retour et grand titre repliable.
- Back gesture Android/iOS conservé ; le bouton retour Android ferme la pile.
- Inbox poussée depuis la cloche **sans tab bar** : l'écart à la maquette évite de rattacher
  l'inbox à un seul onglet, la cloche étant présente sur quatre d'entre eux.
- Écrans immersifs (salle, arène, résultat, matchmaking) en plein écran, sans tab bar.

## Composants

- `src/ui/` : `text`, `button`, `card`, `list-row`, `segmented-control`, `avatar`,
  `progress-bar`, `logo`, `icons`.
- `src/ui/jo/` : chrome (`jo-nav-bar`, `jo-tab-bar`, `jo-icon-button`), contenu (`jo-topic-card`,
  `jo-player-row`, `jo-list-row`, `jo-stat`, `jo-pill`, `jo-chip`, `jo-segmented`,
  `jo-progress-bar`, `jo-banner`, `jo-section-header`, `jo-empty-state`, `jo-elo-avatar`),
  feuille (`jo-sheet`) et auth. Tout nouvel écran s'y appuie.
- Haptique : toujours via `haptic()` (`src/lib/haptics.ts`), noms de `tokens.json`, coupée par
  Réglages › Vibrations, jamais deux retours à moins de 100 ms. Tout nouveau composant s'y branche.
- Mouvement : Reanimated CSS (`src/ui/motion.ts`), keyframes reprises du prototype.
- Duel : `DarkTheme` force la palette sombre sur l'arène, la recherche et le résultat. L'intro de
  manche occupe la fin de la transition serveur (`nextRoundAt` − 1,9 s), le VS l'attente avant
  `firstRoundAt`. Horloge locale, sans correction du décalage serveur.
- Écarts assumés : pas de publicité (décision V1) ; onglet Mur absent de la Fiche sujet (V1.1) ;
  cadres de rang en métal uni, sans reflets ni halos ; maîtrise et progression absentes des
  lignes de sujets et abonnés à la place des parties (non exposés par le BFF sur ces vues).
- Variantes de bouton : `primary`, `secondary`, `tertiary`, `plain`, `destructiveSoft`,
  `destructive`. Tailles L 52 / M 44 / S 36. Une seule `primary` par écran.
- Cartes : surface plate, sans filet ni ombre, rayon 16 (rayon 12 pour les cartes de sujet). Le
  filet 1 px sépare les lignes et les barres, pas les cartes.
- États : loading, empty, error, offline, disabled, sélectionné.
- Cibles ≥ 44 px, contraste, labels a11y, Dynamic Type.
- Overlays : `Modal` natif / pageSheet iOS, Alert natif pour les confirmations.

## Référence de performance

Toute mesure runtime se fait sur **APK release** (Android milieu de gamme) : un build debug ou Expo
Go ne vaut pas référence.

| Métrique | Référence | Date |
|---|---|---|
| Bundle Hermes Android (`expo export`) | 13,6 Mo | 31/10/2026 |
| Démarrage à froid | à mesurer sur appareil | |
| Ouverture Fiche sujet, Badges, Profil, matchmaking | à mesurer sur appareil | |
| FPS du duel (reveal) | à mesurer sur appareil | |

## Quality gate

- 390×844, 320×568, 360×800, 412×915.
- clair/sombre, Android/iOS.
- loading / empty / error / offline.
- `npm run typecheck`, `npx expo export --platform android`, `npx expo-doctor`.
- Validation sur appareil via Expo Go / APK.

## Hors périmètre V1

- Chat post-duel, blocage joueur, mur de sujet (V1.1).
- Premium avec achat in-app, publicité, ATT.
- Parité pixel-perfect avec `joutio-web` (sidebar/topbar desktop, ⌘K).
