# AGENTS.md — joutio-mobile-expo

> Réécriture de l'app mobile Joutio **à partir d'une feuille blanche**, cibles **iOS et Android**.
> La seule référence de design est le lab **`design/`** (workspace) ; l'ancienne app `joutio-mobile`, à archiver,
> n'en est pas une. Le démarrage et la traduction lab → natif suivent **`design/specs/mobile-kit.md`**.
> Conventions de code : `best-practices/.frontend/`.

---

## 1. État

| Étape du kit                                                                                           | État                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
|--------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 0. Fondations : tokens, thème, polices, icônes, actifs, mouvement réduit                               | fait                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 1. Socle de composants (rangées 1 à 5)                                                                 | fait, à valider sur appareil                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2.1 Onboarding : lancement, connexion OTP, code, univers, notifications, premier thème, session coupée | fait                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2.2 Accueil                                                                                            | fait, à valider sur appareil : shell à 5 onglets (`(app)/(tabs)`, `JoTabBar`), `Rail`, `TopTen`, données `/api/home` ; série (`/activity`) et badge Défis (défis reçus) réels ; Social, Défis et Profil faits                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2.3 Sujets                                                                                             | fait, à valider sur appareil : recherche, Filtres (feuille), puces, tri, grille 2 colonnes paginée sur `/api/topics` ; multi-univers et « Masquer les sujets suivis » **simulés** (`features/topics/lib/topics-service.ts`, manques BFF dans `sujets.md` § 5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2.4 Fiche sujet                                                                                        | fait, à valider sur appareil : `CollapsibleTabsScreen` (actions qui passent dans la barre, titre à gauche, ligne du joueur en barre fixe), poussée dans les piles Accueil et Sujets (`(tabs)/home/topic/[id]`, `(tabs)/topics/[id]`) ; overview, Top 10 depuis toujours (2026-11-06), mes 10 dernières parties et titres branchés sur le BFF ; **Mur mocké** (`features/topic/lib/wall-mocks.ts`) ; feuille de duel **sans action** (lot 5) ; manques BFF dans `fiche-sujet.md` § 5                                                                                                                                                                                                                                             |
| 2.5 Lancer une partie, Matchmaking                                                                     | fait, à valider sur appareil : feuille des 4 modes (difficulté du robot mémorisée sur l'appareil, « Qui veux-tu défier ? » sur abonnements/abonnés), matchmaking plein écran (`MatchmakingMap`, décompte serveur, entraînement automatique selon `me.autoTrainOnTimeout`, préférence **profil**), salle (`(app)/room/[roomId]`, **un seul salon pour toute salle** depuis le 2026-11-07, à l'image de joutio-web : présence par joueur dans `RoomPlayers`, `PreparationSteps`, décompte, lien et QR code pour un salon partagé, relance « wizz » d'un défi nominatif, annulation par type, croix qui quitte sans fermer, retour bloqué une fois la préparation engagée, reprise de l'apparition), « Rejoindre un salon » (`join/[roomId]`, repris après connexion)                                                                                                                                                                                                                                                                                |
| 2.6 Duel                                                                                               | fait, à valider sur appareil : arène (`(app)/duel/[gameId]`) pilotée par les instants serveur (`sceneAt`, domaine porté de `joutio-web`), face-à-face, intros de manche, réponses à place réservée puis révélées comme le lab, transition de couleur au verdict, images préchargées dès `GAME_CREATED`, abandon par le retour (`usePreventRemove`), reconnexion (`ReconnectCountdown`), révélation finale gardée `RESULT_DELAY_MS` avant le résultat                                                                                                                                                                                                                                                                                                                 |
| 2.7 Résultat                                                                                           | fait, à valider sur appareil (2026-11-05) : composants `design-system/result/` (séquence de déblocages balayable dans le pager natif, promotion de rang, titre, badge — `BadgeUnlock`, au catalogue seulement tant que le badge n'est pas rattaché à la partie —, en-tête, Elo, anneau de maîtrise, revue, temps de réponse, revanche) ; écran `duel-result.tsx` (déblocages rang + titres déduits du bilan, résultat classé ou d'entraînement, Détails du duel, signalements joueur et question, chat **mocké**, Détails du duel en seconde page verticale `pagingEnabled`) ; revanche envoi (défi + `gameId`, réponse en STOMP) et réception (`RematchHost`, flux `/topic/notifications/{userId}`, salle calculée avec `nameUuid`). Résultat d'une partie passée : route `(app)/result/[gameId]` (bilan + historique REST, sans STOMP ni polling), ouverte depuis les `MatchRow` de la fiche sujet, **sans rejouer les déblocages** ; Elo et palier pris à l'instant de la partie. Reste : badges (le flux `/topic/achievements/{userId}` ne porte pas de `gameId`), validation de la séquence rang/titres sur un vrai duel humain, chat mocké (le BFF n'a pas de messagerie) |
| 2.8 Profil, Fiche joueur, Tous les titres, Toutes les parties, Tous les classements | fait, à valider sur appareil (2026-11-05) : **Profil** (`(tabs)/profile/`, `CollapsibleTabsScreen` sans retour, onglets Statistiques / Badges / Titres / Historique, feuilles Rangs et Badge, page **Sujets joués** par « Tout voir » — `(tabs)/profile/played`, parties et maîtrise par sujet, fiche sujet dans la pile Profil), **Récompenses**, **Série** (`/activity`, calendrier, palier d'assiduité), **Réglages** complets (champs du profil, bannière par `expo-image-picker` + `POST /api/media`, langue, apparence, duel, notifications, compte) et **Supprimer mon compte**, **Tous les titres**, **éditeur d'avatar** (DiceBear, `(app)/avatar`) et feuille **Premium** (état Bientôt) ; Toutes les parties, Tous les classements, Fiche joueur et Social déjà faits. Écarts consignés dans `profil.md` § 7, `reglages.md` § 6, `titres.md` § 9 : titres sans date de déblocage (BFF), Revanches / Rangs et badges locaux, liste d'attente Premium locale |
| 2.9 Défis | fait, à valider sur appareil (2026-11-05) : onglet `(tabs)/challenges` (puces, Reçus en aperçu puis paginés, Tout refuser, Envoyés, Salons privés, états vide et erreur, tiré pour rafraîchir), `ChallengeListRow`, `TopicPickerSheet`, `Dialog` Limite (quota BFF) ; temps réel par le flux personnel ; Relancer inactif (pas d'endpoint) — `defis.md` § 6 |
| 2.10 Notifications | fait, à valider sur appareil (2026-11-05) : `(tabs)/home/notifications` ouvert par les cloches, sections par jour, pagination 10, **sans CTA** (2026-11-07 : le toucher ouvre l’écran de l’action), balayer pour supprimer (`NotificationRow`, `ReanimatedSwipeable`), Tout marquer comme lu, Tout supprimer, temps réel par le flux personnel — `notifications.md` § 6 |
| 2.11 Création et modération | fait, à valider sur appareil (2026-11-06) : Réglages › **Mes sujets** (`(tabs)/profile/topics`, `GET /api/topics?mine=true`), feuille Nouveau sujet, **Mon sujet** (`ParallaxScreen`, nom FR/EN, univers, vignette par `POST /api/media`, Publier à 7 questions approuvées), **Questions** (recherche et filtres Statut/Traduction côté client, 10 par page), **éditeur de question** en modale (`(app)/question-editor`, `AnswerEditorRow`, FR/EN), **Modération** (À valider / Signalements balayables, `ModerationCard`, rejet motivé, clôture des signalements) ; **Équipe mockée** (`features/authoring/lib/team-mocks.ts`) ; plafonds Gratuit/Premium **appliqués par l'app** (feuille Premium avec accroche) ; description d'image saisie mais **non envoyée** ; statut Rejetée affiché et filtre Statut aussi en brouillon (toute question naît en attente) — `creation.md` § 5 |
| 2.12 États système | fait, à valider sur appareil (2026-11-06) : **Hors connexion et reconnexion** (`expo-network`, `useNetworkBridge` → `onlineManager` de React Query, état relu au premier plan ; **`ConnectionBanner` globale** (2026-11-07) dans le layout `(app)`, au-dessus de la barre du haut — la safe area haute est retirée aux écrans dessous —, réseau + STOMP, grâce 2,5 s, Réessayer avec tentative, échec et « Connexion rétablie », absente des parcours de jeu ; squelettes fixes) — module natif chargé sans planter : **nouveau dev build requis** pour l'activer ; **Adversaire absent / Partie expirée** (`DuelCancelled` sur `GAME_CANCELLED` `GAME_EXPIRED`, selon `firstRoundAt`) ; `AdSlot` au catalogue seulement (pas de régie ni d'alerte de suivi en V1) ; Compte suspendu, Session expirée et Reconnexion déjà faits — `etats-systeme.md` |

Le **catalogue** (`/catalog`, `joutio://catalog`) est réservé au dev (`__DEV__`) et absent des builds de release.

Onboarding, écarts assumés :

- **Google et Facebook** (2026-11-04) : SDK natifs `@react-native-google-signin/google-signin` et
  `react-native-fbsdk-next`, portés de `joutio-mobile` (son `AGENTS.md` § 4 : clients Google Cloud, App Meta,
  SHA-1 et key hash de la clé `joutio-preview`). Identifiants **publics** par défaut dans `src/lib/config.ts` et
  `app.config.ts` (plugins ajoutés seulement si la connexion est active) ; `EXPO_PUBLIC_*_SIGN_IN_ENABLED=false` les
  masque. Google → `login-with-google` (ID token, audience = client Web) ; Facebook → `login-with-facebook` (iOS :
  Limited Login, ID token + nonce ; Android : access token). Les secrets restent côté identity. Modules natifs : un
  nouveau dev build est nécessaire.
- « Découvrir le duel » termine l'onboarding comme « Explorer l'accueil » : le duel contre un bot arrive avec
  l'écran Duel.
- `GET /api/me/onboarding/recommendations` renvoie 3 sujets au plus (le lab en attend 3 par univers) : correction BFF
  relevée dans `design/specs/screens/onboarding.md` § 4.

Décisions :

- **Hybride natif** (2026-11-03, `design/PARITY.md` § 3) : chrome et contrôles standards natifs, teintés par les
  tokens ; composants de marque faits main d'après le lab.
    - En-têtes : `native-stack` via `nativeHeaderOptions(theme)` (+ `largeTitleOptions` sur une racine) ; `Screen`
      en mode `nativeHeader`. `MobileTopBar` ne sert plus qu'aux cas sans en-tête natif. Sa hauteur `TOP_BAR_HEIGHT`
      suit la plateforme (2026-11-06) : 52 pt sur iOS (lab), 64 dp sur Android (barre Material) ; toute barre faite main la
      reprend.
    - `Switch` système ; `Segmented` natif (SwiftUI / Material 3) sauf `scrollable` ou lié à un pager (`position` :
      l'indicateur suit le doigt, la barre défile avec et s'aimante) — barre d'onglets maison, à
      indicateur glissant) ; `Menu` Joutio identique sur iOS et Android (le `DropdownMenu` Compose de `@expo/ui` ne
      s'ouvrait pas sur Android), ancré, en ressort, placé dessus ou dessous ; `Dialog` **Joutio**
      (2026-11-04, remplace l'alerte système) : centré ou en feuille, tuile d'icône, `showDialog()` rendu par
      `DialogHost` (layout racine) ou `<Dialog open>` ; **même mouvement que `Menu`** (ressort 520/34, opacité ×1,6,
      échelle 0,86 → 1 depuis le centre ou le bord bas ; fermeture 140 ms) — les cascades de contenu et le flou ont été
      refusés le 2026-11-04 ;
      poignée native des feuilles.
    - Précision : filets `HAIRLINE`, `inputStyle` (pas d'interlignage sur un `TextInput`), Dynamic Type plafonné à
      ×1,6, ressort au relâchement, ripple Android sur les lignes.
    - Un `Button` non `full` dans une rangée prend `style={{ alignSelf: 'center' }}`.
- **Écrans à onglets** (Fiche sujet, Profil) : `CollapsibleTabsScreen`, sur
  `react-native-collapsible-tabs-native` (2026-11-04, remplace `react-native-collapsible-tab` qui saccadait sur
  Android en release) : le repli est **natif** (UIKit / ViewPager2), en-tête et liste bougent dans la même frame.
  Une liste virtualisée par onglet : `TabList`, `TabSectionList`, `TabScrollView` (obligatoires : elles décalent le
  contenu sous l'en-tête). Reanimated ne lit que les événements natifs (`onScrollOffsetChange`, `onPageScroll`, via
  `useEvent`) pour la parallaxe, le fondu du titre et l'indicateur ; la barre compacte est posée **par-dessus** le
  conteneur (`headerMinHeight` = sa hauteur) et ne fait que s'opacifier — ne jamais lui faire compenser une
  translation. Mouvement repris du Parallax Header de Reacticx (zoom ×2,5 au tiré, parallaxe à mi-vitesse) :
  `heroImageTransform`, `heroTitleOpacity`, `compactBarProgress` (`parallax-screen.tsx`), spec `fiche-sujet.md`
  § 1. Le correctif de typage RN 0.88 de la lib vit dans `patches/` (`patch-package`, en `postinstall`).
  `ParallaxScreen` reste pour les écrans à image sans onglets. **`TabsScrollView`** : même moteur sans image (Accueil :
  en-tête qui se replie, `Segmented` collé, pages balayables en `TabScrollView`/`TabList`).
- **Reanimated** : `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS` et `IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS` activés
  (`package.json` → `reanimated.staticFeatureFlags`, effet au rebuild natif) ; animer `transform`/`opacity`, jamais
  `width`/`height` à chaque frame (l'indicateur de `Segmented` étire son centre en `scaleX`).
- `@react-native-menu/menu` est incompatible avec RN 0.88 (`RCTBridge.h`) : ne pas y revenir.
- **Reacticx** (`npx reacticx add <nom> -d src/design-system/vendor/reacticx`) : composants copiés tels quels dans
  `src/design-system/vendor/` (hors Prettier, pour `reacticx diff`), enveloppés par un composant du design system
  aux tokens. `PremiumBadge` (`verified-shine`) à droite du pseudonyme des joueurs Premium ; typage de
  `@react-native-masked-view/masked-view` corrigé dans `patches/`.
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

### Android en local (Linux)

Pour itérer sans passer par l'APK de la CI : un dev build installé une fois, puis Metro en Fast Refresh.

- **Prérequis** : SDK dans `~/Android/Sdk` (command-line tools, `platform-tools`, `emulator`, `platforms;android-37.0`,
  `build-tools;37.0.0`, `ndk;27.1.12297006`, `cmake;3.22.1` — versions de
  `node_modules/react-native/gradle/libs.versions.toml`), un **JDK complet** avec `javac` (17, 21 ou 25 — vérifié
  avec le 25 ; un paquet `*-jre-headless` échoue sur les toolchains Gradle ; la CI prend Temurin 17). Dans le shell :
  `ANDROID_HOME=$HOME/Android/Sdk`, `JAVA_HOME` sur ce JDK, `PATH` +=
  `platform-tools`, `emulator`, `cmdline-tools/latest/bin` (le script les pose s'ils manquent).
- **Émulateur** : AVD `joutio-pixel` (Pixel 8, `system-images;android-36;google_apis_playstore;x86_64` — Play
  Services pour Google Sign-In, KVM) : `emulator -avd joutio-pixel`.
- **Téléphone** : débogage USB activé ; règles udev via `sudo apt install android-sdk-platform-tools-common` (groupe
  `plugdev`). En Wi-Fi : « Débogage sans fil » → `adb pair IP:PORT` puis `adb connect IP:PORT`. Metro passe par
  `adb reverse` : aucune IP LAN à configurer.
- **`npm run android:dev`** (`scripts/android-dev.sh`, arguments transmis à `expo run:android`, ex. `--device`) :
  charge `~/Homeware/joutio-secrets/android-keystore.env` (surchargeable par `JOUTIO_ANDROID_KEYSTORE_ENV`) et signe
  le build **debug** avec la clé **joutio-preview** (`plugins/withAndroidReleaseSigning.js`) : mêmes SHA-1 / key hash
  que la release, donc Google et Facebook fonctionnent, et le dev build remplace l'APK de la CI sans désinstaller.
  Sans le fichier, signature debug standard (OTP seulement). Un `android/` généré sans la clé est regénéré.
- Ensuite `npm start` suffit tant qu'aucun module natif, plugin ou `app.config.ts` ne change ; sinon relancer
  `npm run android:dev` (après `npx expo prebuild --platform android --clean` si un plugin a changé).

**Release (GitHub Actions)** : dépôt public `joutio/joutio-mobile-expo`, workflow `.github/workflows/release.yml`,
calqué sur les services : chaque push sur `main` (hors `*.md`) passe le typecheck puis **semantic-release**
(action partagée `joutio-reusable-workflows/actions/semantic-release`, profil `npm`). Les **commits conventionnels**
fixent la version : `feat` → mineure, `fix`/`perf` → correctif, `!` ou `BREAKING CHANGE` → majeure ; `docs`, `chore`,
`style`, `ci`, `test` ne publient rien. Une version publiée met à jour `package.json`, `package-lock.json` et
`CHANGELOG.md` (commit `chore(release): X.Y.Z [skip ci]`), crée le tag `vX.Y.Z` et la release GitHub, puis y joint
l'APK release arm64 (API de production, clé `joutio-preview` : secrets `ANDROID_KEYSTORE_*`, plugin
`plugins/withAndroidReleaseSigning.js`), nommée `joutio-X.Y.Z.apk`. **Ne jamais changer la version à la main.**
Jeton : `JOUTIO_GITHUB_TOKEN` s'il existe, sinon le `GITHUB_TOKEN` du workflow (`main` non protégée). Le `versionCode`
vaut 10 000 000 + `major * 1e6 + minor * 1e3 + patch` (`app.config.ts`), au-dessus de joutio-mobile (1.1.2) : l'APK
s'installe par-dessus. Le catalogue est la première page tant que `EXPO_PUBLIC_CATALOG` n'est pas `false`. Commits
sans ligne de co-auteur.

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
- **Feuilles** : `MobileSheet` (TrueSheet), ajustée au contenu jusqu'à 80 % ou `tall` à 92 %. Les actions (`footer`)
  sont **collées en bas** dans leur propre zone (pied `absolute` depuis le 2026-11-06 : il remonte au-dessus du clavier,
  le défilement réserve sa hauteur), comme l'en-tête : le contenu défile entre les deux,
  jamais sous le bouton ; le conteneur natif du pied porte le fond `surface` (`footerStyle`), safe area basse Android comprise (2026-11-07). Android : `dismissThreshold="short"`. Une étape
  suivante s'empile dans une nouvelle feuille. Recherche d'une liste en feuille : `stickyHeader` (collée en haut).
  **Pages verticales fixes** (2026-11-05, résultat → Détails du duel) : `ScrollView` natif, hauteur de page mesurée
  par `onLayout`, pas de feuille persistante ; bascule décidée au relâcher avec une légère résistance (2026-11-07 : un
  huitième de page tiré, ou un lancer passé 3 %, vitesse ramenée en pt sur Android), sinon retour ; affordance miroir en
  haut de la page 2. Pager **horizontal** : `@expo/ui/community/pager-view`
  (natif, SwiftUI / Compose), jamais un `ScrollView` piloté par `contentOffset`.
- **Clavier** (2026-11-07) : `Screen` défile dans un `KeyboardAwareScrollView` (keyboard-controller, `bottomOffset` 24,
  `keyboardShouldPersistTaps="handled"`) sauf en-tête natif ou liste paginée ; feuilles : `keyboardScrollOffset` et pied
  qui remonte avec `keyboardOffset` ; chat : `KeyboardAvoidingView` de keyboard-controller ; Android
  `softwareKeyboardLayoutMode: 'resize'` (**nouveau dev build**).
- **Défilement collé** : `StickyBar` + `stickyHeaderIndices` et `useStickyBar()` ; sous une barre compacte
  (`ParallaxScreen`), collage par Reanimated.
- **Rails horizontaux** (2026-11-05) : sur un écran à onglets, un rail (`Rail`, puces) **possède le geste horizontal
  dès le toucher** — le pager natif et le refresh lui cèdent la main, y compris sur un swipe incliné ou en bout de
  liste (patch `react-native-collapsible-tabs-native` : direction opposée essayée avant le pager). `DragToLoadMore`
  lit le même contexte (`useHorizontalGesture`) et échoue immédiatement s'il voit un rail propriétaire. Ne pas
  revenir à un `swipeEnabled` piloté par un état React : un changement de prop en cours de geste peut figer le
  pager à mi-page.
- **Listes** : toute liste non bornée finit par `FeedFooter` et se pose dans `DragToLoadMore` (traction en bas de
  liste, ressort Reanimated + geste Gesture Handler, loader Lottie `assets/lottie/load-more.json` scrubbé puis en
  boucle ; `contenu.md` § Listes paginées). Son défilement est `LoadMoreScrollView` (`renderScrollComponent` d'une
  **FlashList**, préférée pour les longues listes) ou `TabLoadMoreScrollView` dans un écran à onglets ; un
  `RefreshControl` s'importe alors de `react-native-gesture-handler`. Loader natif par OS (`LoadMoreIndicator`). Le `RefreshControl` de Gesture Handler exige un `ScrollView` Gesture Handler : avec `LoadMoreScrollView`, prendre celui de React Native (sinon « VirtualGestureDetector must be a descendant of an InterceptingGestureDetector »). **Même geste partout** (2026-11-07) : `Screen` (`loadMore`, `onRefresh`), `MobileSheet` (`loadMore`, grandes feuilles) et les listes paginées côté client (`useClientPages`/`clientSource`, `shared/utils/paging.ts` ; `pagedQuery`, `feedFooterProps`, `loadMoreOptions` pour une `useInfiniteQuery`). En fin de requête, la liste se referme **sur les nouveaux éléments** (compensation du défilement dans la même frame, puis dévoilement d'une demi-hauteur) ; un seul loader ; `FeedFooter` exige `pages` et n'annonce la fin qu'après une page tirée en plus.
  Revenir en haut : onglet actif (`useScrollToTop`, émis par `JoTabBar`), barre d'état iOS (`scrollsToTop={false}`
  sur tout défilement horizontal ; pages cachées via `withActivePageScrollsToTop`) et `ScrollToTopPill` (intégrée à
  `TabsScrollView`, posée à la main sur une liste longue).
- **Temps réel** (2026-11-05) : une connexion STOMP unique (`lib/ws.ts`, heartbeat 10 s, jeton renouvelé avant
  chaque `CONNECT`, fermée en arrière-plan). Chaque agrégat (salle, ticket, partie) est un `NotificationStream`
  (`lib/realtime/`) : **historique REST à l'ouverture, puis uniquement STOMP** ; l'historique n'est rejoué qu'à la
  reconnexion ou sur un trou de séquence, jamais en polling. Heartbeat manqué ou socket fermé →
  `useConnectionStore().status === 'reconnecting'` → `ReconnectCountdown` plein écran, reprise seule. L'horloge serveur
  (`useServerClock`) est mesurée à l'ouverture et au premier plan, puis ré-ancrée sur chaque trame. Seule exception :
  la récompense d'une partie terminée (`GET /api/games/{id}/result`) est relue toutes les 1,5 s tant qu'elle est
  absente (aucun canal STOMP ne la porte).
- **Séquences d'animation** du lab (`@keyframes`) : `useTimeline` + `keyframe()` (`design-system/timeline.ts`), une
  progression linéaire démarrable en plein milieu (`elapsedMs`, le serveur peut être en avance).
- **Ouverture d'un écran** (2026-11-05) : un écran poussé s'ouvre **tout de suite**, sans jamais attendre une requête
  ni conditionner la navigation à une réponse. Ce qui est connu passe par les paramètres de navigation (titre, image) ;
  le contenu lourd attend la fin de l'animation d'entrée (`useTransitionDone`, déjà intégré à `CollapsibleTabsScreen`
  et `ParallaxScreen`) ; les données arrivent dans la page, des squelettes à leur place. Une mutation met à jour le
  cache sur place plutôt que d'invalider des listes entières (sinon le retour sur l'écran précédent attend un
  rechargement).
- **Avatars** (2026-11-05, généralisés le 2026-11-06) : DiceBear (`shared/utils/avatar.ts`, options compactes partagées
  avec le web, graine = `userId`) rendu en SVG ; `Avatar` accepte un SVG en ligne dans `src`. **Toujours les options du
  joueur affiché** : `userAvatar(user)` sur toute vue qui porte `avatarOptions` (`UserRefView`, `LeaderboardEntryView`,
  `PlayerCardView`…), `usePlayerAvatar(userId)` quand seul l'identifiant est connu (duel, revanche : profil lu une
  fois, en cache), `useMyAvatar()` pour le joueur connecté. Initiales seulement pour un bot ou une donnée mockée.
- **Réglages de l'appareil** : `useDeviceSettings` (design system, AsyncStorage) — vibrations (lues par `haptic()`),
  sons, détails des réponses du duel, catégories de notification sans équivalent BFF.
- **Premium** : une seule feuille (`PremiumHost`), ouverte par `usePremiumSheet().show()`.
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
