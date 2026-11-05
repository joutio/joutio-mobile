import { View, type StyleProp, type ViewStyle } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { CheckIcon, CopyIcon } from '../icons'
import { Button } from '../primitives/button'
import { Text } from '../primitives/text'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'

export interface InviteCardProps {
  /** Lien complet du salon ; affiché sans protocole, encodé dans le QR code. */
  url: string
  copied?: boolean
  onCopy?: () => void
  style?: StyleProp<ViewStyle>
}

/** QR code et lien de partage d'un salon privé. */
export function InviteCard({ url, copied = false, onCopy, style }: InviteCardProps) {
  const { colors, radius } = useTheme()
  const shown = url.replace(/^https?:\/\//, '')
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.space[5],
          padding: tokens.space[5],
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
        },
        style,
      ]}
    >
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`QR code de ${shown}`}
        style={{ padding: tokens.space[3], borderRadius: radius.md, backgroundColor: '#FFFFFF' }}
      >
        <QRCode value={url} size={96} color="#000000" backgroundColor="#FFFFFF" />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: tokens.space[3] }}>
        <Text variant="caption" color="muted" mono numberOfLines={1}>
          {shown}
        </Text>
        <Button variant="gray" tone="neutral" size="S" full icon={copied ? CheckIcon : CopyIcon} onPress={onCopy}>
          {copied ? 'Lien copié' : 'Copier le lien'}
        </Button>
      </View>
    </View>
  )
}
