import { router } from 'expo-router'
import { useMemo, useState, type ReactNode } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Avatar,
  ColorSwatch,
  MobileTopBar,
  OptionTile,
  RadioGroup,
  RewardCard,
  SectionHeader,
  TabScrollView,
  TabsScrollView,
  tokens,
  useTheme,
  type TabsScrollPage,
} from '@/design-system'
import { useMe } from '@/features/me'
import { usePremiumSheet } from '@/features/premium/premium-store'
import { useMyBadges, useMyRewards, useUpdateMe } from '@/features/profile/hooks/use-profile'
import { avatarSvg, BACKGROUND_COLORS, parseAvatarConfig, type AvatarConfig } from '@/shared/utils/avatar'
import { tierOf } from '@/shared/utils/tier'
import { withStyle } from '../lib/avatar-preview'
import { EYES, GLASSES, HAIR, HAIR_COLORS, MOUTHS, type AvatarVariant } from '../lib/avatar-options'
import { avatarStylesFor, styleOf, type AvatarStyleId } from '../lib/avatar-styles'

type Tab = 'style' | 'face' | 'hair' | 'glasses' | 'background'

const TABS: { value: Tab; label: string }[] = [
  { value: 'style', label: 'Style' },
  { value: 'face', label: 'Visage' },
  { value: 'hair', label: 'Cheveux' },
  { value: 'glasses', label: 'Lunettes' },
  { value: 'background', label: 'Fond' },
]

const PAGE = { gap: tokens.space[6], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[2], paddingBottom: tokens.space[7] }
const TILE = { width: '23%' } as const

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: tokens.space[4] }}>
      <SectionHeader title={title} />
      {children}
    </View>
  )
}

/**
 * Éditeur d'avatar (`avatar.md`) : modale plein écran, aperçu fixe avec le cadre du rang, onglets Style, Visage,
 * Cheveux, Lunettes et Fond qu'on balaie. Enregistrer s'active au premier changement ; Annuler ferme sans enregistrer.
 * L'avatar de base, Lorelei et Notionists n'ont que Style et Fond.
 */
export function AvatarEditorScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const me = useMe(true)
  const data = me.data
  const rewards = useMyRewards()
  const badges = useMyBadges()
  const save = useUpdateMe('avatarOptions')
  const showPremium = usePremiumSheet((state) => state.show)
  const initial = useMemo<AvatarConfig>(
    () => parseAvatarConfig(data?.avatarOptions) ?? { style: 'base', backgroundColor: BACKGROUND_COLORS[0] },
    [data?.avatarOptions],
  )
  const [choice, setChoice] = useState<AvatarConfig>(initial)
  const [tab, setTab] = useState<Tab>('style')
  const seed = data?.userId ?? 'joutio'
  const style = styleOf(JSON.stringify(choice))
  const micah = style === 'micah'
  const changed = JSON.stringify(choice) !== JSON.stringify(initial)
  const render = (config: AvatarConfig) => avatarSvg(JSON.stringify(config), seed) ?? undefined
  const tier = data?.progression && !data.progression.provisional ? tierOf(data.progression.rating) : undefined
  // Droits du joueur : l'éditeur ne propose « Utiliser » que pour un style débloqué.
  const styles = avatarStylesFor(data, rewards.data, badges.data)

  const variants = (title: string, field: string, options: readonly AvatarVariant[]) => (
    <Section title={title}>
      <RadioGroup label={title} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] }}>
        {options.map(({ value, label }) => (
          <OptionTile
            key={value}
            label={label}
            image={render({ ...choice, [field]: value }) ?? ''}
            selected={(choice[field] ?? (field === 'glasses' ? 'none' : undefined)) === value}
            onSelect={() => setChoice({ ...choice, [field]: value })}
            style={TILE}
          />
        ))}
      </RadioGroup>
    </Section>
  )

  const swatches = (title: string, field: string, palette: readonly string[]) => (
    <Section title={title}>
      <RadioGroup label={title} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] }}>
        {palette.map((color, index) => (
          <ColorSwatch
            key={color}
            color={color}
            label={`${title} ${index + 1}`}
            selected={choice[field] === color}
            onSelect={() => setChoice({ ...choice, [field]: color })}
          />
        ))}
      </RadioGroup>
    </Section>
  )

  const pages: TabsScrollPage<Tab>[] = [
    {
      value: 'style',
      label: 'Style',
      content: (
        <TabScrollView contentContainerStyle={{ ...PAGE, gap: tokens.space[4] }}>
          {styles.map((entry) => {
            const active = entry.id === style
            return (
              <RewardCard
                key={entry.id}
                title={entry.title}
                rule={entry.rule}
                progress={entry.progress}
                progressLabel={entry.progressLabel}
                state={active ? 'active' : entry.usable ? 'unlocked' : entry.state}
                image={render(withStyle(choice, entry.id as AvatarStyleId))}
                cta={
                  entry.usable && !active
                    ? { label: 'Utiliser', onPress: () => setChoice(withStyle(choice, entry.id)) }
                    : entry.state === 'premium'
                      ? { label: 'Découvrir Premium', onPress: () => showPremium() }
                      : undefined
                }
              />
            )
          })}
        </TabScrollView>
      ),
    },
    {
      value: 'face',
      label: 'Visage',
      content: (
        <TabScrollView contentContainerStyle={PAGE}>
          {variants('Yeux', 'eyes', EYES)}
          {variants('Bouche', 'mouth', MOUTHS)}
        </TabScrollView>
      ),
    },
    {
      value: 'hair',
      label: 'Cheveux',
      content: (
        <TabScrollView contentContainerStyle={PAGE}>
          {variants('Coiffure', 'hair', HAIR)}
          {swatches('Couleur', 'hairColor', HAIR_COLORS)}
        </TabScrollView>
      ),
    },
    { value: 'glasses', label: 'Lunettes', content: <TabScrollView contentContainerStyle={PAGE}>{variants('Lunettes', 'glasses', GLASSES)}</TabScrollView> },
    {
      value: 'background',
      label: 'Fond',
      content: <TabScrollView contentContainerStyle={PAGE}>{swatches('Fond', 'backgroundColor', BACKGROUND_COLORS)}</TabScrollView>,
    },
  ]
  // L'avatar de base, Lorelei et Notionists n'ont qu'un fond à régler.
  const shown = pages.filter((page) => micah || page.value === 'style' || page.value === 'background')
  const current = shown.some((page) => page.value === tab) ? tab : 'style'

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <MobileTopBar
        variant="modal"
        title="Mon avatar"
        cancel="Annuler"
        confirm="Enregistrer"
        confirmDisabled={!changed || save.isPending}
        onCancel={() => router.back()}
        onConfirm={() => {
          save.mutate(JSON.stringify(choice))
          router.back()
        }}
      />
      <View style={{ alignItems: 'center', paddingVertical: tokens.space[4] }}>
        <Avatar name={data?.pseudonym ?? 'Moi'} src={render(choice)} tier={tier} size="preview" />
      </View>
      <View style={{ flex: 1 }}>
        <TabsScrollView<Tab>
          key={micah ? 'micah' : 'simple'}
          label="Réglages de l'avatar"
          value={current}
          onChange={setTab}
          pages={shown}
          scrollToTopPill={false}
        />
      </View>
    </View>
  )
}
