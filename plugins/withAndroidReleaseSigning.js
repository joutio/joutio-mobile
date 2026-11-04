// Signature release Android lue depuis l'environnement (CI). Sans `ANDROID_KEYSTORE_PATH`, `expo prebuild` garde la
// signature debug : aucun effet en local. Reprise de joutio-mobile.
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
    contents = contents.replace(/(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/, '$1signingConfig signingConfigs.release')
    config.modResults.contents = contents
    return config
  })
}
