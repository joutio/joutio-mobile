import { BIRTH_DATE_PROBLEMS, birthDateIssue, isoDay } from '@joutio/client-domain/profile'
import { normalizeReferralCode } from '@joutio/client-domain/share'
import { useState } from 'react'
import { Linking, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, CakeIcon, Field, GiftIcon, Notice, ProhibitIcon, Text, toast, tokens, useTheme } from '@/design-system'
import { useLogout } from '@/features/auth'
import { useApplyReferral, useSetBirthDate } from '@/features/me'
import { BirthDatePicker } from '@/shared/components/birth-date-picker'
import { usePendingReferral } from '@/shared/stores/pending-referral-store'

const SUPPORT = 'mailto:contact@joutio.com'

function TooYoung() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const logout = useLogout()
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
      <Notice
        tone="error"
        icon={ProhibitIcon}
        title="Joutio est réservé aux 15 ans et plus"
        message="Ton compte n'a pas été activé. Tu pourras revenir quand tu auras l'âge requis."
      />
      <Text color="muted">Une erreur de saisie ? Écris au support.</Text>
      <View style={{ gap: tokens.space[3] }}>
        <Button full variant="gray" tone="neutral" onPress={() => Linking.openURL(SUPPORT).catch(() => undefined)}>
          Contacter le support
        </Button>
        <Button full variant="plain" tone="neutral" loading={logout.isPending} onPress={() => logout.mutate()}>
          Se déconnecter
        </Button>
      </View>
    </View>
  )
}

/**
 * Date de naissance (`onboarding.md`, 2026-11-13) : demandée une fois après la connexion aux comptes récents
 * (`MeView.birthDateRequired`), avant la personnalisation, même arrivé par un lien de salon. Code de parrainage
 * pré-rempli (lien d'invitation, Install Referrer) ou saisi. Moins de 15 ans : écran de blocage.
 */
export function BirthDateScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const save = useSetBirthDate()
  const applyReferral = useApplyReferral()
  const pending = usePendingReferral((state) => state.code)
  const clearPending = usePendingReferral((state) => state.clear)
  const [birthDate, setBirthDate] = useState<string | null>(null)
  const [code, setCode] = useState(pending ?? '')
  const [codeOpen, setCodeOpen] = useState(pending !== null)
  const [tooYoung, setTooYoung] = useState(false)
  const issue = birthDate ? birthDateIssue(birthDate, isoDay(new Date())) : 'missing'

  if (tooYoung) return <TooYoung />

  const submit = () => {
    if (!birthDate) return
    if (issue === 'underage') {
      setTooYoung(true)
      return
    }
    save.mutate(birthDate, {
      onSuccess: () => {
        const referral = normalizeReferralCode(code)
        clearPending()
        if (referral) applyReferral.mutate(referral, { onError: () => toast.error("Ce code de parrainage n'a pas pu être appliqué") })
      },
      onError: (error) => {
        const type = (error as { type?: string } | null)?.type
        if (type === BIRTH_DATE_PROBLEMS.underage) setTooYoung(true)
        else toast.error("La date n'a pas été enregistrée", { description: 'Vérifie ta connexion, puis réessaie.' })
      },
    })
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: tokens.space[6], padding: tokens.space[5], paddingTop: tokens.space[7] }}
      >
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
            <CakeIcon size={28} weight="fill" color={colors.onAccent} />
          </View>
          <Text variant="title1" accessibilityRole="header">
            Quelle est ta date de naissance ?
          </Text>
          <Text color="muted">Joutio est réservé aux 15 ans et plus. Ta date reste privée : elle ne s'affiche jamais sur ton profil.</Text>
        </View>
        <BirthDatePicker value={birthDate} onChange={setBirthDate} />
        {codeOpen ? (
          <View style={{ gap: tokens.space[3], padding: tokens.space[4], borderRadius: tokens.radius.lg, backgroundColor: colors.surface }}>
            {pending && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] }}>
                <GiftIcon size={20} weight="fill" color={colors.accentInk} />
                <Text variant="headline">Invité par un ami</Text>
              </View>
            )}
            <Field
              label="Code de parrainage"
              value={code}
              maxLength={8}
              hint="Facultatif. Tu suivras ton parrain dès ton arrivée."
              autoCapitalize="characters"
              autoCorrect={false}
              onChangeText={(value) => setCode(value.toUpperCase())}
              onClear={() => setCode('')}
            />
          </View>
        ) : (
          <Button variant="plain" onPress={() => setCodeOpen(true)}>
            J'ai un code de parrainage
          </Button>
        )}
      </ScrollView>
      <View style={{ paddingHorizontal: tokens.space[5], paddingTop: tokens.space[3], paddingBottom: insets.bottom + tokens.space[5] }}>
        <Button full disabled={!birthDate || (issue !== null && issue !== 'underage')} loading={save.isPending} onPress={submit}>
          Continuer
        </Button>
      </View>
    </View>
  )
}
