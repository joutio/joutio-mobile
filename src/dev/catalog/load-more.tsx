import { useState } from 'react'
import { View } from 'react-native'
import { Button, DragToLoadMore, FeedFooter, ListRow, LoadMoreScrollView, MobileSheet, MobileTopBar, Screen, Text, tokens } from '@/design-system'
import { router } from '@/shared/navigation/router'

/** Real native control in both surfaces; a fixed row number makes anchor movement obvious. */
export function LoadMoreDemo() {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(12)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'normal' | 'slow' | 'error' | 'local'>('normal')
  const [error, setError] = useState(false)
  const load = async () => {
    setError(false)
    setLoading(true)
    try {
      if (mode !== 'local') await new Promise((resolve) => setTimeout(resolve, mode === 'slow' ? 5000 : 1200))
      if (mode === 'error') {
        setError(true)
        return
      }
      setCount((value) => Math.min(30, value + 6))
    } finally {
      setLoading(false)
    }
  }
  const options = { enabled: count < 30, loading, onLoadMore: load }
  const rows = (
    <>
      {Array.from({ length: count }, (_, i) => (
        <ListRow key={i} label={`Élément ${i + 1}`} control="none" />
      ))}
      <FeedFooter state={error ? 'error' : loading ? 'loading' : count < 30 ? 'more' : 'end'} pages={Math.ceil(count / 6)} onLoadMore={load} onRetry={load} />
    </>
  )
  return (
    <Screen header={<MobileTopBar variant="inline" back="Catalogue" onBack={() => router.back()} title="Suite native" />} scroll={false}>
      <View style={{ gap: tokens.space[2], padding: tokens.space[4] }}>
        <Text variant="caption">Mode : {mode}. Dernière page : 30 éléments. Fermer puis rouvrir la feuille pendant une requête est aussi testable.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {(['normal', 'slow', 'error', 'local'] as const).map((value) => (
            <Button
              key={value}
              size="S"
              variant="plain"
              onPress={() => {
                setMode(value)
                setCount(12)
                setError(false)
              }}
            >
              {value}
            </Button>
          ))}
        </View>
        <Button onPress={() => setOpen(true)}>Ouvrir la feuille</Button>
      </View>
      <DragToLoadMore {...options}>
        <LoadMoreScrollView>{rows}</LoadMoreScrollView>
      </DragToLoadMore>
      <MobileSheet open={open} onClose={() => setOpen(false)} title="Suite native" subtitle={`${count} éléments · ${mode}`} tall loadMore={options}>
        {rows}
      </MobileSheet>
    </Screen>
  )
}
