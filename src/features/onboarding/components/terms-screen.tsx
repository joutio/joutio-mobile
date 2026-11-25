import { Linking, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, ScrollIcon, Text, toast, tokens, useTheme } from '@/design-system'
import { useAcceptTerms, useMe } from '@joutio/client/me'
import { config } from '@/lib/config'
import { useT } from '@/lib/i18n'

/**
 * Acceptation des CGU (2026-11-15) : présentée avant de jouer tant que la version en vigueur (`MeView.termsVersion`)
 * n'est pas acceptée, à la première connexion comme à chaque nouvelle version. L'acceptation est conservée dans
 * identity (preuve du consentement).
 */
export function TermsScreen() {
  const t = useT()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const me = useMe()
  const accept = useAcceptTerms()
  const version = me.data?.termsVersion ?? ''
  const open = (path: string) => () => {
    Linking.openURL(`${config.siteUrl}${path}`).catch(() => undefined)
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: tokens.space[6], padding: tokens.space[5], paddingTop: tokens.space[7] }}>
        <View style={{ gap: tokens.space[3] }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: tokens.radius.lg,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ rotate: '-6deg' }],
            }}
          >
            <ScrollIcon size={28} weight="fill" color={colors.onAccent} />
          </View>
          <Text variant="title1" accessibilityRole="header">
            {t('terms.title')}
          </Text>
          <Text color="muted">{t('terms.text')}</Text>
          {!!version && (
            <Text variant="caption" color="muted">
              {t('terms.version', { version })}
            </Text>
          )}
        </View>
        <View style={{ gap: tokens.space[3] }}>
          <Text variant="callout" accessibilityRole="link" onPress={open('/terms')} style={{ textDecorationLine: 'underline' }}>
            {t('terms.read')}
          </Text>
          <Text variant="callout" accessibilityRole="link" onPress={open('/privacy')} style={{ textDecorationLine: 'underline' }}>
            {t('terms.privacy')}
          </Text>
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: tokens.space[5], paddingTop: tokens.space[3], paddingBottom: insets.bottom + tokens.space[5] }}>
        <Button
          full
          disabled={!version}
          loading={accept.isPending}
          onPress={() => accept.mutate(version, { onError: () => toast.error(t('terms.error'), { description: t('home.errorText') }) })}
        >
          {t('terms.accept')}
        </Button>
      </View>
    </View>
  )
}
