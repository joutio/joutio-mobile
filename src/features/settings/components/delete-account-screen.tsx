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

const CODE_LENGTH = 6

/**
 * Supprimer mon compte (`reglages.md` § 3) : ce que le joueur perd, puis le code reçu par e-mail. La suppression est
 * immédiate et définitive ; la confirmation ramène à la connexion.
 */
export function DeleteAccountScreen() {
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
    data?.progression && !data.progression.provisional && rating !== undefined ? `ton Elo ${tierLabel(tierOf(rating))} ${formatNumber(rating)}, ` : ''
  const summary = `Ton profil, ${rank}tes ${badges.data?.earnedCount ?? 0} badges et ${titles.data?.titles.length ?? 0} titres disparaissent.`

  if (remove.isSuccess) {
    return (
      <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center', padding: tokens.space[5] }}>
        <EmptyState
          icon={CheckCircleIcon}
          title="Compte supprimé"
          description="Tes données ont été effacées. À bientôt sur Joutio."
          action={
            <Button style={{ alignSelf: 'center' }} loading={logout.isPending} onPress={() => logout.mutate()}>
              Terminer
            </Button>
          }
        />
      </Screen>
    )
  }

  return (
    <Screen
      header={<MobileTopBar variant="inline" back="Réglages" onBack={() => router.back()} title="Suppression" />}
      contentStyle={{ flexGrow: 1, gap: tokens.space[6], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[4], paddingBottom: tokens.space[5] }}
      scrollProps={{ keyboardShouldPersistTaps: 'handled' }}
    >
      <Notice tone="error" title="C'est immédiat et définitif" message={summary} icon={WarningIcon} />
      <View style={{ gap: tokens.space[4] }}>
        <Text variant="callout" color="muted">
          Tes parties restent chez tes adversaires sous « Joueur supprimé ».
        </Text>
        <Text variant="callout" color="muted">
          Ton abonnement Premium n'est pas résilié : fais-le depuis ton store.
        </Text>
      </View>
      <View style={{ gap: tokens.space[3] }}>
        <Text variant="callout" weight="600">
          {request.isError ? "Le code n'a pas pu être envoyé" : `Code envoyé à ${data?.email ?? 'ton adresse'}`}
        </Text>
        <CodeInput autoFocus value={code} length={CODE_LENGTH} error={remove.isError} label="Code de suppression" onChange={setCode} />
        {remove.isError && (
          <Text variant="caption" color="wrong">
            Code incorrect ou expiré.
          </Text>
        )}
        <Button variant="plain" size="S" style={{ alignSelf: 'flex-start' }} loading={request.isPending} onPress={() => request.mutate()}>
          Renvoyer le code
        </Button>
      </View>
      <View style={{ marginTop: 'auto', gap: tokens.space[3] }}>
        <Button full variant="filled" tone="destructive" disabled={code.length < CODE_LENGTH} loading={remove.isPending} onPress={() => remove.mutate(code)}>
          Supprimer définitivement
        </Button>
        <Button full variant="plain" tone="neutral" onPress={() => router.back()}>
          Garder mon compte
        </Button>
      </View>
    </Screen>
  )
}
