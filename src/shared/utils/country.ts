const COUNTRIES: Record<string, string> = {
  FR: 'France',
  BE: 'Belgique',
  CH: 'Suisse',
  CA: 'Canada',
  SN: 'Sénégal',
  JP: 'Japon',
  US: 'États-Unis',
  GB: 'Royaume-Uni',
  DE: 'Allemagne',
  ES: 'Espagne',
  IT: 'Italie',
}

/**
 * Libellé pays localisé depuis un code ISO-3166 alpha-2 (`Intl.DisplayNames`, repli table française puis code brut).
 * Hermes n'expose pas toujours `DisplayNames` : le repli garantit un libellé lisible.
 */
export function countryLabel(code?: string | null, locale = 'fr-FR'): string {
  if (!code) return ''
  const normalized = code.toUpperCase()
  try {
    const label = new Intl.DisplayNames([locale], { type: 'region' }).of(normalized)
    return label ?? COUNTRIES[normalized] ?? normalized
  } catch {
    return COUNTRIES[normalized] ?? normalized
  }
}

/** Pays proposés dans Réglages › Pays (liste du lab, `design/src/lab/fixtures/profile.ts`). */
export const COUNTRY_CODES = [
  'DZ',
  'DE',
  'BE',
  'BJ',
  'BF',
  'CM',
  'CA',
  'KM',
  'CI',
  'ES',
  'US',
  'FR',
  'GA',
  'GN',
  'HT',
  'IT',
  'LB',
  'LU',
  'MG',
  'ML',
  'MA',
  'MR',
  'MC',
  'NE',
  'PT',
  'GB',
  'SN',
  'CH',
  'TG',
  'TN',
] as const

/** Drapeau en emoji, rendu par le système sur iOS et Android. */
export const countryFlag = (code: string) => String.fromCodePoint(...[...code.toUpperCase()].map((letter) => 0x1f1a5 + letter.charCodeAt(0)))
