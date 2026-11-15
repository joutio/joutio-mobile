import { api } from '@/lib/api'

const ENDPOINTS = { birthDate: '/api/me/birth-date', terms: '/api/me/terms' } as const

/** Données de compte portées par `joutio-identity` : date de naissance privée. */
export const accountService = {
  setBirthDate: (birthDate: string) => api.put<void>(ENDPOINTS.birthDate, { birthDate }),
  acceptTerms: (version: string) => api.put<void>(ENDPOINTS.terms, { version }),
}
