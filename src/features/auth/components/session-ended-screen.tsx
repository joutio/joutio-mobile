import { useState } from 'react'
import { Linking, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Notice, Button, ClockIcon, ProhibitIcon, Text, tokens, useTheme } from '@/design-system'
import type { SessionEndReason, SuspensionInfo } from '@/shared/types/session'
import type { Language } from '@joutio/client/core/types'
import { formatDate, isMessageKey, translate, useLanguage, useT } from '@/lib/i18n'

const SUPPORT = 'mailto:contact@joutio.com'

/** Motif de suspension (`UserSuspensionReason` d'identity) en toutes lettres ; un code inconnu n'affiche aucun motif. */
function reasonLabel(language: Language, reason: string | null | undefined): string | undefined {
  const key = `onboarding.ended.reason.${reason}`
  return reason && isMessageKey(key) ? translate(language, key) : undefined
}

/** « dans 7 jours », « dans 5 heures » : le plus grand pas entier, jamais zéro. */
function remainingLabel(language: Language, until: Date, now: number): string {
  const formatter = new Intl.RelativeTimeFormat(language, { numeric: 'auto' })
  const minutes = Math.max(1, Math.round((until.getTime() - now) / 60_000))
  if (minutes < 60) return formatter.format(minutes, 'minute')
  if (minutes < 24 * 60) return formatter.format(Math.round(minutes / 60), 'hour')
  return formatter.format(Math.round(minutes / (24 * 60)), 'day')
}

/** Phrase de la suspension : fin annoncée (ou définitive) puis motif ; la note de modération reste privée. */
function suspensionMessage(language: Language, suspension: SuspensionInfo | null | undefined, now: number): string {
  const until = suspension?.until ? new Date(suspension.until) : null
  const valid = until && !Number.isNaN(until.getTime()) && until.getTime() > now ? until : null
  const end = valid
    ? translate(language, 'mobile.suspension.until', {
        date: formatDate(valid, language, { day: 'numeric', month: 'long', year: 'numeric' }),
        remaining: remainingLabel(language, valid, now),
      })
    : translate(language, 'mobile.suspension.permanent')
  const reason = reasonLabel(language, suspension?.reason)
  return reason ? `${end} ${translate(language, 'onboarding.ended.reasonLine', { reason })}` : end
}

/**
 * Session coupée : plein écran, sans navigation. Une suspension annonce sa fin (`suspendedUntil` du `403`, absent :
 * définitive) et son motif (`suspensionReason`).
 */
export function SessionEndedScreen({ reason, suspension, onLogin }: { reason: SessionEndReason; suspension?: SuspensionInfo | null; onLogin: () => void }) {
  const t = useT()
  const language = useLanguage()
  const [now] = useState(() => Date.now())
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const suspended = reason === 'suspended'
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        gap: tokens.space[5],
        paddingHorizontal: tokens.space[5],
        paddingTop: insets.top + tokens.space[7],
        paddingBottom: insets.bottom + tokens.space[6],
        backgroundColor: colors.bg,
      }}
    >
      {suspended ? (
        <>
          <Notice tone="error" icon={ProhibitIcon} title={t('onboarding.ended.suspendedTitle')} message={suspensionMessage(language, suspension, now)} />
          <Text color="muted">{t('onboarding.ended.suspendedBody')}</Text>
          <View style={{ gap: tokens.space[3] }}>
            <Button full variant="gray" tone="neutral" onPress={() => Linking.openURL(SUPPORT).catch(() => undefined)}>
              {t('tooYoung.support')}
            </Button>
            <Button full variant="plain" tone="neutral" onPress={onLogin}>
              {t('onboarding.ended.logout')}
            </Button>
          </View>
        </>
      ) : (
        <>
          <Notice tone="info" icon={ClockIcon} title={t('onboarding.ended.expiredTitle')} message={t('onboarding.ended.expiredMessage')} />
          <Button full onPress={onLogin}>
            {t('onboarding.ended.relogin')}
          </Button>
        </>
      )}
    </View>
  )
}
