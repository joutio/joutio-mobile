import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logout, persistSession } from '@/lib/auth'
import { queryKeys } from '@/lib/query-keys'
import { loginWithCode, loginWithFacebook, loginWithGoogle, requestLoginCode, type MobileLoginResponse } from '../lib/auth-service'
import { signInWithFacebook, signOutFacebook } from '../lib/facebook'
import { signInWithGoogle, signOutGoogle } from '../lib/google'
import { useSessionStore } from '../session-store'

export function useRequestLoginCode() {
  return useMutation({ mutationFn: (email: string) => requestLoginCode(email) })
}

/** Persiste une session mobile et laisse la navigation suivre l'état authentifié. */
function useStartSession() {
  const setSession = useSessionStore((state) => state.setSession)
  const queryClient = useQueryClient()
  return async (session: MobileLoginResponse | null) => {
    if (!session) return
    await persistSession({ accessToken: session.accessToken, refreshToken: session.refreshToken, expiresIn: session.expiresIn, userId: session.userId })
    queryClient.removeQueries({ queryKey: queryKeys.me() })
    setSession(true)
  }
}

/** Vérifie le code, persiste la session et laisse la navigation suivre l'état authentifié. */
export function useLoginWithCode() {
  const start = useStartSession()
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) => loginWithCode(email, code),
    onSuccess: start,
  })
}

/** Sélecteur de compte Google natif, puis session identity. Annuler ne fait rien (`null`). */
export function useLoginWithGoogle() {
  const start = useStartSession()
  return useMutation({
    mutationFn: async () => {
      const idToken = await signInWithGoogle()
      return idToken ? loginWithGoogle(idToken) : null
    },
    onSuccess: start,
  })
}

/** Login Facebook natif (Limited Login sur iOS), puis session identity. Annuler ne fait rien (`null`). */
export function useLoginWithFacebook() {
  const start = useStartSession()
  return useMutation({
    mutationFn: async () => {
      const credential = await signInWithFacebook()
      return credential ? loginWithFacebook(credential) : null
    },
    onSuccess: start,
  })
}

export function useLogout() {
  const setSession = useSessionStore((state) => state.setSession)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await logout()
      // Sessions natives des fournisseurs, best-effort : la session Joutio est déjà purgée.
      await Promise.all([signOutGoogle(), signOutFacebook()])
    },
    onSettled: () => {
      queryClient.clear()
      setSession(false)
    },
  })
}
