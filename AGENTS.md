# AGENTS.md — joutio-mobile

> **Surface BFF `/api/**`** sur tout le parcours joueur (`services/joutio-bff/AGENTS.md` § 3).
> Temps réel : STOMP (`src/lib/ws.ts`, `useTopic`) sur parties, salles, appariement et inbox ; le REST
> reste le filet de rattrapage. Le push reste à faire.
> Livrés : APK prod sur `main` (§ 3), auth native OTP, Google Android et Facebook (§ 4).

> Interface **mobile React Native (Expo)** de Joutio — **UI v4 marque Joutio**,
> mobile-only. Référence : `design/` + `design/tokens.json`. Geist/Geist Mono, ambre,
> surfaces plates, chrome custom (tab bar/nav bar) avec **barres système réelles**.
> La logique auth/BFF est conservée. Conventions : `best-practices/.frontend/` +
> `FIDELITY.md`.

> **Décisions du 30/10/2026** : Android d'abord ; Premium « bientôt » (aucun IAP, pub
> ou ATT) ; chat post-duel, blocage joueur et mur de sujet en **V1.1** ; pas de retour
> à HeroUI/Uniwind/Tailwind. Le lot 0 a basculé les jetons, Geist, les icônes et les
> composants `src/ui/` ; le lot 2 a livré la navigation cible (tab bar et barres de titre
> custom, onglet Défis, cloche et inbox). Les §§ 6-7 décrivent l'historique v2/v3.
> **Décision du 31/10/2026** : `NativeTabs`, encore en place, est remplacée par la barre custom
> `JoTabBar` (`FIDELITY.md`).

---

## 1. Rôle

Application mobile Joutio. **UI v4 = chrome Joutio + 5 onglets** :

- Auth **native** : OTP email (`/api/auth/mobile/**`) + Google natif Android + **Facebook
  natif** Android/iOS. Aucun navigateur, aucune WebView, aucun cookie.
- Onglets : **Accueil**, **Sujets**, **Social**, **Défis**, **Profil** ; notifications via la
  **cloche** de la barre de titre (route `(app)/notifications`).
- « Jouer » est **contextuel** (Accueil / Fiche sujet), pas un onglet.
- Écrans : Accueil, Sujets, Fiche sujet, Profil, Réglages, Défis, Notifications ; Social
  reste en état « Bientôt » jusqu'à M3.
- Duel v2.1 livré : Salle, Arène, Résultat, Matchmaking.
- UI v3 livrée : coque native, écrans principaux, duel ; validation Expo Go à faire.
- À venir : Social complet (M3) ; progression (M4) ; STOMP/push (M5).

Hors périmètre : création de sujets/questions, mur de thème/chat.

---

## 2. Stack & structure

- Expo SDK 58, React Native 0.88, expo-router, React Query, Zustand,
  Zod + React Hook Form,
  `@react-native-google-signin/google-signin`, `react-native-fbsdk-next`, `expo-secure-store`,
  `expo-symbols`, `react-native-svg`, `react-native-keyboard-controller`.
- **Carte de recherche** : `matchmaking-map.tsx`, Skia pour la carte, épingles et carte pilotées par le même
  décalage ; valeurs reprises de `design/matchmaking-map.html`.
- **Navigation** : une pile par onglet via les routes partagées `(tabs)/(home,topics,social,challenges,profile)/`,
  liens internes relatifs (`/topic/{id}`, le groupe courant est conservé). Le flux de duel vit au-dessus des
  onglets : on en sort par `leaveDuelFlow`, on y enchaîne par `replace`, jamais de `push` depuis le duel.
- **Feuilles** : `JoSheet` sur `Modal` React Native. La feuille `@expo/ui`, même avec `RNHostView`,
  ne recevait aucune touche dans Expo Go (SDK 58) : ne pas y revenir sans test sur appareil.
- **Fond et transitions** : `ThemeProvider` et `SystemUI.setBackgroundColorAsync` à la racine, sinon
  la navigation montre son fond clair derrière chaque transition. Chargements via `JoLoading`.
- **Clavier** : `KeyboardProvider` à la racine, avec `statusBarTranslucent`,
  `navigationBarTranslucent` et `preserveEdgeToEdge` (sans eux, marges blanches à la place des
  barres système sur Android), et `KeyboardAwareScrollView` (`bottomOffset`)
  sur tout formulaire, standard Expo. Android est edge-to-edge : `KeyboardAvoidingView` sans
  `behavior` et `softwareKeyboardLayoutMode` ne remontent pas le contenu. Validé dans
  **Expo Go**, malgré la doc Expo qui l'annonce absent.
