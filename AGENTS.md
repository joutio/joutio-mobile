# AGENTS.md — joutio-mobile-expo

> Réécriture de l'app mobile Joutio **à partir d'une feuille blanche**, cibles **iOS et Android**.
> La seule référence de design est le lab **`design/`** (workspace) ; l'ancienne app `joutio-mobile`, à archiver,
> n'en est pas une. Le démarrage et la traduction lab → natif suivent **`design/specs/mobile-kit.md`**.
> Conventions de code : `best-practices/.frontend/`.

---

## 1. État

| Étape du kit | État |
|---|---|
| 0. Fondations : tokens, thème, polices, icônes, actifs, mouvement réduit | fait |
| 1. Socle de composants (rangées 1 à 5) | fait, à valider sur appareil |
| 2.1 Onboarding : lancement, connexion OTP, code, univers, notifications, premier thème, session coupée | fait |
| 2.2 Accueil | à faire (`(app)/index.tsx` est provisoire) |

Le **catalogue** (`/catalog`, `joutio://catalog`) est réservé au dev (`__DEV__`) et absent des builds de release.

Onboarding, écarts assumés :

- Google et Facebook : boutons masqués (`EXPO_PUBLIC_*_SIGN_IN_ENABLED`) tant que la configuration native n'est pas
  reprise de `joutio-mobile` (son `AGENTS.md` § 4).
- « Découvrir le duel » termine l'onboarding comme « Explorer l'accueil » : le duel contre un bot arrive avec
  l'écran Duel.
- `GET /api/me/onboarding/recommendations` renvoie 3 sujets au plus (le lab en attend 3 par univers) : correction BFF
  relevée dans `design/specs/screens/onboarding.md` § 4.

Décisions :

