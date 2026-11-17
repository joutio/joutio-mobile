# Connexion sociale native (Google, Facebook)

Aucun navigateur, aucune WebView, aucun cookie : l'app porte l'écran de connexion et identity
émet directement les jetons (`/api/auth/mobile/*`, voir `services/joutio-identity/AGENTS.md`). Les
identifiants **publics** sont dans `src/lib/config.ts` et `app.config.ts` ; les secrets restent
côté identity. `EXPO_PUBLIC_GOOGLE_SIGN_IN_ENABLED=false` ou
`EXPO_PUBLIC_FACEBOOK_SIGN_IN_ENABLED=false` masque le bouton et retire le plugin natif. Les deux
SDK sont natifs : ils demandent un dev build, pas Expo Go.

Empreintes de la clé `joutio-preview`, qui signe la release et les dev builds de `npm run android:dev` :
- SHA-1 : `A7:86:D9:27:A3:D7:05:6D:AD:2C:F1:67:D5:A9:2F:87:00:4E:24:B4` ;
- key hash Facebook : `p4bZJ6PXBW2tLPFn1akvhwBOJLQ=`.

## Google

- `@react-native-google-signin/google-signin` utilise le client OAuth **Web** comme `webClientId`
  (audience des ID tokens). Le client **Android** n'apparaît pas dans le code : Google le résout
  par package + SHA-1.
- Côté app : `login-with-google {idToken}`.
- Configuration Google Cloud, dans le projet du client Web :
  - Auth Platform : app `Joutio`, scopes `openid`, `userinfo.email`, `userinfo.profile` ; en mode
    Testing, ajouter le compte du téléphone aux Test users ;
  - client **Android** : package `com.joutio.app`, SHA-1 ci-dessus. Pour un build debug standard,
    ajouter l'empreinte du keystore debug ; pour Play, celle de Play App Signing ;
  - propagation de 5 min à quelques heures, puis réinstaller l'APK.
- Diagnostic : `npx @react-native-google-signin/config-doctor`,
  `apksigner verify --print-certs <apk>`, `adb logcat | grep -iE 'GoogleSignIn|DEVELOPER_ERROR'`.
  Un `DEVELOPER_ERROR` signale un package, un SHA-1 ou un projet incohérent.
- iOS : client iOS et URL scheme inversé (`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`,
  `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME`).

## Facebook

- `react-native-fbsdk-next`. Le bouton n'apparaît que si `EXPO_PUBLIC_FACEBOOK_APP_ID` et
  `EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN` sont fournis au build. En CI, la variable de dépôt est
  `JOUTIO_FACEBOOK_CLIENT_TOKEN` ; vide, l'APK est construit sans Facebook.
- **Android** : login classique → access token ; identity le vérifie par `/debug_token` puis
  `/me`.
- **iOS** : Limited Login → ID token + nonce, vérifiés par le JWKS de Facebook.
- Configuration Meta :
  - plateforme Android : `com.joutio.app`, key hash release (ci-dessus) et debug :
    `keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore -storepass android | openssl sha1 -binary | base64` ;
  - plateforme iOS : bundle `com.joutio.app`, Limited Login ;
  - en mode Development, ajouter le compte du téléphone aux Test users.

  `Invalid key hash` dans le log signale une empreinte manquante.
- Après un changement : `npx expo prebuild --clean`, puis un build natif.
- Secret `JOUTIO_OAUTH2_FACEBOOK_SECRET` : côté identity seulement (secret scellé
  `joutio-identity-facebook`), **jamais** dans l'APK.
- Erreurs d'identity :
  - `401 urn:joutio:auth:invalidFacebookToken` ;
  - `422 …:facebookEmailMissing` ;
  - `503 …:facebookUnavailable`.

  Dans tous les cas, l'app propose l'OTP ou Google.
