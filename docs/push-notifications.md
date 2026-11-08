# Push Expo — activation et validation

Le lot envoie les invitations (`CHALLENGE_RECEIVED`, dont les revanches) et les relances
(`WIZZ`). Au premier plan, Joutio conserve son interface STOMP, sans bannière ni son système.
Les préférences serveur `ROOM` et la préférence Revanches de chaque installation sont respectées.
Rangs/badges restent hors de ce lot ; leur réglage actuel ne déclenche aucun push.

## 1. Expo et Firebase Android

1. Se connecter au compte Expo souhaité (`npx eas-cli login`) puis rattacher/créer le projet
   (`npx eas-cli init`, dans ce dépôt). Reporter l'UUID affiché dans `.env.local` :
   `EXPO_PUBLIC_EAS_PROJECT_ID=<UUID>`. Si EAS renseigne `extra.eas.projectId`, la configuration
   le conserve également ; la variable d'environnement permet de le fournir en CI.
2. Dans Firebase, créer un projet et une application Android dont le package est **`com.joutio.app`**.
   Télécharger `google-services.json` et définir `GOOGLE_SERVICES_JSON` sur son chemin absolu
   dans `.env.local`. Ce fichier n'est pas la clé privée du compte de service.
3. Activer l'API Firebase Cloud Messaging v1 et créer les identifiants de compte de service
   pour FCM. Dans `npx eas-cli credentials --platform android`, associer ces identifiants
   au projet Expo et à `com.joutio.app`. Ne pas embarquer leur JSON privé dans l'application.
4. Relancer Metro après modification des variables et régénérer/compiler le natif :
   `npx expo prebuild --platform android --clean`, puis `npm run android:dev`.
   Les builds locaux restent compatibles avec Expo Push Service.

