## [1.1.1](https://github.com/joutio/joutio-mobile/compare/v1.1.0...v1.1.1) (2026-10-31)

### Bug Fixes

* **deps:** aligner les patches Expo SDK 58 ([965b520](https://github.com/joutio/joutio-mobile/commit/965b520c29b802d3823d6da629ffab4c429f7f22))

## [1.1.0](https://github.com/joutio/joutio-mobile/compare/v1.0.0...v1.1.0) (2026-10-31)

### Features

* **mobile:** livrer l'UI v4 et les parcours joueur sur la surface BFF ([adc6adf](https://github.com/joutio/joutio-mobile/commit/adc6adf55f6524cf91c9fa395a80aa3be1484949))

## 1.0.0 (2026-10-30)

### Features

* **auth:** port the v3 login and code screens ([83816ff](https://github.com/joutio/joutio-mobile/commit/83816ff3a6f1a95fa05a977cd01a7a21f95182ab))
* **mobile:** migrate to Expo SDK 58 and support light/dark themes ([5eec3b6](https://github.com/joutio/joutio-mobile/commit/5eec3b66bb3aca58b2b5e30fbe9551e5d613aa87))
* **ui:** adopt the Joutio amber design system (lot 0) ([6614a18](https://github.com/joutio/joutio-mobile/commit/6614a18ad1622e57648b3a1e1f9525dfff3cbfe7))

### Bug Fixes

* **auth:** Android keyboard inset fallback for Expo Go ([a588b2e](https://github.com/joutio/joutio-mobile/commit/a588b2e652a0bcf7c9702a35dd961ada327bb075))
* **auth:** keep the email field visible above the native keyboard ([29b54f2](https://github.com/joutio/joutio-mobile/commit/29b54f20e7b374da774093903f6e09b7fc3653fe))
* **auth:** let native keyboard insets scroll the input ([9612a40](https://github.com/joutio/joutio-mobile/commit/9612a404eef0b610ef9d4c75ea95f136eb966843))
* **auth:** native keyboard scroll inset and remove ripple feedback ([e616d23](https://github.com/joutio/joutio-mobile/commit/e616d23d482c3ab64fcb20bb8c0eae035ad596e1))
* **auth:** scroll the Android login form above the keyboard ([df1f847](https://github.com/joutio/joutio-mobile/commit/df1f847115e8e7d8d108d791d885dee56da11773))
* **auth:** use standard KeyboardAvoidingView without layout reflow ([ff9342f](https://github.com/joutio/joutio-mobile/commit/ff9342f55c7fed24881dff67ee42b20d511bf928))
* **auth:** use the Expo keyboard-handling pattern ([f0d0359](https://github.com/joutio/joutio-mobile/commit/f0d035954d834294f60e50998a211a1dca1c3a4e))
* **brand:** use the exact design logo-mark for boot, icon and splash ([b994c30](https://github.com/joutio/joutio-mobile/commit/b994c302ab3e56f63000e2a963aa394532bb11b3))
* **theme:** force Joutio dark theme in Expo Go ([a63f99c](https://github.com/joutio/joutio-mobile/commit/a63f99c91b621e9b5f478af821ad08df127b3a28))

## [2.0.0](https://github.com/joutio/joutio-mobile/compare/v1.12.0...v2.0.0) (2026-10-25)

### ⚠ BREAKING CHANGES

* **mobile:** le mobile consomme les champs tier/nextTier du BFF et
n'affiche plus les grades de maîtrise.
* **mobile:** reconstruit l'UI avec HeroUI Native et Uniwind

### Features

* first commit ([2ec789f](https://github.com/joutio/joutio-mobile/commit/2ec789fb89cc40ca57ab21f55ec003e62d8ae24e))
* **mobile:** ajoute la connexion Facebook native ([6be79f9](https://github.com/joutio/joutio-mobile/commit/6be79f97343d75c0dd73b3702909b1e12fe91f17))
* **mobile:** ajoute le duel via salles, arène et résultat ([7896bcd](https://github.com/joutio/joutio-mobile/commit/7896bcd086bb0036ac2e445e3d1fe9ccf57d6214))
* **mobile:** aligne la maîtrise sur les paliers de rareté ([d5c6280](https://github.com/joutio/joutio-mobile/commit/d5c628029e2d4675e199b5ebb2f4a87bd6401d49))
* **mobile:** aligne le pilote UI sur joutio-web avec HeroUI ([58aeee7](https://github.com/joutio/joutio-mobile/commit/58aeee769665de8d9b4ac951c81563ef241826dd))
* **mobile:** auth OIDC standard et /api/me ([6cc6d36](https://github.com/joutio/joutio-mobile/commit/6cc6d36bf8fbe8b8c7b1cd79fcfbadf0b948f9d4))
* **mobile:** branche le catalogue et la fiche sujet sur le BFF ([f575f0d](https://github.com/joutio/joutio-mobile/commit/f575f0d157609805c4ae1881484c90c0025643bc))
* **mobile:** design system native-first et Profil/Réglages BFF ([11f38e1](https://github.com/joutio/joutio-mobile/commit/11f38e19fa5a2fa30d7145d1b2ed802ca1072afb))
* **mobile:** durcit l'auth native et branche l'Accueil sur le BFF ([f36e5ba](https://github.com/joutio/joutio-mobile/commit/f36e5baf20664f56b7df37df1c57ff88d5ce0fd8))
* **mobile:** migre la coque et les écrans vers React Native natif ([938e228](https://github.com/joutio/joutio-mobile/commit/938e22836628864a87f47bfdf1e456450755fc31))
* **mobile:** native authentication and suspended-account handling ([89b061b](https://github.com/joutio/joutio-mobile/commit/89b061b8458053bd142bb9aee73cae2bda037e44))
* **mobile:** reconstruit l'UI avec HeroUI Native et Uniwind ([df3d303](https://github.com/joutio/joutio-mobile/commit/df3d303795ec293ecd99bf93dbfcf7de7c108189))
* **mobile:** refresh token support ([c376c8d](https://github.com/joutio/joutio-mobile/commit/c376c8ddeb883c0fe79a3d757532bdd76aca292f))

### Bug Fixes

* **mobile:** active Facebook avec le Client Token et corrige le nonce iOS ([a3c4dbf](https://github.com/joutio/joutio-mobile/commit/a3c4dbf6d356cb0e4c0cebb1bc52546290d09fb3))
* **mobile:** embarque l'URL identity de prod dans l'APK ([7e52d14](https://github.com/joutio/joutio-mobile/commit/7e52d1413461731fa180af80fcb7de8cd604b1cd))
* **mobile:** setup-java v5 sans cache gradle avant prebuild ([9778407](https://github.com/joutio/joutio-mobile/commit/9778407032d632537675380e5e9f3fad05cc16e1))
* **mobile:** termine l'échange OIDC sur la route callback ([488485c](https://github.com/joutio/joutio-mobile/commit/488485c47cb6d2f3ea10aca7ded78e9dead8cd72))
* **mobile:** versionCode sémantique et run CI dans le badge ([ed150dd](https://github.com/joutio/joutio-mobile/commit/ed150ddd3b242d1c4c00047a9b43539446f14a7e))
* **joutio-mobile:** bump version ([d157738](https://github.com/joutio/joutio-mobile/commit/d1577381b74f3fba1b5311efc7b44fc7b15c1f4f))

### Performance Improvements

* **mobile:** APK arm64 uniquement et cache Gradle ([7ffd409](https://github.com/joutio/joutio-mobile/commit/7ffd409fd5add47ae6f7b56b2e0f076329bad98a))

## [2.2.0](https://github.com/joutio/joutio-mobile/compare/v2.1.0...v2.2.0) (2026-10-19)

### Features

* **mobile:** aligne le pilote UI sur joutio-web avec HeroUI ([58aeee7](https://github.com/joutio/joutio-mobile/commit/58aeee769665de8d9b4ac951c81563ef241826dd))

## [2.1.0](https://github.com/joutio/joutio-mobile/compare/v2.0.0...v2.1.0) (2026-10-19)

### Features

* **mobile:** ajoute le duel via salles, arène et résultat ([7896bcd](https://github.com/joutio/joutio-mobile/commit/7896bcd086bb0036ac2e445e3d1fe9ccf57d6214))

## [2.0.0](https://github.com/joutio/joutio-mobile/compare/v1.6.1...v2.0.0) (2026-10-19)

### ⚠ BREAKING CHANGES

* **mobile:** reconstruit l'UI avec HeroUI Native et Uniwind

### Features

* **mobile:** reconstruit l'UI avec HeroUI Native et Uniwind ([df3d303](https://github.com/joutio/joutio-mobile/commit/df3d303795ec293ecd99bf93dbfcf7de7c108189))

## [1.6.1](https://github.com/joutio/joutio-mobile/compare/v1.6.0...v1.6.1) (2026-10-19)

### Bug Fixes

* **mobile:** active Facebook avec le Client Token et corrige le nonce iOS ([a3c4dbf](https://github.com/joutio/joutio-mobile/commit/a3c4dbf6d356cb0e4c0cebb1bc52546290d09fb3))

## [1.6.0](https://github.com/joutio/joutio-mobile/compare/v1.5.0...v1.6.0) (2026-10-19)

### Features

* **mobile:** ajoute la connexion Facebook native ([6be79f9](https://github.com/joutio/joutio-mobile/commit/6be79f97343d75c0dd73b3702909b1e12fe91f17))

## [1.5.0](https://github.com/joutio/joutio-mobile/compare/v1.4.0...v1.5.0) (2026-10-19)

### Features

* **mobile:** branche le catalogue et la fiche sujet sur le BFF ([f575f0d](https://github.com/joutio/joutio-mobile/commit/f575f0d157609805c4ae1881484c90c0025643bc))

## [1.4.0](https://github.com/joutio/joutio-mobile/compare/v1.3.1...v1.4.0) (2026-10-18)

### Features

* **mobile:** design system native-first et Profil/Réglages BFF ([11f38e1](https://github.com/joutio/joutio-mobile/commit/11f38e19fa5a2fa30d7145d1b2ed802ca1072afb))

## [1.3.1](https://github.com/joutio/joutio-mobile/compare/v1.3.0...v1.3.1) (2026-10-18)

### Bug Fixes

* **mobile:** embarque l'URL identity de prod dans l'APK ([7e52d14](https://github.com/joutio/joutio-mobile/commit/7e52d1413461731fa180af80fcb7de8cd604b1cd))

## [1.3.0](https://github.com/joutio/joutio-mobile/compare/v1.2.0...v1.3.0) (2026-10-18)

### Features

* **mobile:** durcit l'auth native et branche l'Accueil sur le BFF ([f36e5ba](https://github.com/joutio/joutio-mobile/commit/f36e5baf20664f56b7df37df1c57ff88d5ce0fd8))

## [1.2.0](https://github.com/joutio/joutio-mobile/compare/v1.1.1...v1.2.0) (2026-10-18)

### Features

* **mobile:** native authentication and suspended-account handling ([89b061b](https://github.com/joutio/joutio-mobile/commit/89b061b8458053bd142bb9aee73cae2bda037e44))

## [1.1.1](https://github.com/joutio/joutio-mobile/compare/v1.1.0...v1.1.1) (2026-10-17)

### Bug Fixes

* **mobile:** termine l'échange OIDC sur la route callback ([488485c](https://github.com/joutio/joutio-mobile/commit/488485c47cb6d2f3ea10aca7ded78e9dead8cd72))

## [1.1.0](https://github.com/joutio/joutio-mobile/compare/v1.0.1...v1.1.0) (2026-10-17)

### Features

* **mobile:** auth OIDC standard et /api/me ([6cc6d36](https://github.com/joutio/joutio-mobile/commit/6cc6d36bf8fbe8b8c7b1cd79fcfbadf0b948f9d4))

## [1.0.1](https://github.com/joutio/joutio-mobile/compare/v1.0.0...v1.0.1) (2026-10-17)

### Bug Fixes

* **mobile:** versionCode sémantique et run CI dans le badge ([ed150dd](https://github.com/joutio/joutio-mobile/commit/ed150ddd3b242d1c4c00047a9b43539446f14a7e))

## 1.0.0 (2026-10-17)

### Features

* first commit ([2ec789f](https://github.com/joutio/joutio-mobile/commit/2ec789fb89cc40ca57ab21f55ec003e62d8ae24e))
* **mobile:** refresh token support ([c376c8d](https://github.com/joutio/joutio-mobile/commit/c376c8ddeb883c0fe79a3d757532bdd76aca292f))

### Bug Fixes

* **mobile:** setup-java v5 sans cache gradle avant prebuild ([9778407](https://github.com/joutio/joutio-mobile/commit/9778407032d632537675380e5e9f3fad05cc16e1))
* **joutio-mobile:** bump version ([d157738](https://github.com/joutio/joutio-mobile/commit/d1577381b74f3fba1b5311efc7b44fc7b15c1f4f))

### Performance Improvements

* **mobile:** APK arm64 uniquement et cache Gradle ([7ffd409](https://github.com/joutio/joutio-mobile/commit/7ffd409fd5add47ae6f7b56b2e0f076329bad98a))
