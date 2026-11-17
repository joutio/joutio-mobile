import { getLocales } from 'expo-localization'
import { useCallback } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Language } from '@joutio/client/api-types'
import { isMessageKey, languageOf, translate, type MessageKey, type MessageValues } from '@joutio/client/i18n'
import { safeStorage } from '@/design-system/theme/theme-store'

/**
 * Textes de l'app, en français et en anglais. Dictionnaires et `translate` partagés avec le web dans
 * `@joutio/client/i18n` (ADR 0002). Langue : celle de l'appareil avant la connexion, puis `MeView.language`
 * (`useLanguageSync`), mémorisée pour le lancement suivant.
 */
export { translate, type MessageKey, type MessageValues }

/** Langue de l'appareil (`fr-FR` → `fr`), le français si elle n'est pas prise en charge. */
export function deviceLanguage(): Language {
  try {
    return languageOf(getLocales()[0]?.languageTag)
  } catch {
    return 'fr'
  }
}

export const useLanguageStore = create<{ language: Language; setLanguage: (language: Language) => void }>()(
  persist(
    (set) => ({
      language: deviceLanguage(),
      setLanguage: (language) => set({ language }),
    }),
    { name: 'joutio.language', storage: createJSONStorage(() => safeStorage), partialize: ({ language }) => ({ language }) },
  ),
)

/** Langue courante, hors React (services, toasts). */
export const currentLanguage = () => useLanguageStore.getState().language

/** `t('clé', { valeur })` hors React, dans la langue courante. */
export const t = (key: MessageKey, values?: MessageValues) => translate(currentLanguage(), key, values)

/** Message d'erreur d'un schéma de `@joutio/client/forms` (une clé i18n), traduit ; rien si absent. */
export const formError = (message: string | undefined) => (message && isMessageKey(message) ? t(message) : undefined)

/** Langue courante. */
export const useLanguage = () => useLanguageStore((state) => state.language)

/** `t('clé', { valeur })` dans la langue courante ; le composant suit les changements de langue. */
export function useT() {
  const language = useLanguage()
  return useCallback((key: MessageKey, values?: MessageValues) => translate(language, key, values), [language])
}
