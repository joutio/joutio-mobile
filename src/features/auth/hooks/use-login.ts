import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logout, persistSession } from '@/lib/auth'
import { queryKeys } from '@/lib/query-keys'
import { loginWithCode, requestLoginCode } from '../lib/auth-service'
import { useSessionStore } from '../session-store'

export function useRequestLoginCode() {
  return useMutation({ mutationFn: (email: string) => requestLoginCode(email) })
}

/** Vérifie le code, persiste la session et laisse la navigation suivre l'état authentifié. */
export function useLoginWithCode() {
  const setSession = useSessionStore((state) => state.setSession)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) => loginWithCode(email, code),
    onSuccess: async (session) => {
      await persistSession({ accessToken: session.accessToken, refreshToken: session.refreshToken, expiresIn: session.expiresIn, userId: session.userId })
      await queryClient.invalidateQueries({ queryKey: queryKeys.me() })
      setSession(true)
    },
  })
}

export function useLogout() {
  const setSession = useSessionStore((state) => state.setSession)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear()
      setSession(false)
    },
  })
}
