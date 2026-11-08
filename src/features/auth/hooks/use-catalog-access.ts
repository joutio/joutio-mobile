import { useSyncExternalStore } from 'react'
import { config } from '@/lib/config'
import { useSessionStore } from '../session-store'
import { decodeRoles, getAccessToken, onAccessTokenChanged } from '@/lib/auth'

const isAdmin = () => decodeRoles(getAccessToken()).includes('ROLE_ADMIN')

/** Réactif au login, à la restauration, au refresh et à la déconnexion. */
export function useCatalogAccess() {
  const authenticated = useSessionStore((state) => state.authenticated)
  const admin = useSyncExternalStore(onAccessTokenChanged, isAdmin, () => false)
  return authenticated && admin && config.catalogEnabled
}
