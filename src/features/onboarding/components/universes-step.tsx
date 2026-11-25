import { router } from '@/shared/navigation/router'
import { useState } from 'react'
import { View } from 'react-native'
import { Notice, Button, CategoryTile, Text, tokens, type CategoryCode } from '@/design-system'
import { useUpdateInterests } from '@joutio/client/me'
import { MAX_UNIVERSES, useOnboardingStore } from '../onboarding-store'
import { Steps } from './steps'
import { useT } from '@/lib/i18n'

const UNIVERSES = Object.keys(tokens.category) as CategoryCode[]
const COLUMNS = 3

/** Univers : 1 à 3 choix ; au 3e, les autres se désactivent. « Passer » saute le premier thème. */
export function UniversesStep() {
  const t = useT()
  const selected = useOnboardingStore((state) => state.universes)
  const setUniverses = useOnboardingStore((state) => state.setUniverses)
  const setSkipped = useOnboardingStore((state) => state.setSkipped)
  const save = useUpdateInterests()
  const full = selected.length === MAX_UNIVERSES
  // Largeur mesurée : trois colonnes égales, y compris sur la dernière rangée incomplète.
  const [gridWidth, setGridWidth] = useState(0)
  const tileWidth = gridWidth > 0 ? (gridWidth - tokens.space[3] * (COLUMNS - 1)) / COLUMNS : undefined

  const rows = Array.from({ length: Math.ceil(UNIVERSES.length / COLUMNS) }, (_, row) => UNIVERSES.slice(row * COLUMNS, row * COLUMNS + COLUMNS))

  return (
    <Steps
      index={0}
      action={
        <Button
          variant="plain"
          tone="neutral"
          size="M"
          onPress={() => {
            setSkipped(true)
            router.push('/notifications')
          }}
        >
          {t('onboarding.universes.skip')}
        </Button>
      }
      footer={
        <View style={{ gap: tokens.space[3] }}>
          {save.isError && <Notice title={t('onboarding.universes.saveError')} message={t('common.checkConnection')} />}
          <Button
            full
            disabled={selected.length === 0}
            loading={save.isPending}
            onPress={() =>
              save.mutate(selected, {
                onSuccess: () => {
                  setSkipped(false)
                  router.push('/notifications')
                },
              })
            }
          >
            {selected.length > 0 ? t('onboarding.universes.count', { count: selected.length, max: MAX_UNIVERSES }) : t('onboarding.universes.continue')}
          </Button>
        </View>
      }
    >
      <View style={{ gap: tokens.space[3] }}>
        <Text variant="title1" accessibilityRole="header">
          {t('onboarding.universes.title')}
        </Text>
        <Text color="muted">{t('onboarding.universes.subtitle')}</Text>
      </View>
      <View
        accessibilityLabel={t('onboarding.universes.grid', { count: selected.length, max: MAX_UNIVERSES })}
        onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
        style={{ gap: tokens.space[3], opacity: tileWidth ? 1 : 0 }}
      >
        {rows.map((row, index) => (
          <View key={index} style={{ flexDirection: 'row', gap: tokens.space[3] }}>
            {row.map((category) => {
              const on = selected.includes(category)
              return (
                <CategoryTile
                  key={category}
                  category={category}
                  selected={on}
                  disabled={full && !on}
                  onToggle={() => setUniverses(on ? selected.filter((item) => item !== category) : [...selected, category])}
                  style={{ width: tileWidth }}
                />
              )
            })}
          </View>
        ))}
      </View>
    </Steps>
  )
}
