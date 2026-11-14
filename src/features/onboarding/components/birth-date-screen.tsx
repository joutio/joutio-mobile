import { BIRTH_DATE_PROBLEMS, birthDateIssue, isoDay } from '@joutio/client-domain/profile'
import { useState } from 'react'
import { Linking, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, CakeIcon, Notice, ProhibitIcon, Text, toast, tokens, useTheme } from '@/design-system'
import { useLogout } from '@/features/auth'
import { useSetBirthDate } from '@/features/me'
import { BirthDatePicker } from '@/shared/components/birth-date-picker'

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
 * (`MeView.birthDateRequired`), avant la personnalisation, même arrivé par un lien de salon. Moins de 15 ans : écran de blocage.
 */
export function BirthDateScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const save = useSetBirthDate()
  const [birthDate, setBirthDate] = useState<string | null>(null)
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
      </ScrollView>
      <View style={{ paddingHorizontal: tokens.space[5], paddingTop: tokens.space[3], paddingBottom: insets.bottom + tokens.space[5] }}>
        <Button full disabled={!birthDate || (issue !== null && issue !== 'underage')} loading={save.isPending} onPress={submit}>
          Continuer
        </Button>
      </View>
    </View>
  )
}
