import type { ReactNode } from 'react'
import { View } from 'react-native'
import { Segmented, Text, tokens, useThemeStore, type ThemePreference } from '@/design-system'

/** Exemple légendé, comme une case de matrice du lab. */
export function Specimen({ label, children, row = false }: { label: string; children: ReactNode; row?: boolean }) {
  return (
    <View style={{ gap: tokens.space[3] }}>
      <Text variant="caption" color="muted" weight="600">
        {label}
      </Text>
      <View style={row ? { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.space[4] } : { gap: tokens.space[4] }}>{children}</View>
    </View>
  )
}

const THEMES = [
  { value: 'system', label: 'Système' },
  { value: 'dark', label: 'Sombre' },
  { value: 'light', label: 'Clair' },
] as const

export function ThemeSwitch() {
  const preference = useThemeStore((state) => state.preference)
  const setPreference = useThemeStore((state) => state.setPreference)
  return <Segmented<ThemePreference> label="Thème" options={THEMES} value={preference} onChange={setPreference} />
}

export const SAMPLE_IMAGE = require('../../../assets/topics/olympia.jpg') as number
export const SAMPLE_BANNER = require('../../../assets/topics/karnak.jpg') as number
