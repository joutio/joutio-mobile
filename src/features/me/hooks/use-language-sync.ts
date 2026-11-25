import { useEffect } from 'react'
import type { Language } from '@joutio/client/core/types'
import { useLanguageStore } from '@/lib/i18n'

/**
 * Aligne la langue de l'app sur `MeView.language`. `useUpdateMe('language')` modifie `me` de façon optimiste (et le
 * restaure si le BFF refuse) : la langue suit donc aussitôt le réglage, et revient en cas d'échec.
 */
export function useLanguageSync(language: Language | undefined) {
  const setLanguage = useLanguageStore((state) => state.setLanguage)
  useEffect(() => {
    if (language) setLanguage(language)
  }, [language, setLanguage])
}