- **UI** : `NativeTabs` personnalisée, feuilles `JoSheet`, animations Reanimated
  CSS (`src/ui/motion.ts`), stacks natifs avec `JoNavBar` passé en `header`, composants RN de contenu (`View`, `Text`, `Pressable`, `TextInput`, `Switch`,
  `FlatList`, `Modal`). Aucun composant UI web.
- **Thème** : **Geist / Geist Mono** via `@expo-google-fonts/geist`, jetons
  `src/ui/tokens.ts` (source `design/tokens.json`) + `src/ui/theme.ts`, clair/sombre.
  Ambre `#E8B04A`, surfaces plates, filets 1 px. Pas de HeroUI, Uniwind ni Tailwind.
  Icônes : Phosphor (`phosphor-react-native`) pour le chrome, `expo-symbols` (SF/Material)
  dans les écrans pas encore portés.
- **Web** : debug uniquement ; la cible est **Android/iOS**.

```
app/                       # expo-router (couche mince)
  _layout.tsx  index.tsx
  (auth)/{_layout,login}.tsx
  (app)/{_layout,index,notifications,settings}.tsx
  (app)/(tabs)/{home,topics,social,challenges,profile}/
  (app)/topic/[id].tsx
src/
  features/{auth,home,topics,topic,profile,social,challenges,notifications,duel}/
  shared/{components,hooks,types,utils}/
  lib/{api-client,api,endpoints,auth,services,toast,query-client}/
```

Chaîne : **écran → hook React Query → service → API client**. La couche données (BFF,
folds, polling) est partagée avec les lots suivants ; seuls les écrans changent.

---

## 3. Commandes

```bash
npm install
npm start          # Expo Dev Server (Expo Go : OTP uniquement)
npm run android    # build natif de dev (Google requis) — expo run:android
npm run ios        # idem iOS (Google à configurer plus tard)
npm run web        # debug web ponctuel (fallback JS, pas la cible produit)
npm run typecheck  # tsc --noEmit
npm run doctor     # expo-doctor
```

Le `.env` local cible la **production** ; la stack locale se surcharge dans `.env.local`, avec
l'IP LAN de la machine sur appareil physique. Après tout changement, relancer
`npx expo start -c` : les `EXPO_PUBLIC_*` sont figées dans le bundle.

> **Règle secrets** : `.env` n'est **jamais versionné** ; `.env.example` est le modèle à copier
> (`cp .env.example .env`). Le hook `.githooks/pre-commit` refuse `.env*` (sauf `.env.example`),
> `*.p12`, `*.jks`, `*.keystore`, `*.pem` et `*.key` ; l'activer une fois par clone avec
> `git config core.hooksPath .githooks`. Aucune valeur secrète ne doit être commitée.

