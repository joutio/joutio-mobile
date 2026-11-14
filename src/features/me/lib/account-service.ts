import { api } from '@/lib/api'

const ENDPOINTS = { birthDate: '/api/me/birth-date' } as const

/** Données de compte portées par `joutio-identity` : date de naissance privée. */
export const accountService = {
  setBirthDate: (birthDate: string) => api.put<void>(ENDPOINTS.birthDate, { birthDate }),
}