- **Hybride natif** (2026-11-03, `design/PARITY.md` § 3) : chrome et contrôles standards natifs, teintés par les
  tokens ; composants de marque faits main d'après le lab.
  - En-têtes : `native-stack` via `nativeHeaderOptions(theme)` (+ `largeTitleOptions` sur une racine) ; `Screen`
    en mode `nativeHeader`. `MobileTopBar` ne sert plus qu'aux cas sans en-tête natif.
  - `Switch` système ; `Segmented` natif (SwiftUI / Material 3) sauf `scrollable` (barre d'onglets maison, à
    indicateur glissant) ; `Menu` sur `@expo/ui` (SwiftUI `Menu`, Compose `DropdownMenu`) ; `Dialog` = alerte
    système (`showDialog`) ; poignée native des feuilles.
  - Précision : filets `HAIRLINE`, `inputStyle` (pas d'interlignage sur un `TextInput`), Dynamic Type plafonné à
    ×1,6, ressort au relâchement, ripple Android sur les lignes.
  - Un `Button` non `full` dans une rangée prend `style={{ alignSelf: 'center' }}`.
- **Écrans à onglets** (Fiche sujet, Profil, Fiche joueur) : `CollapsibleTabsScreen`, sur
  `react-native-collapsible-tab` (une liste virtualisée par onglet : `TabList`, `TabSectionList`,
  `TabScrollView`). En-tête image de 400 pt, mouvement repris du Parallax Header de Reacticx (zoom ×2,5 au tiré,
  parallaxe à mi-vitesse, barre compacte entre 75 et 100 % du repli) : fonctions `heroImageTransform`,
  `heroTitleOpacity`, `compactBarProgress` (`parallax-screen.tsx`), spec `fiche-sujet.md` § 1. Les avertissements Reanimated « Dependencies should only be used on the web » viennent de la
  bibliothèque (PR #17 en attente). `ParallaxScreen` reste pour les écrans à image sans onglets.
- `@react-native-menu/menu` est incompatible avec RN 0.88 (`RCTBridge.h`) : ne pas y revenir.
- Identifiant **`com.joutio.app`** (iOS et Android), celui des stores.
- Feuilles : **TrueSheet** (`@lodev09/react-native-true-sheet`), natives sur les deux OS.
- **Dev build** (`expo-dev-client`) dès le départ, pas d'Expo Go.
- Pas de cible web (D14).

---

## 2. Stack et structure

Expo SDK 58, React Native 0.88 (New Architecture), expo-router, Reanimated 4, Gesture Handler 3, TrueSheet,
expo-image, expo-blur, Phosphor, Geist (`@expo-google-fonts`), Zustand, React Query, React Hook Form + Zod,
expo-secure-store, expo-notifications.

```
src/
  app/                      # routes expo-router (couche mince)
    _layout.tsx             # polices, thème, React Query, session, navigation protégée, ToastHost
    (auth)/                 # login (ou session coupée), code
    (onboarding)/           # universes, notifications, first-topic
    (app)/                  # écrans du joueur connecté et onboardé
    (dev)/catalog/          # catalogue des composants (__DEV__)
    (dev)/tabs/             # aperçu Tabs + JoTabBar (__DEV__)
  design-system/            # traduction native du lab, sans import de app/ ni dev/
    tokens.generated.ts     # copie de design/tokens/tokens.native.ts — ne pas modifier
    tokens.generated.json   # même contenu, pour app.config.ts
    theme/                  # ThemeProvider, ThemeScope/ForceDark, store du réglage, polices, color-mix
    primitives/             # Button, IconButton, Pill, Badge, Avatar, Skeleton, ListRow, Field…
    mobile/                 # Screen, MobileTopBar, BottomNav/JoTabBar, StickyBar, MobileSheet, ToastHost…
    brand/                  # RankFrame (+ actifs PNG)
    motion.ts haptics.ts icons.ts a11y.ts
  features/                 # auth (OTP, session), me, onboarding : composants, hooks, services, stores
  lib/                      # infra : config, endpoints, auth (tokens, refresh), api-client, query-client
  shared/                   # types BFF, utilitaires partagés
  domain/                   # logique sans React (Lot 5), vide pour l'instant
  dev/                      # démos du catalogue
assets/brand, assets/topics # repris du lab par npm run assets:sync
```

Tout s'importe depuis `@/design-system`. Chaîne de données : **écran → hook React Query → service → `api`**
(`best-practices/.frontend/`). Navigation : `Stack.Protected` dans le layout racine bascule entre `(auth)`,
`(onboarding)` et `(app)` selon la session et `me.onboardingCompleted` ; aucun écran ne redirige lui-même.

Auth : surface native de `joutio-identity` (`/api/auth/mobile/request-login-code`, `login-with-code`, `logout`),
tokens dans SecureStore, refresh OIDC `/oauth2/token` partagé entre appels concurrents ; un échec transitoire ne
purge jamais la session, un refus définitif ou `403 accountSuspended` l'affiche en plein écran.

---

## 3. Commandes

```bash
npm install
npm run ios             # expo run:ios (dev build, simulateur ou appareil)
npm run android         # expo run:android
npm start               # Metro pour un dev build déjà installé
npm run typecheck       # tsc --noEmit
npm run doctor          # expo-doctor
npm run tokens:sync     # recopie design/tokens/tokens.native.ts (après « npm run tokens » dans design/)
npm run tokens:check    # échoue si la copie diffère du lab
npm run assets:sync     # reprend design/public : logo et carte en SVG, cadres/médailles/rubans en PNG
npm run format          # prettier (src, scripts)
```

Sans `.env.local`, l'app cible la **production** (`api.joutio.com`, `identity.joutio.com`) ; modèle dans
`.env.example`. Les `EXPO_PUBLIC_*` sont figées dans le bundle : relancer `npx expo start -c` après un changement.

`ios/` et `android/` sont générés (CNG) et ignorés par git : configurer dans `app.config.ts` et les plugins.

---

## 4. Règles

- **Aucune valeur de design en dur** : couleurs, typographie, espace, rayons et motion viennent des tokens
  générés (`useTheme()`, `tokens`). Les mesures propres à un composant (hauteur 48 du Button L, 52 de la barre)
  reprennent celles du lab.
- `color-mix(in oklab, …)` et les opacités Tailwind du lab passent par `mix()` et `alpha()` (`theme/color.ts`).
- **Typographie** : toujours `Text` (`variant` = token). Une face Geist par graisse (`fontFace`) : Android ne
  choisit pas la graisse d'une police personnalisée avec `fontWeight`.
- **Icônes** : importées une à une dans `design-system/icons.ts` (le paquet entier charge 3 000 modules).
  `regular` au repos, `fill` à l'actif. Une icône nouvelle s'ajoute à ce fichier.
- **Mouvement** : `animateTo()` (tokens `micro`, `base`, `exit`, `sheet` en ressort…) ; sous mouvement réduit la
  valeur saute à sa cible et `onComplete` est **toujours** appelé. Boucles : `loop()`, rien sous mouvement réduit.
- **Accessibilité** (kit § 6) : cible 44 pt (`hitSlop` via `slopFor`), focus pris et rendu par `useModalFocus`
  (Dialog, MobileSheet ; `returnFocusTo`), action nommée avec son contexte, état jamais porté par la seule
  couleur (Avatar annonce rang, présence, verrouillage).
- **Écrans toujours sombres** (duel, intros, déblocages, reconnexion) : `ForceDark`. Toasts suspendus avec
  `useToastSuppression()`.
- **Feuilles** : `MobileSheet` (TrueSheet), ajustée au contenu jusqu'à 80 % ou `tall` à 92 %. Une étape
  suivante s'empile dans une nouvelle feuille.
- **Défilement collé** : `StickyBar` + `stickyHeaderIndices` et `useStickyBar()` ; sous une barre compacte
  (`ParallaxScreen`), collage par Reanimated.
- **Listes** : toute liste non bornée finit par `FeedFooter` ; toucher l'onglet actif remonte en haut
  (`useScrollToTop`, émis par `JoTabBar`).
- **Glass** : flou natif sur iOS ; teinte seule sur Android (le flou y exige `BlurTargetView`).
- 1 composant = 1 fichier, export nommé, props en `interface`, jamais `any`. Jamais « Toi » comme nom de joueur.

---

## 5. Expo — ne pas se fier à sa mémoire

Expo change à chaque SDK. Avant de toucher une API Expo, EAS ou React Native : lire la version d'`expo` dans
`package.json`, puis la doc versionnée (`https://docs.expo.dev/versions/v58.0.0/`) ou
`https://docs.expo.dev/llms.txt`.

- `npx expo install <paquet>` plutôt que `npm install` (versions compatibles avec le SDK).
- Lancer `npm run typecheck` et `npm run doctor` avant de déclarer une tâche terminée.
- Une bibliothèque native ajoutée exige un nouveau dev build (`npm run ios|android`).
