import type { ApiError } from '@joutio/client-domain/api-types'

// Expo SDK 58 installe expo/fetch globalement. Son encodeur multipart refuse
// les pièces RN { uri, name, type }. Le transport XHR de whatwg-fetch garde
// ces fichiers locaux et laisse le réseau natif construire le multipart.
const { fetch: multipartFetch } = require('whatwg-fetch') as { fetch: typeof globalThis.fetch }

interface ApiClientConfig {
  baseUrl: string
  defaultHeaders?: Record<string, string>
  onError?: (error: ApiError) => void
  getAuthToken?: () => string | null
  onUnauthorized?: () => Promise<boolean>
  /** 401 encore après un renouvellement réussi : le token n'est pas accepté, la session doit finir. */
  onRejectedAfterRefresh?: () => void
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined>
  body?: unknown
  absolute?: boolean
}

function buildUrl(baseUrl: string, path: string, params?: RequestOptions['params']): string {
  const root = baseUrl.replace(/\/$/, '')
  let url = path.startsWith('http') ? path : `${root}${path}`
  if (params) {
    const search = Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&')
    if (search) url += `${url.includes('?') ? '&' : '?'}${search}`
  }
  return url
}

/**
 * Client fetch typé (React Native) : base URL, JSON, erreur centralisée, Bearer token.
 * Volontairement sans `URL`/`URLSearchParams` (support RN hétérogène).
 */
export function createApiClient(clientConfig: ApiClientConfig) {
  const { baseUrl, defaultHeaders = {}, onError, getAuthToken, onUnauthorized, onRejectedAfterRefresh } = clientConfig

  async function request<T>(method: string, path: string, options: RequestOptions = {}, retried = false): Promise<T> {
    const { params, body, headers: reqHeaders, absolute, ...fetchOptions } = options
    const url = buildUrl(baseUrl, path, params)
    void absolute

    const multipart = body instanceof FormData
    const headers: Record<string, string> = {
      ...(multipart ? {} : { 'Content-Type': 'application/json' }),
      ...defaultHeaders,
      ...(reqHeaders as Record<string, string> | undefined),
    }
    const token = getAuthToken?.()
    if (token) headers['Authorization'] = `Bearer ${token}`

    const transport = multipart ? multipartFetch : fetch
    const response = await transport(url, {
      method,
      headers,
      body: multipart ? body : body !== undefined ? JSON.stringify(body) : undefined,
      ...fetchOptions,
    })

    if (!response.ok) {
      if (response.status === 401 && !retried && onUnauthorized) {
        const refreshed = await onUnauthorized()
        if (refreshed) {
          return request<T>(method, path, options, true)
        }
      }
      if (response.status === 401 && retried) onRejectedAfterRefresh?.()
      const error: ApiError = await response.json().catch(() => ({
        message: response.statusText,
        statusCode: response.status,
      }))
      error.statusCode = error.statusCode ?? response.status
      onError?.(error)
      throw error
    }

    if (response.status === 204) return undefined as T
    const text = await response.text()
    if (!text) return undefined as T
    return JSON.parse(text) as T
  }

  return {
    get<T>(path: string, opts?: RequestOptions) {
      return request<T>('GET', path, opts)
    },
    post<T>(path: string, body?: unknown, opts?: RequestOptions) {
      return request<T>('POST', path, { ...opts, body })
    },
    put<T>(path: string, body?: unknown, opts?: RequestOptions) {
      return request<T>('PUT', path, { ...opts, body })
    },
    patch<T>(path: string, body?: unknown, opts?: RequestOptions) {
      return request<T>('PATCH', path, { ...opts, body })
    },
    delete<T>(path: string, opts?: RequestOptions) {
      return request<T>('DELETE', path, opts)
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
