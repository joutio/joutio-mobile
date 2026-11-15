import { Linking } from 'react-native'
import { Text } from '@/design-system'
import { config } from '@/lib/config'
import { useT } from '@/lib/i18n'

/** Mention légale sous la connexion : liens vers le site public. */
export function LegalNotice() {
  const t = useT()
  const open = (path: string) => () => {
    Linking.openURL(`${config.siteUrl}${path}`).catch(() => undefined)
  }
  return (
    <Text variant="caption" color="muted" align="center">
      {t('onboarding.login.legalBefore')}{' '}
      <Text variant="caption" color="muted" accessibilityRole="link" onPress={open('/terms')} style={{ textDecorationLine: 'underline' }}>
        {t('onboarding.login.terms')}
      </Text>{' '}
      {t('onboarding.login.legalBetween')}{' '}
      <Text variant="caption" color="muted" accessibilityRole="link" onPress={open('/privacy')} style={{ textDecorationLine: 'underline' }}>
        {t('onboarding.login.privacy')}
      </Text>
      .
    </Text>
  )
}
