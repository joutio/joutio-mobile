# AGENTS.md — joutio-mobile

App mobile de Joutio, **iOS et Android** (`com.joutio.app`), écrite à partir du lab
[`design/`](../../design/README.md) selon [`design/specs/mobile-kit.md`](../../design/specs/mobile-kit.md).
Le lab est la seule référence de rendu.

Lire : `../../AGENTS.md`, [`docs/frontend/`](../../docs/frontend/architecture.md), le contrat
[`docs/api/`](../../docs/api/README.md), la spec de l'écran (`design/specs/screens/`) et les écarts
de plateforme ([`design/specs/platforms/README.md`](../../design/specs/platforms/README.md)).

## Pile

Expo SDK 58, React Native 0.88 (New Architecture), expo-router, Reanimated 4, Gesture Handler 3,
TrueSheet, expo-image, Phosphor, Geist, Zustand, React Query, React Hook Form + Zod,
expo-secure-store, expo-notifications, `@joutio/client`. **Dev build** (`expo-dev-client`), jamais
Expo Go, pas de cible web.

**Expo change à chaque SDK** : avant de toucher une API Expo, EAS ou React Native, lire la version
d'`expo` dans `package.json`, puis la doc versionnée (`https://docs.expo.dev/versions/v58.0.0/`,
`https://docs.expo.dev/llms.txt`). Installer par `npx expo install`. Une bibliothèque native exige
un nouveau dev build.

## Structure

```
src/
  app/            routes expo-router (couche mince) : (auth), (onboarding), (app) [(tabs) + tâches ciblées], (dev), j|p|t/[id], join/[roomId]
  design-system/  traduction native du lab (sans import de app/ ni dev/) : tokens.generated.*, theme/, primitives/,
                  mobile/ (Screen, MobileTopBar, JoTabBar, MobileSheet, ToastHost…), brand/, result/, duel/, vendor/ (Reacticx)
  features/<f>/   components/ hooks/ lib/ index.ts
  lib/            config, endpoints, auth (jetons, refresh), api-client, query-client, i18n, realtime, ws
  shared/         navigation (router protégé), stores, hooks, avatar, utils
  dev/            démos du catalogue (admin seulement)
modules/          modules Expo locaux (bottom-load)   patches/  patch-package (réappliqués au postinstall)
```

- Tout s'importe depuis `@/design-system`.
- La navigation est protégée dans le layout racine : `Stack.Protected` bascule entre `(auth)`,
  `(onboarding)` et `(app)` selon la session et `me.onboardingCompleted`. Aucun écran ne
  redirige lui-même.
- L'étape « date de naissance » passe en premier si `MeView.birthDateRequired`.

## Règles

- **Textes** : aucun texte en dur. `useT()` / `t()` de `src/lib/i18n` (dictionnaire
  `@joutio/client/i18n`), appelés au moment de l'affichage (une liste de module devient une
  fonction).
  - Clés propres au mobile : `mobile.*` ; primitives : `ds.*`.
  - Langue de l'appareil avant connexion, puis `MeView.language`. Nombres et dates :
    `formatNumber`, `formatDate`.
  - Les tests node simulent `@/lib/i18n` (`tests/i18n-mock.cjs`).
- **Design** : aucune valeur en dur (`useTheme()`, `tokens`). `mix()` et `alpha()` remplacent
  `color-mix` et les opacités du lab.
  - Toujours `Text` avec une `variant`. Une face Geist par graisse : Android ignore `fontWeight`
    sur une police personnalisée.
  - Icônes importées une à une dans `design-system/icons.ts` : le paquet entier charge 3 000
    modules.
- **Hybride natif** : chrome et contrôles standards natifs, teintés par les jetons :
  - en-têtes `native-stack` (`nativeHeaderOptions`), `Switch`, `Segmented` (sauf `scrollable` ou
    lié à un pager) ;
  - feuilles TrueSheet natives ;
  - `Menu` et `Dialog` restent ceux du lab, identiques sur les deux OS. `Dialog` est rendu sur
    `TrueSheetOverlay`, donc utilisable depuis une feuille ;
  - `MobileTopBar` seulement sans en-tête natif : 52 pt sur iOS, 64 dp sur Android.
