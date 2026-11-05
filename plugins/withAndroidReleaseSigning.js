// Signature Android lue depuis l'environnement. Sans `ANDROID_KEYSTORE_PATH`, `expo prebuild` garde la signature
// debug : aucun effet. Avec (CI, ou `npm run android:dev` en local), release **et** debug sont signés par la même
// clé (joutio-preview) : le dev build local garde les empreintes enregistrées chez Google et Meta et s'installe
// par-dessus l'APK de la CI. Reprise de joutio-mobile.
const { withAppBuildGradle } = require('expo/config-plugins')

const RELEASE_SIGNING_CONFIG = `
        release {
            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }`

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    if (!process.env.ANDROID_KEYSTORE_PATH) return config
    let contents = config.modResults.contents
    if (!contents.includes('signingConfigs.release')) {
      contents = contents.replace(/signingConfigs\s*\{/, (match) => `${match}${RELEASE_SIGNING_CONFIG}`)
    }
    // Tous les buildTypes (debug et release) : seul le bloc `buildTypes` référence `signingConfigs.debug`.
    const buildTypesStart = contents.search(/buildTypes\s*\{/)
    if (buildTypesStart >= 0) {
      contents =
        contents.slice(0, buildTypesStart) +
        contents.slice(buildTypesStart).replace(/signingConfig\s+signingConfigs\.debug/g, 'signingConfig signingConfigs.release')
    }
    config.modResults.contents = contents
    return config
  })
}
