# Joutio mobile

App Expo (iOS et Android, `com.joutio.app`). Ce guide couvre le lancement et le test en local ; l'architecture et
les conventions sont dans [`AGENTS.md`](AGENTS.md), les notifications push dans
[`docs/push-notifications.md`](docs/push-notifications.md).

L'app est un **dev build** (`expo-dev-client`), pas Expo Go : elle embarque des modules natifs (TrueSheet, Google
Sign-In, Facebook, `modules/bottom-load`). On compile l'app native **une fois**, puis on itère avec Metro et le Fast
Refresh.

---

## 1. Prérequis

| Outil         | Version / remarque                                                                          |
|---------------|---------------------------------------------------------------------------------------------|
| Node          | 22 ou plus récent (`node -v`)                                                               |
| Accès npm     | `@joutio/client-domain` vient de GitHub Packages : un `~/.npmrc` avec un jeton `read:packages` |
| Xcode (iOS)   | Depuis l'App Store, puis `xcode-select --install` et une première ouverture d'Xcode (licence, simulateurs) |
| CocoaPods     | `brew install cocoapods`                                                                    |
| JDK (Android) | Un JDK complet, 17 à 25 : `brew install --cask temurin`                                     |
| Android SDK   | Android Studio (`brew install --cask android-studio`), voir § 3.1                           |

Le `.npmrc` du projet déclare déjà le scope `@joutio` ; il reste à poser le jeton dans `~/.npmrc` (ou `make init` à
la racine du workspace) :

```ini
//npm.pkg.github.com/:_authToken=<jeton GitHub read:packages>
```

```bash
npm install          # applique aussi les patches (patch-package)
```

---

## 2. iOS

### 2.1 Simulateur

```bash
open -a Simulator                         # ouvre le simulateur par défaut
xcrun simctl list devices available       # liste les iPhone installés
xcrun simctl boot "iPhone 18 Pro"         # démarre un modèle précis (puis open -a Simulator)
```

Autres modèles ou versions d'iOS : Xcode → Settings → Components.

### 2.2 Compiler et installer

```bash
npm run ios                               # compile le dev build, l'installe sur le simulateur démarré, lance Metro
npx expo run:ios -d "iPhone 18 Pro"       # choisir le simulateur
npx expo run:ios --device                 # iPhone branché en USB (liste interactive)
npx expo run:ios --configuration Release  # build release, sans Metro (pour tester les perfs réelles)
```

La première compilation prend plusieurs minutes (`pod install`, puis Xcode). Sur un iPhone physique, il faut un
compte Apple dans Xcode (Settings → Accounts) et activer le Mode développeur sur le téléphone (Réglages →
Confidentialité et sécurité).

---

## 3. Android

### 3.1 Installer le SDK (une fois)

1. Ouvrir Android Studio → **More Actions → SDK Manager** :
   - *SDK Platforms* : **Android 16** (API 36) ;
   - *SDK Tools* : **Android SDK Build-Tools**, **NDK (Side by side)**, **CMake**, **Android Emulator**,
     **Android SDK Platform-Tools**, **Android SDK Command-line Tools**.

   Gradle télécharge seul les versions exactes demandées par React Native
   (`node_modules/react-native/gradle/libs.versions.toml`).
2. Ajouter au `~/.zshrc` :

   ```bash
   export ANDROID_HOME="$HOME/Library/Android/sdk"
   export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
   export JAVA_HOME="$(/usr/libexec/java_home)"
   ```

3. Créer un émulateur : Android Studio → **Virtual Device Manager → Create** → Pixel 8, image système **API 36,
   Google Play, arm64-v8a** (Google Play est nécessaire à la connexion Google). Nommer l'AVD `joutio-pixel`.

### 3.2 Émulateur

```bash
emulator -list-avds              # AVD disponibles
emulator -avd joutio-pixel &     # démarre l'émulateur
adb devices                      # vérifie qu'il est vu (« device »)
```

### 3.3 Compiler et installer

