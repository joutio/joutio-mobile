import { Linking } from 'react-native'
import { Text } from '@/design-system'
import { config } from '@/lib/config'

/** Mention légale sous la connexion : liens vers le site public. */
export function LegalNotice() {
  const open = (path: string) => () => {
    Linking.openURL(`${config.siteUrl}${path}`).catch(() => undefined)
  }
  return (
    <Text variant="caption" color="muted" align="center">
      En continuant, tu acceptes les{' '}
      <Text variant="caption" color="muted" accessibilityRole="link" onPress={open('/terms')} style={{ textDecorationLine: 'underline' }}>
        conditions d'utilisation
      </Text>{' '}
      et la{' '}
      <Text variant="caption" color="muted" accessibilityRole="link" onPress={open('/privacy')} style={{ textDecorationLine: 'underline' }}>
        politique de confidentialité
      </Text>
      .
    </Text>
  )
}
