import { config } from './config'

/**
 * Ce que l'app appelle elle-même : auth native de `joutio-identity` (absolue ; l'auth mobile retourne directement les
 * jetons, seul le refresh passe par `/oauth2/token`), envoi d'images et canaux de présence. Tout le reste du BFF est décrit par les services de la lib.
 */
export const ENDPOINTS = {
  auth: {
    requestLoginCode: `${config.identityUrl}/api/auth/mobile/request-login-code`,
    loginWithCode: `${config.identityUrl}/api/auth/mobile/login-with-code`,
    loginWithGoogle: `${config.identityUrl}/api/auth/mobile/login-with-google`,
    loginWithFacebook: `${config.identityUrl}/api/auth/mobile/login-with-facebook`,
    logout: `${config.identityUrl}/api/auth/mobile/logout`,
    token: `${config.identityUrl}/oauth2/token`,
  },
  media: '/api/media',
  rooms: {
    /** Canal de présence : abonné = dans le salon ; le serveur observe l'abonnement, l'app ne déclare rien. */
    presence: (roomId: string) => `/topic/rooms/${roomId}/presence`,
  },
  matchmaking: {
    /** Canal de présence du ticket : quitter l'écran ou perdre la connexion annule la recherche côté serveur. */
    presence: (ticketId: string) => `/topic/matchmaking/tickets/${ticketId}/presence`,
  },
} as const
