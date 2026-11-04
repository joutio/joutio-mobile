import { View, type StyleProp, type ViewStyle } from 'react-native'
import LogoMark from '../../../assets/brand/logo-mark.svg'
import { Text, typeStyle } from '../primitives/text'

export interface LogoProps {
  variant?: 'mark' | 'lockup'
  /** Hauteur en pt. */
  size?: number
  style?: StyleProp<ViewStyle>
}

/** Logo Joutio. Le mot-symbole est du texte : il suit le thème. */
export function Logo({ variant = 'mark', size = 32, style }: LogoProps) {
  const mark = <LogoMark width={size} height={size} accessibilityLabel={variant === 'mark' ? 'Joutio' : undefined} />
  if (variant === 'mark') return <View style={style}>{mark}</View>
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Joutio"
      style={[{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: size * 0.24 }, style]}
    >
      {mark}
      <Text style={[typeStyle('body', { weight: '700' }), { fontSize: size * 0.64, lineHeight: size * 0.64 * 1.15, letterSpacing: -size * 0.64 * 0.025 }]}>
        joutio
      </Text>
    </View>
  )
}
