import { ENDPOINTS } from '@/lib/endpoints'
import type { SuspensionInfo } from '@/shared/types/session'
import type { FacebookCredential } from './facebook'
import { t } from '@/lib/i18n'

/** Session mobile retournée par identity (mêmes JWT que le flux OIDC web). */
export interface MobileLoginResponse {
  userId: string
  email: string
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}

interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  suspendedUntil?: string
  suspensionReason?: string
}

/** Erreur d'authentification identity, avec un message prêt à afficher. */
export class IdentityAuthError extends Error {
  readonly status?: number
  readonly type?: string
  /** Compte suspendu (`403`) : fin et motif annoncés par identity. */
  readonly suspension?: SuspensionInfo

  constructor(message: string, status?: number, type?: string, suspension?: SuspensionInfo) {
    super(message)
    this.name = 'IdentityAuthError'
    this.status = status
    this.type = type
    this.suspension = suspension
  }
}

/** Lu à l'appel : la langue peut changer après le chargement du module. */
const network = () => t('common.checkConnection')

async function postJson(url: string, body: unknown): Promise<Response> {
  try {
    return await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    throw new IdentityAuthError(t('mobile.auth.connectionFailed', { network: network() }))
  }
}

async function readError(response: Response, fallback: string): Promise<IdentityAuthError> {
  const problem = (await response.json().catch(() => null)) as ProblemDetail | null
  const suspension = response.status === 403 ? { until: problem?.suspendedUntil, reason: problem?.suspensionReason } : undefined
  return new IdentityAuthError(problem?.detail ?? problem?.title ?? fallback, response.status, problem?.type, suspension)
}

/** Identity répond toujours 202 (anti-énumération) : on passe au code même sans compte existant. */
export async function requestLoginCode(email: string): Promise<void> {
  const response = await postJson(ENDPOINTS.auth.requestLoginCode, { email: email.trim() })
  if (!response.ok) throw await readError(response, t('mobile.auth.sendFailed', { network: network() }))
}

/** Vérifie le code et retourne une session mobile (access + refresh). */
export async function loginWithCode(email: string, code: string): Promise<MobileLoginResponse> {
  const response = await postJson(ENDPOINTS.auth.loginWithCode, { email: email.trim(), code: code.trim() })
  if (!response.ok) throw await readError(response, t('onboarding.code.wrong'))
  const session = (await response.json()) as MobileLoginResponse
  if (!session.accessToken || !session.refreshToken) throw new IdentityAuthError(t('mobile.auth.incomplete'), response.status)
  return session
}

async function readSession(response: Response): Promise<MobileLoginResponse> {
  const session = (await response.json()) as MobileLoginResponse
  if (!session.accessToken || !session.refreshToken) throw new IdentityAuthError(t('mobile.auth.incomplete'), response.status)
  return session
}

/** Échange un ID token Google natif contre une session mobile. */
export async function loginWithGoogle(idToken: string): Promise<MobileLoginResponse> {
  const response = await postJson(ENDPOINTS.auth.loginWithGoogle, { idToken })
  if (!response.ok) throw await readError(response, t('mobile.auth.google.failedRetry'))
  return readSession(response)
}

/** Échange une identité Facebook native contre une session mobile (iOS : ID token + nonce ; Android : access token). */
export async function loginWithFacebook(credential: FacebookCredential): Promise<MobileLoginResponse> {
  const body = 'idToken' in credential ? { idToken: credential.idToken, nonce: credential.nonce } : { accessToken: credential.accessToken }
  const response = await postJson(ENDPOINTS.auth.loginWithFacebook, body)
  if (!response.ok) throw await readError(response, t('mobile.auth.facebook.failedRetry'))
  return readSession(response)
}