Variables (`.env`) : `EXPO_PUBLIC_API_URL` (BFF), `EXPO_PUBLIC_OIDC_AUTHORITY`
(base identity locale, **injectée aussi par la CI en release**),
`EXPO_PUBLIC_IDENTITY_URL` (override explicite facultatif — **ne jamais mettre une URL
localhost dans le `.env` principal**, elle serait embarquée dans l'APK), `EXPO_PUBLIC_OIDC_CLIENT_ID`,
`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (client OAuth2 Web Google, audience des ID tokens),
`EXPO_PUBLIC_GOOGLE_SIGN_IN_ENABLED` (`false` masque Google sans retirer l'ID client),
`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` (iOS ; les deux
sont requis ensemble),
`EXPO_PUBLIC_FACEBOOK_APP_ID` (App ID Meta public), `EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN`
(Client Token public du SDK), `EXPO_PUBLIC_FACEBOOK_SIGN_IN_ENABLED` (`false` masque Facebook).
Le client Google n'a **aucun fallback en dur** : vide ⇒ bouton Google masqué.

**CI** : `.github/workflows/ci.yml` → workflow réutilisable
`joutio-reusable-workflows/.github/workflows/mobile-ci.yml@main` (commitlint, `npm ci
--legacy-peer-deps`, `npm run typecheck`, `expo-doctor`).

**Release** : `.github/workflows/release.yml` → workflow réutilisable `mobile-release.yml@main`.
Sur chaque push `main` (hors `.github/workflows/**` et `**.md`) :
1. **semantic-release** (profil `npm` partagé) — bump `package.json`/`package-lock.json`,
   `CHANGELOG.md`, commit `chore(release): X [skip ci]`, tag `vX.Y.Z`, release GitHub ;
2. **APK Android prod** — `expo prebuild` + `gradlew assembleRelease` (arm64), publiée en
   pre-release `apk-<run_id>` ; si une version a été créée, l'APK est aussi attachée à la
   release `vX.Y.Z`. Le module Google est autolinké ; le plugin iOS correspondant n'est ajouté
   que si `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` est défini. Le client OAuth Web Google est passé
   explicitement au workflow (`google-web-client-id`) et injecté dans
   `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` pour `expo prebuild` puis Gradle. L'input
   `oidc-authority` alimente **à la fois** `EXPO_PUBLIC_IDENTITY_URL` et
   `EXPO_PUBLIC_OIDC_AUTHORITY` (les deux étapes prebuild/Gradle) : l'APK ne doit jamais
   embarquer un `localhost`. Facebook est passé via `facebook-app-id` et
   `facebook-client-token` (variable de dépôt `JOUTIO_FACEBOOK_CLIENT_TOKEN`) : vide ⇒ bouton
   masqué et plugin natif non ajouté.
   **Ordre de déploiement** : pousser `joutio-reusable-workflows` (qui déclare l'input) **avant**
   un push `joutio-mobile` déclenchant la release, sinon l'appel du workflow rejette l'input.

La version applicative est celle de `package.json` (lue par `app.config.js`) ; le `versionCode`
Android est dérivé de la version sémantique (`major * 1e6 + minor * 1e3 + patch`) pour rester
strictement croissant, et le numéro de run CI est affiché dans le badge de build. L'APK pointe sur la prod
(`https://api.joutio.com`, `https://identity.joutio.com`), package
`com.joutio.app`.

Secrets GitHub requis : `JOUTIO_GITHUB_TOKEN` (semantic-release + upload de l'APK) et
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD`. Variable de dépôt (publique) : `JOUTIO_FACEBOOK_CLIENT_TOKEN`.
Le keystore local vit hors dépôt dans
`~/Homeware/joutio-secrets/joutio-preview.p12` : **le sauvegarder** (les secrets GitHub sont en
écriture seule) — sans lui, les APK déjà installées ne peuvent plus être mises à jour.
`com.joutio.app` est un identifiant temporaire : il est **définitif côté store** ; changer de
domaine plus tard implique une nouvelle application (désinstallation/réinstallation en interne).

---

## 4. Authentification native (point sensible)

**Aucun navigateur, aucune WebView, aucun cookie.** L'écran de login est porté par l'app
(`features/auth/login-screen.tsx`) et identity émet directement les tokens via une surface
dédiée, préfixée par client :

1. `POST /api/auth/mobile/request-login-code` `{email}` → `202` (anti-énumération).
2. `POST /api/auth/mobile/login-with-code` `{email, code}` → `{userId, email, accessToken,
   refreshToken, tokenType, expiresIn}`.
   Ou `POST /api/auth/mobile/login-with-google` `{idToken}` (SDK Google natif Android).
   Ou `POST /api/auth/mobile/login-with-facebook` `{accessToken}` (Android, login classique)
   / `{idToken, nonce}` (iOS, Limited Login).
3. Tokens stockés dans **SecureStore** (`lib/auth.ts`) ; refresh sur `401` via le endpoint
   OIDC standard `POST /oauth2/token` (`grant_type=refresh_token&client_id=mobile`),
   single-flight et rotation du refresh token.
   - Un échec **transitoire** (réseau, 5xx, 429) ne purge **jamais** la session : le prochain
     appel réessaie. Seuls un refus définitif (`invalid_grant`, 400/401/403) la termine
     (`SessionRefreshError.definitive`).
   - Garde anti-course : un refresh en vol ne réécrit pas les tokens après un logout.
4. Logout : `POST /api/auth/mobile/logout` `{refreshToken}` → `204`, puis purge locale,
   `GoogleSignin.signOut()` et `LoginManager.logOut()` (Facebook) best-effort, purge du cache
   React Query.
5. Session restaurée au démarrage par `SessionRuntime` (layout racine) : les deep links vers
   `(app)` passent par la garde même sans passer par `app/index.tsx`. Les groupes `(auth)` et
   `(app)` redirigent selon `authenticated` ; après login, la destination est **`/(app)`
   (Accueil)**, sauf deep link `join/{roomId}` en attente, qui reprend la salle.
   Les fins de session `expired|suspended|unknownUser` (refresh définitif, `401`
   `unknownUser`, `403 accountSuspended`) sont affichées en bandeau sur le login ; le cache
   React Query est purgé pour ne jamais exposer les données du compte précédent.

Les access tokens sont les **mêmes JWT** que le flux web (mêmes claims `sub`, `user_id`,
`email`, `roles`, même audience) : le BFF ne change pas. Aucun ID token n'est émis pour le
mobile ; les scopes natifs sont `profile email`.

### Google (Android + iOS) — configuration Cloud

`@react-native-google-signin/google-signin` (module natif, **pas Expo Go**) utilise le client
OAuth2 **Web** comme `webClientId` (audience des ID tokens) ; le client **Android** n'est
jamais référencé dans le code, Google le résout par **package + SHA-1**. Sur iOS, le client
iOS et son URL scheme inversé sont passés via `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` et
`EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` (le plugin natif n'est ajouté que si le scheme est défini).

**État actuel** : clients créés dans le projet Google Cloud **`13717769562`** (Web, Android
release et iOS). Le bouton Google reste masqué si `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` est vide.

1. **Google Auth Platform → Branding / Audience / Data Access** : app `Joutio`, audience
   `External` (ou `Internal`), scopes `openid`,
   `https://www.googleapis.com/auth/userinfo.email`,
   `https://www.googleapis.com/auth/userinfo.profile`.
   En mode **Testing**, ajouter le compte Google du téléphone dans **Test users**.
2. **Clients** (tous dans le projet `13717769562`) :
   - **Web** : `13717769562-f0lmfij51imcthmn3rudsijjh6r4bll7.apps.googleusercontent.com`
     — audience des ID tokens (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`).
   - **Android release** : `13717769562-jjgajgpm6rp91d9nio1fkqct81ag2ff8.apps.googleusercontent.com`
     — package `com.joutio.app`, SHA-1 release
     `30:25:90:CA:CB:83:7B:CB:5C:FC:C0:0B:5A:5F:74:24:68:05:D2:49`.
   - **iOS** : `13717769562-pi67m17nqa3bv9p3h01kk43d5h27i5j5.apps.googleusercontent.com`
     — bundle `com.joutio.app`, URL scheme inversé
     `com.googleusercontent.apps.13717769562-pi67m17nqa3bv9p3h01kk43d5h27i5j5`
     (`EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME`).
   Ne pas créer ces clients dans un autre projet : l'ID token doit garder l'audience du client
   Web existant. Aucun `google-services.json` ni secret n'est nécessaire.
3. Attendre la propagation (5 min à quelques heures), désinstaller/réinstaller l'APK.
4. Pour un build debug local, ajouter l'empreinte du debug keystore :
   `keytool -exportcert -rfc -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android | openssl x509 -noout -fingerprint -sha1`.
   Pour une distribution Play, ajouter l'empreinte **Play App Signing**.
5. Diagnostic : `npx @react-native-google-signin/config-doctor`, `apksigner verify --print-certs`
   sur l'APK, `adb logcat | grep -iE 'GoogleSignIn|DEVELOPER_ERROR'`. Un `DEVELOPER_ERROR`
   signifie package/SHA-1/projet incohérent ; l'app le traduit par un message actionnable.

L'OTP fonctionne aussi dans Expo Go ; Google nécessite un build natif/APK
(`npx expo run:android` ou l'APK de release). iOS nécessite `npx expo prebuild --clean
--platform ios` puis `npx expo run:ios`.

### Facebook natif (Android + iOS Limited Login)

Le SDK `react-native-fbsdk-next` est **natif** (pas Expo Go, pas web). Le bouton n'apparaît
que si `EXPO_PUBLIC_FACEBOOK_APP_ID` **et** `EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN` sont fournis au
build ; sinon il est masqué et le plugin natif n'est **pas** ajouté (`app.config.js`).

- **Android** : login classique → access token Graph ; identity le vérifie via
  `/debug_token` (App ID + App Secret + `appsecret_proof`) puis `/me` (email).
- **iOS** : Limited Login → ID token OIDC + nonce ; identity vérifie signature, issuer,
  audience, expiration et nonce via le JWKS Facebook.
- Les deux flux retournent la **même session mobile** que l'OTP/Google (access + refresh).

**Configuration Meta** (App ID `2122240041993058`) :

1. Plateforme **Android** : package `com.joutio.app`, key hash release
   `MCWQysuDe8tc/MALWl90JGgF0kk=` (SHA-1 release
   `30:25:90:CA:CB:83:7B:CB:5C:FC:C0:0B:5A:5F:74:24:68:05:D2:49`), key hash debug
   (commande ci-dessous). En mode **Development**, ajouter le compte Facebook du téléphone
   dans **Test users** (ou passer l'app en Live).
2. Plateforme **iOS** : bundle `com.joutio.app`, Limited Login activé.
3. Key hash debug :
   ```bash
   keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore \
     -storepass android | openssl sha1 -binary | base64
   ```
   Un `Invalid key hash` dans le log Facebook signifie que le package/la key hash manque.

**Configuration mobile** :

- `.env` : `EXPO_PUBLIC_FACEBOOK_APP_ID=2122240041993058`,
  `EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN=<Client Token public>` (à rotationner),
  `EXPO_PUBLIC_FACEBOOK_SIGN_IN_ENABLED=true`.
- GitHub : variable de dépôt `JOUTIO_FACEBOOK_CLIENT_TOKEN` (à configurer, consommée par
  `.github/workflows/release.yml`). **Vide = APK sans Facebook** (bouton masqué, plugin absent).
- Après changement : `npx expo prebuild --clean` puis build natif
  (`npx expo run:android` ou APK). Le plugin ajoute `facebook_app_id`,
  `facebook_client_token`, `fb_login_protocol_scheme`, `FacebookActivity` et
  `CustomTabActivity`.
- **Identity** : `JOUTIO_OAUTH2_FACEBOOK_SECRET` (App Secret) reste côté serveur — local
  `.env`, prod secret scellé `joutio-identity-facebook`. **Ne jamais** l'embarquer dans l'APK.

Erreurs identity : `401 urn:joutio:auth:invalidFacebookToken` (token invalide/expiré),
`422 urn:joutio:auth:facebookEmailMissing` (email absent), `503 urn:joutio:auth:facebookUnavailable`
(Facebook/identity indisponible). L'app retombe sur l'OTP/Google.

iOS : client et URL scheme déjà créés (projet `13717769562`) ; renseigner
`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME`, puis
`npx expo prebuild --clean --platform ios`.

---

## 5. Mapping backend

La cible est la **surface BFF `/api/**`** (voir `services/joutio-bff/AGENTS.md` § 3) ; l'ancienne
gateway et ses préfixes `/theme-service`, `/social-service`, `/game-service`,
`/matchmaking-service` ont disparu. La migration écran par écran est en cours ; les services
encore présents dans `src/lib/services` (ou isolés dans `src/lib/services/legacy`) ciblent
l'ancienne surface et ne doivent pas servir de référence.

**Incréments BFF branchés** : `GET /api/me` (`app/spike.tsx`), `GET /api/home` (**Accueil**),
**Profil/Réglages** (`/api/me` + `PUT /api/profiles/{id}/pseudonym|bio|country|language`),
**Sujets** (`GET /api/topics`, `/api/topics/facets`) et **Fiche sujet**
(`GET /api/topics/{id}/overview`, `/leaderboard`, `PUT|DELETE /follow`,
`GET /api/profiles/{id}/games?topicId=`), **Défis** (`GET /api/challenges/mine`,
`/api/rooms/mine`, `POST /api/challenges/{id}/accept|decline|cancel`) et **Notifications**
(`GET /api/notifications`, `/unread-count`, `POST /{id}/read`, `/read-all`,
`GET /api/profiles/{id}` pour le pseudonyme). Défis et cloche sont sondés (15 s, 30 s) en
attendant STOMP (M5). Social et fiche joueur : `GET /api/profiles/{id}`, `/following`, `/followers`,
`/head-to-head`, `PUT|DELETE /follow`.

**Auth** : surface native `joutio-identity` `/api/auth/mobile/**` (voir § 4) + refresh OIDC
standard `/oauth2/token`. Les endpoints web `/api/auth/web/**` ne sont pas consommés par le
mobile.

---

## 6. Conventions UI v3 (native)

- **Coque native** : `NativeTabs` + un Stack par onglet. Les écrans poussés (fiche sujet,
  réglages, salle, arène, résultat, matchmaking) sortent du groupe d'onglets.
- **Pas de composants UI web** : aucun import HeroUI, Uniwind, NativeWind, shadcn ou CSS web.
- **Composants RN adaptatifs** : boutons, cartes, listes, formulaires et segments dans
  `src/ui/` avec variantes iOS/Android ; icônes `expo-symbols` (SF/Material).
- **Headers** : natifs. Large title iOS, app bar Material Android, back gesture natif.
  La fiche sujet utilise un header silver translucide natif.
- **Composants spécifiques seulement sans équivalent système** : timer SVG, barre de
  progression, stepper de salle, carte sujet. Ils reçoivent des DTOs et ne font pas de fetch.
- **Overlays** : `Modal` natif / pageSheet iOS, Alert natif pour les confirmations.
- **Tactile** : cibles ≥ 44 px, feedback natif, safe areas gérées par la navigation.
- **États** : loading (`ActivityIndicator`), empty, error, offline.
- **A11y** : labels, rôles, états, contraste, Dynamic Type.
- 1 composant = 1 fichier, export nommé, `interface` pour les props, **jamais `any`**.
- Server state React Query, UI state Zustand, local `useState`. Pas de fetch dans `useEffect`.

> **Fidélité** : la référence est l'UI native iOS/Android documentée dans `FIDELITY.md`.

---

## 7. État d'avancement — UI (v2 → v3)

### Livré (v2.0)

- **Socle UI v2** : HeroUI Native 1.0.10 + Uniwind 1.13 + Tailwind CSS v4.
  NativeWind v4/Tailwind 3, les primitifs maison et l'ancien thème `vars()` sont supprimés.
- **Navigation** : 5 onglets **Accueil / Sujets / Social / Notifications / Profil** ;
  « Jouer » reste contextuel (pas d'onglet). Route `topic/[id]` et `settings`.
- **Auth native reconstruite avec HeroUI** : OTP email, Google Android, Facebook natif
  (Android/iOS) ; mêmes endpoints, SecureStore, refresh, session et logout qu'avant.
- **Accueil** : sections, rails horizontaux, cartes sujets HeroUI, reprise de partie
  (`/api/games?active=true`), CTA « Explorer les sujets ».
- **Sujets** : `SearchField`, filtres en `BottomSheet` (suivis, catégories, tri), grille
  2 colonnes, facettes BFF, scroll infini.
- **Fiche sujet** : bannière/couverture, suivi, progression, **maîtrise par paliers de rareté**
  (Fer → Diamant, `tier` du BFF), stats, classement paginé et historique de parties.
- **Profil / Réglages** : profil, **Elo** (plus de niveau ni de titre honorifique de compte),
  stats, compteurs, édition pseudonyme/bio/pays/langue, déconnexion.
- **Social / Notifications** : onglets présents avec états « Bientôt » designés,
  à remplir en M3/M4.
- **Couche données** : services BFF et hooks React Query conservés ; socle M2
  (rooms/games/matchmaking, folds game/room, polling) préparé pour v2.1.
- **Thème** : thème HeroUI par défaut + branding Joutio minimal. Pas de reprise graphique
  de `joutio-web`.

### Livré (v2.1 — duel)

- **Play mode** : feuille HeroUI (bot / appariement public / salle privée), difficulté bot.
- **Salle** : stepper, présence, partage, wizz + cooldown, annulation/sortie, redirection
  automatique vers l'arène dès `GAME_CREATED`.
- **Arène** : scores, timer SVG, question localisée, réponses 2×2, reveal, abandon.
- **Résultat** : issue, scores, performance, XP/progression, rejouer bot / retour sujet.
- **Matchmaking** : recherche 10 s, expiration → relance / bot / retour, salle à `COMPLETED`.
- **Deep link** `joutio://join/{roomId}` + reprise après login (pending room).
- **Accueil** : bandeau « Partie en cours » branché sur `/api/games?active=true`.
- **Données** : folds `GameState`/notifications, polling REST, hooks salles/game/matchmaking.

### Livré (v3 — UI native)

- **Coque** : NativeTabs iOS/Android, stacks natifs par onglet, headers natifs.
- **Fiche sujet** : header silver natif, cover, actions, sections natives.
- **Écrans** : Accueil, Sujets (recherche native iOS + filtres), Fiche sujet, Profil,
  Réglages, Auth, Social, Notifications.
- **Duel** : salle, arène, résultat et matchmaking natifs en plein écran.
- **Composants** : `src/ui/` (text, button, card, list-row, segmented-control, avatar,
  progress-bar, icons), ToastHost et confirmation native.
- **Nettoyage** : HeroUI, Uniwind, Tailwind, Inter et les anciens composants supprimés.

### À valider (Expo Go / build natif)

- NativeTabs iOS/Android : barre, icônes SF/Material, labels, comportement scroll.
- Headers natifs, large titles iOS, app bar Android, back gestures.
- Header silver de la fiche sujet.
- Transitions et modales natives.
- Login OTP : le champ email et le code restent visibles au-dessus du clavier.
- Le preview web ne reflète pas les composants natifs.

### Vérifié

| Contrôle | Résultat |
|---|---|
| `npm run typecheck` | ✅ (UI native v3) |
| `npx expo export --platform android` | ✅ (NativeTabs + React Native) |
| `npx expo export --platform web` | ✅ (debug uniquement ; fallback tabs JS) |
| `npx expo-doctor` | ✅ (21/21) |
| `npx expo prebuild --platform android` | ✅ (v2.1 ; à refaire pour la v3) |
| Smoke web mobile (390×844), token injecté + BFF mocké | Accueil, Sujets, filtres, Fiche sujet, Profil, Réglages, Social, Notifications, Auth, **0 erreur** |
| Smoke duel (390×844, BFF mocké) | Fiche sujet → modale native → salle → arène → réponse → résultat, **0 erreur** |
| Smoke modes (matchmaking + salle privée) | Recherche → expiration → retour sujet ; création de salle privée + partage/fermeture, **0 erreur** |
| Smoke pilote UI v3 (390×844 + 320×568, clair/sombre) | Accueil, Fiche sujet, tab bar, notifications/profil, **0 erreur** |

### Non testé / restant

- **Runtime natif sur appareil** : l'APK v2.1 doit être installé et testé (auth, écrans,
  performances) — pas d'`adb`/émulateur dans l'environnement de dev courant.
- **UI v4** : valider sur build natif (tab bar, barres de titre, back gestures, transitions) ;
  le web ne représente pas les composants natifs.
- **Facebook** : Client Token à rotationner ; valider sur appareil après key hashes Meta
  (release `MCWQysuDe8tc/MALWl90JGgF0kk=` + debug) et app Live / Test users.
- **Google** : clients Web/Android/iOS créés dans le projet `13717769562` (§ 4) ;
  valider la connexion native sur appareil.
- **Écrans portés sur `src/ui/jo/`** : tout le parcours joueur (auth, onboarding, Accueil, recherche,
  Sujets, Fiche sujet, duel complet, résultat et revue, Social, fiche joueur, Défis, inbox, Profil,
  collection, cérémonies, avatar, Réglages, suppression de compte, Premium « bientôt », états
  système). **Absents** : autorisation
  des notifications et push, création, équipe et modération de sujet, mur et chat (V1.1).
- **Lot 2** : tab bar, barres de titre, Défis et inbox non validés sur appareil. La
  suppression et le repassage en non-lu de l'inbox, ainsi que « Défier un abonné », « Suivre »
  et « Relancer », ne sont pas livrés. Le quota « sur 5 possibles » n'est pas affiché : le BFF
  ne l'expose pas.
- **Duel sur appareil** : valider l'arène en temps réel, le wizz reçu et l'appariement
  humain complet sur APK (le smoke web couvre le bot, l'expiration et la salle privée).
- **Push** : M5. STOMP est branché ; le sondage REST reste le filet de rattrapage.
- **Web** : fallback de debug uniquement, pas une cible produit.

### Dépendances notables

`expo-router` (+ NativeTabs), `expo-symbols` (SF/Material), `react-native-svg`,
`react-native-screens`, `react-native-safe-area-context`, `react-native-gesture-handler`,
`expo-image`, `expo-system-ui`, `expo-secure-store`,
`@react-native-google-signin/google-signin`, `react-native-fbsdk-next`,
`@tanstack/react-query`, `zustand`, `react-hook-form` + `zod`.
