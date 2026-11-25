import { MIN_SEARCH_LENGTH, useSuggestions as useLibSuggestions } from '@joutio/client/search'
import { useCallback, useEffect, useState } from 'react'
import { getItem, setItem } from '@/lib/storage'
import { useDebounced } from '@/shared/hooks/use-debounced'

/** Recherche lancée à partir de 2 caractères, 250 ms après la dernière frappe : la temporisation reste dans l'app. */
export function useSuggestions(query: string) {
  const term = useDebounced(query.trim(), 250)
  const enabled = term.length >= MIN_SEARCH_LENGTH
  const result = useLibSuggestions(term)
  // Résultat de la saisie en cours : tant que l'attente court, on montre le chargement plutôt que l'ancien terme.
  const settling = query.trim() !== term && query.trim().length >= MIN_SEARCH_LENGTH
  return { ...result, term, searching: enabled || settling, settling }
}

const RECENTS_KEY = 'joutio.search.recents'
const MAX_RECENTS = 5

/** Recherches récentes, sur l'appareil (5 au plus, la plus récente en haut). */
export function useRecentSearches() {
  const [recents, setRecents] = useState<string[]>([])
  useEffect(() => {
    void getItem(RECENTS_KEY).then((value) => {
      if (!value) return
      try {
        setRecents(JSON.parse(value) as string[])
      } catch {
        // Valeur illisible : on repart de zéro.
      }
    })
  }, [])
  const remember = useCallback((value: string) => {
    setRecents((current) => {
      const next = [value, ...current.filter((item) => item !== value)].slice(0, MAX_RECENTS)
      void setItem(RECENTS_KEY, JSON.stringify(next))
      return next
    })
  }, [])
  const clear = useCallback(() => {
    setRecents([])
    void setItem(RECENTS_KEY, '[]')
  }, [])
  return { recents, remember, clear }
}
