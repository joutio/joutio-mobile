import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import { useSessionStore } from '@/features/auth'
import { useApplyReferral, useMe } from '@/features/me'
import { usePendingReferral } from '@/shared/stores/pending-referral-store'
import { installReferrer } from '@/shared/utils/app-info'

/** Paramètres du Play Install Referrer posés par la page go.joutio.com : `ref={code}&link={chemin}`. */
function referrerCode(referrer: string): string | null {
  for (const pair of referrer.split('&')) {
    const [key, value] = pair.split('=')
    if (key === 'ref' && value) return decodeURIComponent(value)
  }
  return null
}

/**
 * Parrainage sans service tiers (`partage.md` § 6) : au premier lancement Android, lit le Play Install Referrer ; une
 * fois le joueur connecté (date de naissance déjà donnée), applique le code en attente, une seule fois.
 */
export function ReferralRuntime() {
  const authenticated = useSessionStore((state) => state.authenticated)
  const me = useMe(authenticated)
  const { code, installReferrerRead, capture, clear, markInstallReferrerRead } = usePendingReferral()
  const apply = useApplyReferral()
  const applied = useRef(false)

  useEffect(() => {
    if (Platform.OS !== 'android' || installReferrerRead) return
    markInstallReferrerRead()
    void installReferrer().then((referrer) => capture(referrerCode(referrer)))
  }, [installReferrerRead, markInstallReferrerRead, capture])

  useEffect(() => {
    if (applied.current || !code || !me.data || me.data.birthDateRequired) return
    applied.current = true
    clear()
    apply.mutate(code)
  }, [code, me.data, clear, apply])

  return null
}
