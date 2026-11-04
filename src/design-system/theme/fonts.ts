import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold, Geist_800ExtraBold } from '@expo-google-fonts/geist'
import { GeistMono_400Regular, GeistMono_500Medium, GeistMono_600SemiBold, GeistMono_700Bold } from '@expo-google-fonts/geist-mono'
import { useFonts } from 'expo-font'

/** Graisses utilisées par les tokens et les composants. */
export type FontWeight = '400' | '500' | '600' | '700' | '800'
export type FontFamily = 'Geist' | 'GeistMono'

const FACES: Record<FontFamily, Partial<Record<FontWeight, string>>> = {
  Geist: { '400': 'Geist_400Regular', '500': 'Geist_500Medium', '600': 'Geist_600SemiBold', '700': 'Geist_700Bold', '800': 'Geist_800ExtraBold' },
  GeistMono: { '400': 'GeistMono_400Regular', '500': 'GeistMono_500Medium', '600': 'GeistMono_600SemiBold', '700': 'GeistMono_700Bold' },
}

/**
 * Une police chargée par graisse : Android ne choisit pas la graisse d'une famille personnalisée avec
 * `fontWeight`. On retourne le nom de la face, sans `fontWeight` (sinon iOS applique un faux gras).
 */
export function fontFace(family: FontFamily, weight: FontWeight): string {
  const faces = FACES[family]
  return faces[weight] ?? faces['700'] ?? faces['400'] ?? family
}

export function useJoutioFonts(): boolean {
  const [loaded, error] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    Geist_800ExtraBold,
    GeistMono_400Regular,
    GeistMono_500Medium,
    GeistMono_600SemiBold,
    GeistMono_700Bold,
  })
  // Une police manquante ne bloque pas l'app : le système prend le relais.
  return loaded || error !== null
}
