import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { Banner, Button, CategoryTile, Text, tokens, type CategoryCode } from '@/design-system'
import { useSaveInterests } from '../hooks/use-onboarding'
import { MAX_UNIVERSES, useOnboardingStore } from '../onboarding-store'
import { Steps } from './steps'

const UNIVERSES = Object.keys(tokens.category) as CategoryCode[]
const COLUMNS = 3

/** Univers : 1 à 3 choix ; au 3e, les autres se désactivent. « Passer » saute le premier thème. */
export function UniversesStep() {
  const selected = useOnboardingStore((state) => state.universes)
  const setUniverses = useOnboardingStore((state) => state.setUniverses)
  const setSkipped = useOnboardingStore((state) => state.setSkipped)
  const save = useSaveInterests()
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
          Passer
        </Button>
      }
      footer={
        <View style={{ gap: tokens.space[3] }}>
          {save.isError && <Banner title="Tes univers n'ont pas pu être enregistrés" message="Vérifie ta connexion et réessaie." />}
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
            {`Continuer${selected.length > 0 ? ` · ${selected.length} sur ${MAX_UNIVERSES}` : ''}`}
          </Button>
        </View>
      }
    >
      <View style={{ gap: tokens.space[3] }}>
        <Text variant="title1" accessibilityRole="header">
          Quels univers te tentent ?
        </Text>
        <Text color="muted">Choisis 1 à 3 univers. Ils personnalisent ton accueil et nous servent à te proposer ton premier thème.</Text>
      </View>
      <View
        accessibilityLabel={`Univers, ${selected.length} sur ${MAX_UNIVERSES} choisis`}
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
