import { useCommand } from '@joutio/client/core/query'
import { logout, persistSession } from '@/lib/auth'
import { IdentityAuthError, loginWithCode, loginWithFacebook, loginWithGoogle, requestLoginCode, type MobileLoginResponse } from '../lib/auth-service'
import { signInWithFacebook, signOutFacebook } from '../lib/facebook'
import { signInWithGoogle, signOutGoogle } from '../lib/google'
import { useSessionStore } from '../session-store'

/**
 * Session : commandes d'identity (hors BFF), sans donnée en cache. Elles passent par `useCommand` de la lib comme toute
 * commande ; une session ouverte ou fermée change de cache (`JoutioRoot`).
 */
export function useRequestLoginCode() {
  return useCommand(['session', 'code'], (email: string) => requestLoginCode(email))
}

/** Persiste une session mobile et laisse la navigation suivre l'état authentifié. */
function useStartSession() {
  const setSession = useSessionStore((state) => state.setSession)
  return async (session: MobileLoginResponse | null) => {
    if (!session) return
    await persistSession({ accessToken: session.accessToken, refreshToken: session.refreshToken, expiresIn: session.expiresIn, userId: session.userId })
    setSession(true)
  }
}

/**
 * Ouvre la session obtenue ; un compte suspendu (`403` d'identity) termine la session avec sa fin et son motif, et
 * l'écran dédié s'affiche.
 */
function useSignIn() {
  const start = useStartSession()
  const endSession = useSessionStore((state) => state.endSession)
  return async (login: () => Promise<MobileLoginResponse | null>) => {
    try {
      await start(await login())
    } catch (error) {
      if (error instanceof IdentityAuthError && error.status === 403 && error.type?.includes('accountSuspended')) endSession('suspended', error.suspension)
      throw error
    }
  }
}

/** Vérifie le code, persiste la session et laisse la navigation suivre l'état authentifié. */
export function useLoginWithCode() {
  const signIn = useSignIn()
  return useCommand(['session', 'login', 'code'], ({ email, code }: { email: string; code: string }) => signIn(() => loginWithCode(email, code)))
}

/** Sélecteur de compte Google natif, puis session identity. Annuler ne fait rien (`null`). */
export function useLoginWithGoogle() {
  const signIn = useSignIn()
  return useCommand(['session', 'login', 'google'], (_: void) =>
    signIn(async () => {
      const idToken = await signInWithGoogle()
      return idToken ? loginWithGoogle(idToken) : null
    }),
  )
}

/** Login Facebook natif (Limited Login sur iOS), puis session identity. Annuler ne fait rien (`null`). */
export function useLoginWithFacebook() {
  const signIn = useSignIn()
  return useCommand(['session', 'login', 'facebook'], (_: void) =>
    signIn(async () => {
      const credential = await signInWithFacebook()
      return credential ? loginWithFacebook(credential) : null
    }),
  )
}

export function useLogout() {
  const setSession = useSessionStore((state) => state.setSession)
  return useCommand(['session', 'logout'], async (_: void) => {
    try {
      await logout()
      // Sessions natives des fournisseurs, best-effort : la session Joutio est déjà purgée.
      await Promise.all([signOutGoogle(), signOutFacebook()])
    } finally {
      setSession(false)
    }
  })
}
