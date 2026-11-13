import { buildShareUrl, type ShareKind } from '@joutio/client-domain/share'
import * as Clipboard from 'expo-clipboard'
import { useCallback } from 'react'
import { Platform, Share } from 'react-native'
import { toast } from '@/design-system'
import { useSessionStore } from '@/features/auth'
import { useReferral } from '@/features/me'

export interface ShareTarget {
  kind: ShareKind
  /** Identifiant du joueur, du sujet, du salon ou code de parrainage. */
  id: string
  /** Phrase d'accompagnement. */
  message: string
  title?: string
}

/**
 * Partage natif (`design/specs/screens/partage.md` § 4) : feuille du système avec le lien universel
 * `go.joutio.com/…?ref={code}`. iOS passe le lien en `url` (aperçu riche dans Messages) ; Android l'ajoute au message.
 */
export function useShare() {
  const authenticated = useSessionStore((state) => state.authenticated)
  const referral = useReferral(authenticated).data
  return useCallback(
    ({ kind, id, message, title }: ShareTarget) => {
      const url = buildShareUrl({ kind, id, ref: referral?.code })
      const content = Platform.OS === 'ios' ? { message, url, title } : { message: `${message}\n${url}`, title }
      void Share.share(content).catch(() => undefined)
      return url
    },
    [referral?.code],
  )
}

/** Copie d'un lien, confirmée par un toast. */
export async function copyLink(url: string) {
  try {
    await Clipboard.setStringAsync(url)
    toast.success('Lien copié')
  } catch {
    toast.error("Le lien n'a pas pu être copié")
  }
}
