import { zodResolver } from '@hookform/resolvers/zod'
import { birthDateSchema } from '@joutio/client/forms'
import { BIRTH_DATE_PROBLEMS, isoDay } from '@joutio/client/profile'
import { Controller, useForm } from 'react-hook-form'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, CakeIcon, Notice, ProhibitIcon, Text, toast, tokens, useTheme } from '@/design-system'
import { useSetBirthDate } from '@/features/me'
import { BirthDatePicker } from '@/shared/components/birth-date-picker'
import { useT } from '@/lib/i18n'

/**
 * Date de naissance (`onboarding.md`, 2026-11-13) : demandée une fois après la connexion aux comptes récents
 * (`MeView.birthDateRequired`), avant la personnalisation, même arrivé par un lien de salon. Une date sous 15 ans affiche la carte « réservé aux 15 ans et plus » sous le champ et
 * garde « Continuer » désactivé (plus d'écran de blocage).
 */
export function BirthDateScreen() {
  const t = useT()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const save = useSetBirthDate()
  const form = useForm({ resolver: zodResolver(birthDateSchema(isoDay(new Date()))), mode: 'onChange', defaultValues: { birthDate: '' } })
  // Moins de 15 ans, saisi ou refusé par le serveur (`PUT /api/me/birth-date`) : même carte.
  const tooYoung = form.formState.errors.birthDate?.message === 'tooYoung.title'
  const submit = form.handleSubmit(({ birthDate }) =>
    save.mutate(birthDate, {
      onError: (error) => {
        const type = (error as { type?: string } | null)?.type
        if (type === BIRTH_DATE_PROBLEMS.underage) form.setError('birthDate', { message: 'tooYoung.title' })
        else toast.error(t('mobile.onboarding.birthFailed'), { description: t('home.errorText') })
      },
    }),
  )

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
            {t('birth.title')}
          </Text>
          <Text color="muted">{t('birth.text')}</Text>
        </View>
        <Controller
          control={form.control}
          name="birthDate"
          render={({ field }) => <BirthDatePicker value={field.value || null} onChange={(value) => field.onChange(value ?? '')} />}
        />
        {tooYoung && (
          <Notice
            tone="error"
            icon={ProhibitIcon}
            title={t('tooYoung.title')}
            message={t('tooYoung.message')}
          />
        )}
      </ScrollView>
      <View style={{ paddingHorizontal: tokens.space[5], paddingTop: tokens.space[3], paddingBottom: insets.bottom + tokens.space[5] }}>
        <Button full disabled={!form.formState.isValid} loading={save.isPending} onPress={() => void submit()}>
          {t('onboarding.universes.continue')}
        </Button>
      </View>
    </View>
  )
}
