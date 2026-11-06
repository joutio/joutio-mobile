import { router } from 'expo-router'
import { useMemo, useState, type ReactNode } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ArrowCounterClockwiseIcon,
  Avatar,
  Button,
  ColorSwatch,
  MobileTopBar,
  OptionTile,
  RadioGroup,
  RewardCard,
  SectionHeader,
  ShuffleIcon,
  TabScrollView,
  TabsScrollView,
  tokens,
  useTheme,
  type TabsScrollPage,
} from '@/design-system'
import { useMe } from '@/features/me'
import { usePremiumSheet } from '@/features/premium/premium-store'
import { useMyBadges, useMyRewards, useUpdateMe } from '@/features/profile/hooks/use-profile'
import { t } from '@/shared/avatar/i18n'
import { randomAvatarOptions } from '@/shared/avatar/render'
import { defaultOptionsFor, getAvatarStyle, humanizeVariant, NONE_LABEL_KEY, type AvatarStyleSection } from '@/shared/avatar/styles'
import { avatarSvg, BACKGROUND_COLORS, parseAvatarConfig, type AvatarConfig } from '@/shared/utils/avatar'
import { tierOf } from '@/shared/utils/tier'
import { withStyle } from '../lib/avatar-preview'
import { avatarStylesFor, styleOf, type AvatarStyleId } from '../lib/avatar-styles'

const PAGE = { gap: tokens.space[6], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[2], paddingBottom: tokens.space[7] }
const TILE = { width: '23%' } as const
const BASE_BACKGROUND_TAB = 'fond'

/** Libellé d'une variante : traduction du web, sinon « Variante 3 », sinon l'identifiant. */
function variantLabel(section: AvatarStyleSection, variant: string) {
  const key = section.labelKeys?.[variant]
  if (key) return t(key)
  const humanized = humanizeVariant(variant)
  return humanized ? t(humanized.key, { number: humanized.number }) : variant
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: tokens.space[4] }}>
      <SectionHeader title={title} />
      {children}
    </View>
  )
}

/**
 * Éditeur d'avatar (`avatar.md`), aligné sur `joutio-web` : onglet Style, puis les groupes du style choisi (Micah :
 * Visage, Cheveux, Accessoires, Vêtements, Couleurs ; Lorelei et Notionists : les leurs), chaque section avec ses
 * variantes (« Aucun » si l'élément est facultatif) et sa palette. Aléatoire et Réinitialiser comme sur le web.
 * L'avatar de base n'a qu'un fond. Aperçu fixe avec le cadre du rang ; Enregistrer s'active au premier changement.
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
  const [tab, setTab] = useState<string>('style')
  // Un onglet n'est rendu qu'une fois ouvert : chaque vignette est un rendu DiceBear.
  const [visited, setVisited] = useState<readonly string[]>(['style'])
  const seed = data?.userId ?? 'joutio'
  const style = styleOf(JSON.stringify(choice))
  const dicebear = style !== 'base'
  const definition = dicebear ? getAvatarStyle(style) : undefined
  const changed = JSON.stringify(choice) !== JSON.stringify(initial)
  const render = (config: AvatarConfig) => avatarSvg(JSON.stringify(config), seed) ?? undefined
  const tier = data?.progression && !data.progression.provisional ? tierOf(data.progression.rating) : undefined
  const styles = avatarStylesFor(data, rewards.data, badges.data)
  const set = (patch: AvatarConfig) => setChoice({ ...choice, ...patch })
  const open = (next: string) => {
    setTab(next)
    if (!visited.includes(next)) setVisited([...visited, next])
  }

  const section = (item: AvatarStyleSection) => (
    <View key={item.id} style={{ gap: tokens.space[5] }}>
      {item.variantField && item.variants && (
        <Section title={t(item.labelKey)}>
          <RadioGroup label={t(item.labelKey)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] }}>
            {[...(item.allowsNone ? ['none'] : []), ...item.variants].map((variant) => {
              const field = item.variantField as string
              const current = choice[field] ?? definition?.defaults[field]
              return (
                <OptionTile
                  key={variant}
                  label={variant === 'none' ? t(NONE_LABEL_KEY) : variantLabel(item, variant)}
                  image={render({ ...choice, [field]: variant }) ?? ''}
                  selected={current === variant}
                  onSelect={() => set({ [field]: variant })}
                  style={TILE}
                />
              )
            })}
          </RadioGroup>
        </Section>
      )}
      {item.colorField && item.colors && (
        <Section title={item.colorLabelKey ? t(item.colorLabelKey) : t('avatar.color')}>
          <RadioGroup
            label={item.colorLabelKey ? t(item.colorLabelKey) : t('avatar.color')}
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] }}
          >
            {item.colors.map((color, index) => {
              const field = item.colorField as string
              return (
                <ColorSwatch
                  key={color}
                  color={color}
                  label={`${item.colorLabelKey ? t(item.colorLabelKey) : t('avatar.color')} ${index + 1}`}
                  selected={(choice[field] ?? definition?.defaults[field]) === color}
                  onSelect={() => set({ [field]: color })}
                />
              )
            })}
          </RadioGroup>
        </Section>
      )}
    </View>
  )

  const stylePage: TabsScrollPage<string> = {
    value: 'style',
    label: t('avatar.editor.style'),
    content: (
      <TabScrollView contentContainerStyle={{ ...PAGE, gap: tokens.space[4] }}>
        <RadioGroup label="Style d'avatar" style={{ gap: tokens.space[4] }}>
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
                onSelect={entry.usable ? () => setChoice(withStyle(choice, entry.id)) : undefined}
                cta={entry.state === 'premium' ? { label: 'Découvrir Premium', onPress: () => showPremium() } : undefined}
              />
            )
          })}
        </RadioGroup>
      </TabScrollView>
    ),
  }

  const groupPages: TabsScrollPage<string>[] = definition
    ? definition.groups.map((group) => ({
        value: group.id,
        label: t(group.labelKey),
        content: <TabScrollView contentContainerStyle={PAGE}>{visited.includes(group.id) ? group.sections.map(section) : null}</TabScrollView>,
      }))
    : [
        {
          value: BASE_BACKGROUND_TAB,
          label: t('avatar.sections.background'),
          content: (
            <TabScrollView contentContainerStyle={PAGE}>
              {section({
                id: 'background',
                labelKey: 'avatar.sections.background',
                colorField: 'backgroundColor',
                colors: BACKGROUND_COLORS,
                colorLabelKey: 'avatar.colors.background',
              })}
            </TabScrollView>
          ),
        },
      ]
  const pages = [stylePage, ...groupPages]
  const current = pages.some((page) => page.value === tab) ? tab : 'style'

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
      <View style={{ alignItems: 'center', gap: tokens.space[3], paddingVertical: tokens.space[4] }}>
        <Avatar name={data?.pseudonym ?? 'Moi'} src={render(choice)} tier={tier} size="preview" />
        {dicebear && (
          <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
            <Button variant="gray" tone="neutral" size="S" icon={ShuffleIcon} onPress={() => setChoice({ ...randomAvatarOptions(style), style })}>
              {t('avatar.editor.random')}
            </Button>
            <Button variant="gray" tone="neutral" size="S" icon={ArrowCounterClockwiseIcon} onPress={() => setChoice(defaultOptionsFor(style))}>
              {t('avatar.editor.reset')}
            </Button>
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <TabsScrollView<string>
          key={style}
          label="Réglages de l'avatar"
          value={current}
          onChange={open}
          pages={pages}
          scrollToTopPill={false}
          scrollableTabs={pages.length > 4}
        />
      </View>
    </View>
  )
}
