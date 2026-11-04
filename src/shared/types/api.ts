/** Erreur HTTP normalisée (ProblemDetail RFC 7807 du BFF). */
export interface ApiError {
  message: string
  statusCode?: number
  title?: string
  detail?: string
  /** URI du problème (ex. `urn:joutio:authorization:accountSuspended`). */
  type?: string
}
