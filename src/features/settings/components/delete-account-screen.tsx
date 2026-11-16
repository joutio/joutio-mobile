import { router } from '@/shared/navigation/router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Notice, Button, CheckCircleIcon, CodeInput, EmptyState, MobileTopBar, Screen, Text, tokens, WarningIcon } from '@/design-system'
import { useLogout } from '@/features/auth'
import { useMe } from '@/features/me'
import { useDeleteAccount, useMyBadges, useRequestDeletionCode } from '@/features/profile/hooks/use-profile'
import { useMyTitles } from '@/features/topic/hooks/use-topic'
import { formatNumber, tierLabel } from '@/features/topic/lib/format'
import { tierOf } from '@/shared/utils/tier'
import { useT } from '@/lib/i18n'

const CODE_LENGTH = 6

/**
 * Supprimer mon compte (`reglages.md` § 3) : ce que le joueur perd, puis le code reçu par e-mail. La suppression est
 * immédiate et définitive ; la confirmation ramène à la connexion.
 */
export function DeleteAccountScreen() {
  const t = useT()
  const me = useMe(true)
  const badges = useMyBadges()
  const titles = useMyTitles()
  const request = useRequestDeletionCode()
  const remove = useDeleteAccount()
  const logout = useLogout()
  const [code, setCode] = useState('')
  const data = me.data

  useEffect(() => {
    request.mutate()
    // Un seul code à l'ouverture ; « Renvoyer le code » en redemande un.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rating = data?.progression?.rating
  const rank =
    data?.progression && rating !== undefined ? t('deletion.rank', { tier: tierLabel(tierOf(rating)), rating: formatNumber(rating) }) : ''
  const summary = t('deletion.summary', { rank, badges: badges.data?.earnedCount ?? 0, titles: titles.data?.titles.length ?? 0 })

  if (remove.isSuccess) {
    return (
      <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center', padding: tokens.space[5] }}>
        <EmptyState
          icon={CheckCircleIcon}
          title={t('deletion.done')}
          description={t('deletion.doneText')}
          action={
            <Button style={{ alignSelf: 'center' }} loading={logout.isPending} onPress={() => logout.mutate()}>
              {t('deletion.finish')}
            </Button>
          }
        />
      </Screen>
    )
  }

  return (
    <Screen
      header={<MobileTopBar variant="inline" back={t('profile.settings')} onBack={() => router.back()} title={t('deletion.title')} />}
      contentStyle={{ flexGrow: 1, gap: tokens.space[6], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[4], paddingBottom: tokens.space[5] }}
      scrollProps={{ keyboardShouldPersistTaps: 'handled' }}
    >
      <Notice tone="error" title={t('deletion.warning')} message={summary} icon={WarningIcon} />
      <View style={{ gap: tokens.space[4] }}>
        <Text variant="callout" color="muted">
          {t('deletion.games')}
        </Text>
        <Text variant="callout" color="muted">
          {t('mobile.settings.deletePremium')}
        </Text>
      </View>
      <View style={{ gap: tokens.space[3] }}>
        <Text variant="callout" weight="600">
          {request.isError ? t('onboarding.login.sendError') : t('deletion.codeSent', { email: data?.email ?? t('settings.yourAddress') })}
        </Text>
        <CodeInput autoFocus value={code} length={CODE_LENGTH} error={remove.isError} label={t('deletion.codeLabel')} onChange={setCode} />
        {remove.isError && (
          <Text variant="caption" color="wrong">
            {t('deletion.wrongCode')}
          </Text>
        )}
        <Button variant="plain" size="S" style={{ alignSelf: 'flex-start' }} loading={request.isPending} onPress={() => request.mutate()}>
          {t('onboarding.code.resend')}
        </Button>
      </View>
      <View style={{ marginTop: 'auto', gap: tokens.space[3] }}>
        <Button full variant="filled" tone="destructive" disabled={code.length < CODE_LENGTH} loading={remove.isPending} onPress={() => remove.mutate(code)}>
          {t('deletion.confirm')}
        </Button>
        <Button full variant="plain" tone="neutral" onPress={() => router.back()}>
          {t('deletion.keep')}
        </Button>
      </View>
    </Screen>
  )
}
