import { useEffect, useState } from 'react'
import { readServerNow } from '@/lib/realtime/server-clock'

/** Horloge serveur, relue chaque seconde (décompte d'expiration, cadence de la relance). */
export function useServerNow() {
  const [now, setNow] = useState(readServerNow)
  useEffect(() => {
    const timer = setInterval(() => setNow(readServerNow()), 1000)
    return () => clearInterval(timer)
  }, [])
  return now
}

/**
 * Décompte d'une échéance de salon : au-delà d'une heure (salon de 24 h) heures et minutes, dans la dernière heure
 * minutes et secondes. `null` sans échéance.
 */
export function countdownOf(expiresAt: string | null | undefined, now: number) {
  if (!expiresAt) return null
  const left = Math.max(0, Math.round((Date.parse(expiresAt) - now) / 1000))
  if (left >= 3600) return `${Math.floor(left / 3600)} h ${String(Math.floor((left % 3600) / 60)).padStart(2, '0')}`
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
}