- **Mouvement** : `animateTo()` (jetons `micro`, `base`, `exit`, `sheet`). Sous mouvement réduit,
  la valeur saute à sa cible et `onComplete` est toujours appelé.
  - Animer `transform` et `opacity` par Reanimated, jamais un `setState` par frame, jamais
    `width`/`height` image par image.
  - Séquences du lab : `useTimeline` + `keyframe()`.
- **Accessibilité** : cible 44 pt (`slopFor`), focus géré par `useModalFocus`, action nommée
  avec son contexte, état jamais porté par la seule couleur.
- Écrans toujours sombres (duel, intros, déblocages) : `ForceDark`. Toasts suspendus pendant le
  duel (`useToastSuppression`).
- **Navigation** :
  - **Barre d'onglets** : `NativeTabs` sur iOS (`UITabBarController`), `JoTabBar` sur Android.
    `JoTabBar` ne se démonte jamais.
  - La barre reste sur toute la consultation (piles `(tabs)/*`) ; les **tâches ciblées** et le plein
    écran vivent dans `(app)` et la recouvrent : duel, matchmaking, salon, résultat, éditeurs,
    atelier, suppression de compte.
  - Tout contenu défilant finit par `useTabBarInset()` (déjà compté par `Screen`, `ParallaxScreen`,
    `CollapsibleTabsScreen`).
  - Toujours `router` de `@/shared/navigation/router`, jamais d'`expo-router` : il ignore un
    double appui vers la même destination en moins de 700 ms.
- **Écran poussé** :
  - il s'ouvre immédiatement ;
  - ce qui est déjà connu passe en paramètre ;
  - le contenu lourd attend la fin de l'entrée (`useTransitionDone`) ;
  - des squelettes tiennent la place.
- **Bande du haut** : choisie par le layout `(app)` (`TopBannerProvider`), rendue par chaque écran
  (`TopBannerFrame`). Zone sûre par `useScreenTopInset()`, jamais `insets.top` dans `(app)`.
- **Feuilles** (`MobileSheet`) :
  - hauteur au contenu jusqu'à 80 % (`tall` : 92 %) ;
  - actions dans le `footer`, collé en bas et au-dessus du clavier ;
  - une étape suivante ouvre une nouvelle feuille ;
  - une liste paginée en feuille garde le défilement comme **enfant direct**. Pas de liste
    virtualisée en feuille : FlashList y est mesurée à 0 de haut.
- **Listes** :
  - toute liste non bornée finit par `FeedFooter` ;
  - le chargement de la suite passe par `DragToLoadMore` (module natif `modules/bottom-load`) ;
  - un rail horizontal possède le geste dès le toucher ; ne jamais désactiver le pager par un état
    React en cours de geste ;
  - pager horizontal : `@expo/ui/community/pager-view`.
- **Pull-to-refresh** : `haptic('light')` **une seule fois**, après le verrou anti-doublon, par
  `useGuardedRefresh` (déjà intégré à `Screen`, `ParallaxScreen`, `CollapsibleTabsScreen`,
  `useRefreshActive`). Interdits : un verrou ou un `setRefreshing` maison. `DragToLoadMore` vibre
  aussi une fois par chargement accepté.
- **Clavier** :
  - `Screen` défile dans un `KeyboardAwareScrollView` ;
  - formulaires à plusieurs champs : `FieldToolbar` et `returnKeyType="next"` ;
  - le champ entier remonte au-dessus du clavier (`field-reveal`).
