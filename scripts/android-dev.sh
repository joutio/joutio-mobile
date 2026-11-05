#!/usr/bin/env bash
# Dev build Android local (émulateur ou téléphone), signé avec la clé joutio-preview comme l'APK de la CI :
# connexion Google/Facebook fonctionnelle et installation par-dessus l'APK release. Arguments transmis à
# `expo run:android` (ex. `--device`, `--variant release`).
set -euo pipefail
cd "$(dirname "$0")/.."

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
# Un JDK complet (javac) : un paquet `*-jre-headless` ne suffit pas aux toolchains Gradle.
if [[ -z "${JAVA_HOME:-}" || ! -x "$JAVA_HOME/bin/javac" ]]; then
  for jdk in /usr/lib/jvm/java-17-openjdk-amd64 /usr/lib/jvm/java-21-openjdk-amd64 /usr/lib/jvm/java-25-openjdk-amd64; do
    [[ -x "$jdk/bin/javac" ]] && export JAVA_HOME="$jdk" && break
  done
fi

ENV_FILE="${JOUTIO_ANDROID_KEYSTORE_ENV:-$HOME/Homeware/joutio-secrets/android-keystore.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  # Le chemin enregistré peut venir d'une autre machine : le keystore vit à côté du fichier env.
  export ANDROID_KEYSTORE_PATH="$(dirname "$ENV_FILE")/joutio-preview.p12"
  if [[ -d android ]] && ! grep -q 'signingConfig signingConfigs.release' android/app/build.gradle; then
    echo "android/ a été généré sans la clé joutio-preview : prebuild --clean." >&2
    npx expo prebuild --platform android --clean --no-install
  fi
else
  echo "Pas de $ENV_FILE : build signé avec la clé debug (connexions Google/Facebook indisponibles)." >&2
fi

exec npx expo run:android "$@"