Référence : [configuration Expo Push](https://docs.expo.dev/push-notifications/push-notifications-setup/).
Expo Go Android ne permet pas ces push distants ; utiliser un dev build ou une release.

### APK de la CI

Configurer la variable de dépôt **`EXPO_PUBLIC_EAS_PROJECT_ID`** et le secret
**`GOOGLE_SERVICES_JSON_BASE64`** (contenu base64 de `google-services.json`). Le workflow
release fournit le fichier à Expo avant le prebuild et refuse une configuration push partielle.
Les identifiants FCM privés restent chez Expo, jamais dans les secrets publics de l'app.

## 2. BFF

Déployer d'abord le BFF : Flyway applique `V2__expo_push.sql`. Le canal est désactivé par défaut.
Les abonnements peuvent déjà être enregistrés, mais aucun envoi n'est préparé tant que
`JOUTIO_EXPO_PUSH_ENABLED=false`.

- **`JOUTIO_EXPO_PUSH_ENABLED=true`** active la préparation et le worker d'envoi.
- **`JOUTIO_EXPO_PUSH_ACCESS_TOKEN`** contient le jeton d'accès Expo si la sécurité renforcée
  du projet Expo est activée. Le fournir via un Secret Kubernetes ; jamais dans une variable
  `EXPO_PUBLIC_*`. Sans sécurité renforcée, laisser cette valeur vide.
- Aucun changement n'est nécessaire dans `joutio-notification` ni dans le SDK.

Une installation est enregistrée par `PUT /api/push/expo/subscriptions` avec
`{ installationId, token, platform: "ANDROID"|"IOS", rematches }`. Réponse `204`.
La suppression utilise `DELETE /api/push/expo/subscriptions?installationId=...` (`204`).
Le joueur provient exclusivement du JWT. Un joueur ne peut supprimer l'installation d'un autre.
La réinscription d'un token le réaffecte atomiquement au compte courant, sans dupliquer l'appareil.

## 3. Validation Android

Sur un appareil Android (ou un émulateur avec Play Services), avec deux comptes Joutio :

- Autoriser les notifications à l'onboarding ou dans Réglages › Notifications système.
- Envoyer un défi, une revanche et une relance depuis le second compte. Vérifier l'affichage
  avec l'app ouverte, en arrière-plan puis fermée normalement. Un arrêt forcé Android depuis
  les réglages peut empêcher toute livraison jusqu'à la prochaine ouverture.
- Toucher une invitation : ouvrir Défis ; toucher un wizz valide : ouvrir le salon.
  Tester aussi l'ouverture à froid, après connexion et après expiration/suppression de la salle.
- Désactiver `ROOM`, puis Revanches ; vérifier le filtrage. Retirer l'autorisation système,
  rouvrir Joutio et vérifier le désenregistrement.
- Tester deux appareils sur le même compte, puis une déconnexion et une connexion avec un autre
  compte sur un appareil. Aucun nouvel envoi ne doit viser l'ancien compte après réaffectation.
- Une revanche n'étant valide que quelques secondes, elle peut expirer avant livraison.

## 4. Exploitation et limites

Le groupe global Axon `notification-push` persiste la file. Le worker HTTP dédié vérifie toutes
les 2 s les livraisons dues ; le claim PostgreSQL réserve une livraison 60 s entre les répliques.
Les invitations antérieures à l'inscription de l'installation sont ignorées. Les replays Axon
explicites ne déclenchent pas ce handler.

Les envois sont dédupliqués par notification/installation. Les erreurs transitoires ont au plus
5 tentatives, avec attente croissante ; l'expiration arrête les envois. Les reçus sont consultés
15 min après acceptation par Expo. `DeviceNotRegistered` supprime le token. Les suppressions
et suspensions de compte retirent les abonnements ; les suppressions d'inbox annulent les envois
encore en attente. Une préférence `ROOM` est relue avant chaque envoi.

Surveiller les logs `Expo HTTP status`, `Expo push failure` et `Expo delivery`. Contrôles SQL,
sans exporter les tokens :

```sql
SELECT done, count(*) FROM expo_push_delivery GROUP BY done;
SELECT count(*) FROM expo_push_delivery WHERE done=false AND next_at < now() - interval '2 minutes';
SELECT count(*) FROM expo_push_subscription;
```

Le worker purge son journal après 7 jours. Les abonnements restent jusqu'à désinscription,
réaffectation, suppression de compte ou reçu d'invalidation. Pour couper le canal, remettre
`JOUTIO_EXPO_PUSH_ENABLED=false` ; les envois en attente seront réévalués à la réactivation.

Le reçu confirme le transfert à FCM/APNs, pas l'affichage sur l'appareil. Un crash après acceptation
Expo mais avant persistance du ticket peut produire un doublon : la livraison n'est pas exactly-once.
Un push déjà transmis à l'OS ne peut pas être retiré par une suppression d'inbox. Une déconnexion
hors ligne ne garantit pas la révocation serveur ; la prochaine inscription réaffecte le token.
Les bannières portent un texte générique, sans pseudonyme ni contenu privé.

Référence : [tickets, reçus et erreurs Expo](https://docs.expo.dev/push-notifications/sending-notifications/).

## 5. iOS (étape suivante)

Pour **`com.joutio.app`**, configurer le compte Apple Developer, la capacité Push Notifications
et la clé APNs du projet Expo (`npx eas-cli credentials --platform ios`). Recréer les profils de
provisioning si nécessaire, puis régénérer/compiler avec `npm run ios` sur macOS et reprendre la
matrice de validation sur appareil. Le plugin `expo-notifications` est déjà dans `app.config.ts`.
Les identifiants Apple et la validation iOS ne sont pas inclus dans les vérifications locales Linux.

## Vérifications automatisées

Mobile : `npm run typecheck`, `npm run test:push`, `npm run doctor`.
BFF : `mvn -pl joutio-bff-infrastructure -Dtest='ExpoPush*Test,WebPushDispatcherTest,PushControllerTest' test`.
Les tests PostgreSQL utilisent exclusivement une base jetable, activés par
`JOUTIO_EXPO_TEST_DB_URL=jdbc:postgresql://127.0.0.1:55439/postgres`, utilisateur `postgres`,
mot de passe de test `expo-test-only`. Ils créent puis suppriment leur propre schéma.
