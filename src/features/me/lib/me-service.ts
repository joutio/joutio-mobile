import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import type { MeView } from '@joutio/client-domain/api-types'

export const meService = {
  get: (): Promise<MeView> => api.get<MeView>(ENDPOINTS.me),
}
