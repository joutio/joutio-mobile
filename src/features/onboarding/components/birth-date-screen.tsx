import { BIRTH_DATE_PROBLEMS, birthDateIssue, isoDay } from '@joutio/client-domain/profile'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, CakeIcon, Notice, ProhibitIcon, Text, toast, tokens, useTheme } from '@/design-system'
import { useSetBirthDate } from '@/features/me'
import { BirthDatePicker } from '@/shared/components/birth-date-picker'

/**
 * Date de naissance (`onboarding.md`, 2026-11-13) : demandée une fois après la connexion aux comptes récents
 * (`MeView.birthDateRequired`), avant la personnalisation, même arrivé par un lien de salon. Une date sous 15 ans affiche la carte « réservé aux 15 ans et plus » sous le champ et
 * garde « Continuer » désactivé (plus d'écran de blocage).
 */
export function BirthDateScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const save = useSetBirthDate()
  const [birthDate, setBirthDate] = useState<string | null>(null)
  // Refus du serveur (`PUT /api/me/birth-date` sous 15 ans) : même carte que la saisie locale.
  const [refused, setRefused] = useState(false)
  const issue = birthDate ? birthDateIssue(birthDate, isoDay(new Date())) : 'missing'
  const tooYoung = issue === 'underage' || refused
  const submit = () => {
    if (!birthDate || tooYoung) return
    save.mutate(birthDate, {
      onError: (error) => {
        const type = (error as { type?: string } | null)?.type
        if (type === BIRTH_DATE_PROBLEMS.underage) setRefused(true)
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
        <BirthDatePicker
          value={birthDate}
          onChange={(value) => {
            setBirthDate(value)
            setRefused(false)
          }}
        />
        {tooYoung && (
          <Notice
            tone="error"
            icon={ProhibitIcon}
            title="Joutio est réservé aux 15 ans et plus"
            message="Ton compte n'a pas été activé. Tu pourras revenir quand tu auras l'âge requis."
          />
        )}
      </ScrollView>
      <View style={{ paddingHorizontal: tokens.space[5], paddingTop: tokens.space[3], paddingBottom: insets.bottom + tokens.space[5] }}>
        <Button full disabled={!birthDate || tooYoung || issue !== null} loading={save.isPending} onPress={submit}>
          Continuer
        </Button>
      </View>
    </View>
  )
}