```bash
npm run android:dev                       # recommandé : dev build signé avec la clé joutio-preview (voir ci-dessous)
npm run android:dev -- --device           # téléphone branché en USB (débogage USB activé)
npm run android:dev -- --variant release  # build release, sans Metro
npm run android                           # dev build signé avec la clé debug standard
```

`android:dev` charge `~/Homeware/joutio-secrets/android-keystore.env` (chemin surchargeable par
`JOUTIO_ANDROID_KEYSTORE_ENV`) et signe avec la même clé que l'APK de la CI : la connexion Google et Facebook marche,
et le build s'installe par-dessus l'APK de release sans désinstaller. Sans ce fichier, seul le code par email
fonctionne.

APK de release seul, sans installation :

```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease   # → android/app/build/outputs/apk/release/app-release.apk
adb install -r app/build/outputs/apk/release/app-release.apk
```

Téléphone en Wi-Fi : Options pour les développeurs → **Débogage sans fil**, puis `adb pair IP:PORT` et
`adb connect IP:PORT`. Metro passe par `adb reverse`, aucune IP à configurer.

Sur Linux, l'émulateur et le SDK suivent la même logique ; les chemins et paquets sont dans `AGENTS.md` § 3
« Android en local ».

---

## 4. Itérer au quotidien

```bash
npm start                # Metro seul, pour un dev build déjà installé sur le simulateur / l'émulateur
npx expo start -c        # idem en vidant le cache (après un changement de .env.local)
```

Dans le terminal de Metro : `i` ouvre l'app sur iOS, `a` sur Android, `r` recharge, `m` ouvre le menu de dev
(aussi : ⌘D sur le simulateur iOS, ⌘M sur l'émulateur Android).

**Recompiler** (`npm run ios` / `npm run android:dev`) seulement si un module natif, un plugin, `app.config.ts`,
une icône ou le splash change. Un plugin modifié demande de régénérer le natif :

```bash
npx expo prebuild --clean                 # ios/ et android/ sont générés et ignorés par git
```

---

## 5. Cibler un backend

Sans configuration, l'app parle à la **production** (`api.joutio.com`, `identity.joutio.com`). Pour la stack locale
du workspace, créer `.env.local` (jamais commité) :

```bash
# Simulateur iOS
EXPO_PUBLIC_API_URL=http://localhost:8092
EXPO_PUBLIC_OIDC_AUTHORITY=http://localhost:8085
# Émulateur Android : http://10.0.2.2:8092 et http://10.0.2.2:8085
# Téléphone physique : http://<IP de la machine>:8092 et :8085
```

Les `EXPO_PUBLIC_*` sont figées dans le bundle : relancer `npx expo start -c` après chaque changement. Les autres
variables (connexions Google et Facebook) sont décrites dans `.env`.

---

## 6. Vérifier avant de pousser

```bash
npm run typecheck        # TypeScript
npm run doctor           # cohérence des versions Expo
npm run test:mutations   # tests unitaires (un script par fichier de tests/, voir package.json)
```

Les releases sont automatiques : chaque push sur `main` passe par semantic-release (commits conventionnels) et
publie l'APK sur la release GitHub. Ne jamais modifier la version à la main.

---

## 7. Dépannage

| Symptôme                                         | Solution                                                                       |
|--------------------------------------------------|--------------------------------------------------------------------------------|
| `No development build installed`                 | Compiler une fois : `npm run ios` / `npm run android:dev`                      |
| Écran rouge « Unable to load script »            | Metro n'est pas lancé : `npm start`                                            |
| Changement de `.env.local` sans effet            | `npx expo start -c`                                                            |
| Erreur `pod install` / CocoaPods                 | `cd ios && pod install --repo-update`, ou `npx expo prebuild --clean`          |
| `SDK location not found` (Android)               | `ANDROID_HOME` absent du shell (§ 3.1)                                         |
| `adb devices` vide                               | Émulateur pas démarré, ou débogage USB non autorisé sur le téléphone           |
| Connexion Google impossible sur Android          | Utiliser `npm run android:dev` avec le keystore, et une image « Google Play »  |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE`             | Signature différente de l'app installée : `adb uninstall com.joutio.app`       |