- **Mutations** : optimistes, sans relecture ([règle](../../docs/frontend/donnees-et-etat.md#mutations--optimistes-sans-relecture)).
  `optimisticUpdate`, `queryKeys` et les mises à jour de cache partagées (`applyFollow`) viennent de
  `@joutio/client/query`. Les événements d'un autre
  joueur relisent les vues concernées par une table unique
  (`features/realtime/realtime-invalidation.tsx`).
- **Temps réel** : STOMP unique (`lib/ws.ts`), coupé de force en arrière-plan. Pour le reste :
  [architecture](../../docs/frontend/architecture.md#temps-réel).
- **Avatars** : DiceBear, avec les options **du joueur affiché** (`userAvatar(user)`,
  `usePlayerAvatar(userId)`, `useMyAvatar()`). Badge Premium après chaque pseudonyme
  (`PlayerName`).
- Réglages de l'appareil (vibrations, sons, détails du duel) : `useDeviceSettings`. Une seule
  feuille Premium : `usePremiumSheet().show()`.
- Le catalogue des composants est accessible depuis Réglages › Dev, pour un **admin** connecté
  seulement (`EXPO_PUBLIC_CATALOG`).

## Configuration

- Sans `.env.local`, l'app cible la **production** (`api.joutio.com`, `identity.joutio.com`). Les
  `EXPO_PUBLIC_*` sont figées dans le bundle : `npx expo start -c` après un changement.
- `ios/` et `android/` sont générés (CNG) : configurer `app.config.ts` et les plugins.
- **Connexion sociale** : [`docs/social-login.md`](docs/social-login.md). **Push Expo** :
  [`docs/push-notifications.md`](docs/push-notifications.md).
- Liens universels `go.joutio.com` : `associatedDomains` et `intentFilters` dans `app.config.ts`.
- `@joutio/client` : `.npmrc` du projet et un jeton `read:packages` dans `~/.npmrc`
  (`make bootstrap`).

## Commandes

```bash
npm install
npm run ios | npm run android      # dev build (simulateur, émulateur ou appareil)
npm run android:dev                # Android signé joutio-preview (Google et Facebook actifs), voir README
npm start                          # Metro pour un dev build déjà installé
npm run typecheck && npm run doctor
npm run test:mutations test:refresh test:refresh-haptic test:push test:search-header test:api-client test:headers
npm run tokens:sync | tokens:check | assets:sync   # après « npm run tokens » dans design/
npm run format
```

Guide d'installation (macOS, Linux, émulateurs, appareil USB ou Wi-Fi) : [`README.md`](README.md).

## Release

- `.github/workflows/release.yml` à chaque push sur `main` (hors `*.md`) :
  1. typecheck et tests push ;
  2. semantic-release (action partagée, profil `npm`) ;
  3. `expo prebuild` ;
  4. APK release arm64 signé `joutio-preview` (secrets `ANDROID_KEYSTORE_*`), attaché à `vX.Y.Z`.
- `versionCode = 10 000 000 + major·10⁶ + minor·10³ + patch`. Ne jamais changer la version à la
  main.
- **Commits sans ligne de co-auteur** dans ce dépôt.

## Pièges

- `patches/react-native+0.88.1.patch` borne à 1 s l'inertie retenue par
  `ScrollView._isAnimating()` : sans lui, les touchers sont perdus après une inertie (iOS).
  Revérifier le hunk à chaque montée de React Native.
- Le patch de `react-native-collapsible-tabs-native` arbitre la direction du geste avant le
  refresh Android et le pager.
- `@react-native-menu/menu` est incompatible avec RN 0.88 : ne pas y revenir.
- Reanimated : `IOS/ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS` activés
  (`package.json > reanimated.staticFeatureFlags`, pris en compte au rebuild natif).
- `whatwg-fetch` sert seulement aux `FormData` de fichiers locaux (envoi d'images, avec
  progression) ; `expo/fetch` sert pour le JSON.
- Un module natif ajouté, un plugin ou `app.config.ts` modifiés : nouveau dev build
  (`npx expo prebuild --clean` si un plugin change). iOS se compile et se valide sur macOS.
