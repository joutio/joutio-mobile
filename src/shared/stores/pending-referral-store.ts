import { normalizeReferralCode } from '@joutio/client-domain/share'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { safeStorage } from '@/design-system/theme/theme-store'

/**
 * Code de parrainage reçu avant la connexion (`partage.md` § 6) : lien universel `?ref=`, invitation
 * `go.joutio.com/i/{code}`, ou Install Referrer Android au premier lancement. Pré-remplit l'étape Date de naissance,
 * puis s'applique une fois après la connexion (`ReferralRuntime`).
 */
interface PendingReferralState {
  code: string | null
  /** Install Referrer déjà lu (une seule fois par installation). */
  installReferrerRead: boolean
  capture: (value: string | null | undefined) => void
  clear: () => void
  markInstallReferrerRead: () => void
}

export const usePendingReferral = create<PendingReferralState>()(
  persist(
    (set) => ({
      code: null,
      installReferrerRead: false,
      capture: (value) => {
        const code = normalizeReferralCode(value)
        if (code) set({ code })
      },
      clear: () => set({ code: null }),
      markInstallReferrerRead: () => set({ installReferrerRead: true }),
    }),
    { name: 'joutio-pending-referral', storage: createJSONStorage(() => safeStorage) },
  ),
)
