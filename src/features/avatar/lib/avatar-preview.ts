import { useCallback } from 'react'
import { useMe } from '@/features/me'
import { defaultOptionsFor } from '@/shared/avatar/styles'
import { avatarSvg, parseAvatarConfig, type AvatarConfig } from '@/shared/utils/avatar'
import type { AvatarStyleId } from './avatar-styles'

/** Réglages par défaut d'un Micah neuf (lab, `DEFAULT_AVATAR`). */
export const DEFAULT_MICAH: AvatarConfig = {
  style: 'micah',
  hair: 'fonze',
  hairColor: '#18181b',
  eyes: 'eyes',
  mouth: 'laughing',
  glasses: 'none',
  backgroundColor: '#dbeafe',
}

/**
 * Options d'un style à partir d'une configuration. Le style courant garde ses options telles quelles (le tirage
 * DiceBear dépend des options passées) ; un autre style reprend seulement le fond, Micah ses réglages de référence.
 */
export function withStyle(config: AvatarConfig | null, style: AvatarStyleId): AvatarConfig {
  const current = config?.style ?? (config ? 'micah' : 'base')
  if (config && current === style) return config
  const background = config?.backgroundColor ? { backgroundColor: config.backgroundColor } : {}
  // L'avatar de base est celui du Profil : les initiales, sans aucun réglage (2026-11-12).
  if (style === 'base') return { style: 'base' }
  // Un autre style part de ses réglages de référence (`defaults` du web), fond conservé.
  return { ...defaultOptionsFor(style), ...background }
}

/** SVG de l'avatar du joueur connecté. */
export function useMyAvatar(): string | undefined {
  const me = useMe(true).data
  return me ? (avatarSvg(me.avatarOptions, me.userId) ?? undefined) : undefined
}

/** Aperçu de chaque style avec les réglages actuels du joueur (cartes de récompense). */
export function useAvatarPreview(config?: AvatarConfig | null) {
  const me = useMe(true).data
  const base = config === undefined ? parseAvatarConfig(me?.avatarOptions) : config
  const seed = me?.userId ?? 'joutio'
  return useCallback((style: AvatarStyleId) => avatarSvg(JSON.stringify(withStyle(base, style)), seed) ?? undefined, [base, seed])
}
