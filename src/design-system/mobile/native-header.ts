import type { NativeStackNavigationOptions } from 'expo-router'
import { Platform } from 'react-native'
import { fontFace } from '../theme/fonts'
import type { Theme } from '../theme/theme-provider'

/**
 * Options d'en-tête **natif** (`native-stack`), teintées par les tokens : polices Geist, retour et actions en
 * `accentInk`. iOS : en-tête translucide du système (Liquid Glass, flou), grand titre sur les racines.
 * Android : barre Material au fond de l'écran, sans ombre.
 */
export function nativeHeaderOptions({ colors, scheme }: Theme): NativeStackNavigationOptions {
  return {
    headerShown: true,
    headerTintColor: colors.accentInk,
    headerTitleStyle: { fontFamily: fontFace('Geist', '600'), color: colors.text },
    headerLargeTitleStyle: { fontFamily: fontFace('Geist', '700'), color: colors.text },
    headerBackTitleStyle: { fontFamily: fontFace('Geist', '400') },
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerUserInterfaceStyle: scheme,
    ...(Platform.OS === 'android' ? { headerStyle: { backgroundColor: colors.bg } } : null),
    contentStyle: { backgroundColor: colors.bg },
  }
}

/** Racine d'un parcours (onglet, catalogue) : grand titre iOS qui se replie au défilement. */
export const largeTitleOptions: NativeStackNavigationOptions = { headerLargeTitleEnabled: true }
