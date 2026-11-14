import { router } from '@/shared/navigation/router'
import { useMemo, useState, type ReactNode } from 'react'
import { useWindowDimensions, View } from 'react-native'
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
import { t } from '@/shared/avatar/i18n'
import { defaultOptionsFor, getAvatarStyle, humanizeVariant, NONE_LABEL_KEY, type AvatarStyleSection } from '@/shared/avatar/styles'
import { avatarSvg, parseAvatarConfig, type AvatarConfig } from '@/shared/utils/avatar'
import { withStyle } from '../lib/avatar-preview'
import { avatarStylesFor, styleOf, type AvatarStyleId } from '../lib/avatar-styles'

const PAGE = { gap: tokens.space[6], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[2], paddingBottom: tokens.space[7] }
/** Grille adaptative : largeur minimale de vignette, 3 colonnes sur un téléphone, davantage sur un écran déplié. */
const TILE_MIN = 100
const TILE_GAP = tokens.space[3]

function tileWidth(screenWidth: number) {
  const content = screenWidth - 2 * PAGE.paddingHorizontal
  const columns = Math.max(3, Math.floor((content + TILE_GAP) / (TILE_MIN + TILE_GAP)))
  // Arrondi vers le bas : la dernière colonne ne passe jamais à la ligne.
  return Math.floor((content - TILE_GAP * (columns - 1)) / columns)
}

/** Libellé d'une variante : traduction du web, sinon « Variante 3 », sinon l'identifiant. */
function variantLabel(section: AvatarStyleSection, variant: string) {
  const key = section.labelKeys?.[variant]
  if (key) return t(key)
  const humanized = humanizeVariant(variant)
  return humanized ? t(humanized.key, { number: humanized.number }) : variant
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={{ gap: tokens.space[4] }}>
      {title && <SectionHeader title={title} />}
      {children}
    </View>
  )
}

/**
 * Éditeur d'avatar (`avatar.md`), identique à `joutio-web` : onglet Style, puis **un onglet par partie** du style choisi
 * (yeux, sourcils, nez…, 2026-11-14), avec ses variantes (« Aucun » si l'élément est facultatif) et sa couleur. La barre
 * défile ; seuls l'onglet ouvert et ses voisins sont rendus (chaque vignette est un rendu DiceBear).
 * L'avatar de base est celui du Profil : les initiales, sans aucun réglage (seul l'onglet Style reste, 2026-11-12). Aperçu fixe de l'avatar seul, sans cadre de rang ; Enregistrer s'active au premier changement.
 */
export function AvatarEditorScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { width: screenWidth } = useWindowDimensions()
  const tile = { width: tileWidth(screenWidth) }
  const me = useMe(true)
  const data = me.data
  const rewards = useMyRewards()
  const badges = useMyBadges()
  const save = useUpdateMe('avatarOptions')
  const showPremium = usePremiumSheet((state) => state.show)
  const initial = useMemo<AvatarConfig>(() => {
    const parsed = parseAvatarConfig(data?.avatarOptions)
    return parsed && parsed.style !== 'base' ? parsed : { style: 'base' }
  }, [data?.avatarOptions])
  const [choice, setChoice] = useState<AvatarConfig>(initial)
  const [tab, setTab] = useState<string>('style')
  const seed = data?.userId ?? 'joutio'
  const style = styleOf(JSON.stringify(choice))
  const dicebear = style !== 'base'
  const definition = dicebear ? getAvatarStyle(style) : undefined
  const changed = JSON.stringify(choice) !== JSON.stringify(initial)
  const render = (config: AvatarConfig) => avatarSvg(JSON.stringify(config), seed) ?? undefined
  const styles = avatarStylesFor(data, rewards.data, badges.data)
  const set = (patch: AvatarConfig) => setChoice({ ...choice, ...patch })

  const section = (item: AvatarStyleSection) => (
    <View key={item.id} style={{ gap: tokens.space[6] }}>
      {item.variantField && item.variants && (
        <RadioGroup label={t(item.labelKey)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP }}>
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
                  style={tile}
                />
              )
            })}
        </RadioGroup>
      )}
      {item.colorField && item.colors && (
        // Partie sans variantes (peau, fond) : l'onglet porte déjà son nom.
        <Section title={item.variantField ? (item.colorLabelKey ? t(item.colorLabelKey) : t('avatar.color')) : undefined}>
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
                avatarName={data?.pseudonym}
                onSelect={entry.usable ? () => setChoice(withStyle(choice, entry.id)) : undefined}
                cta={entry.state === 'premium' ? { label: 'Découvrir Premium', onPress: () => showPremium() } : undefined}
              />
            )
          })}
        </RadioGroup>
      </TabScrollView>
    ),
  }

  const sections = definition ? definition.groups.flatMap((group) => group.sections) : []
  const values = ['style', ...sections.map((item) => item.id)]
  const current = values.includes(tab) ? tab : 'style'
  const active = values.indexOf(current)
  const sectionPages: TabsScrollPage<string>[] = sections.map((item, index) => ({
    value: item.id,
    label: t(item.labelKey),
    // Fenêtre de rendu : l'onglet ouvert et ses voisins, pour un balayage sans page blanche.
    content: <TabScrollView contentContainerStyle={PAGE}>{Math.abs(index + 1 - active) <= 1 ? section(item) : null}</TabScrollView>,
  }))
  const pages = [stylePage, ...sectionPages]

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <MobileTopBar
        variant="modal"
        title="Mon avatar"
        cancel="Annuler"
        confirm="Enregistrer"
        confirmLoading={save.isPending}
        confirmDisabled={!changed || save.isPending}
        onCancel={() => router.back()}
        onConfirm={() => {
          save.mutate(JSON.stringify(choice), { onSuccess: () => router.back() })
        }}
      />
      <View style={{ alignItems: 'center', gap: tokens.space[3], paddingVertical: tokens.space[4] }}>
        <Avatar name={data?.pseudonym ?? 'Moi'} src={render(choice)} size="preview" />
      </View>
      <View style={{ flex: 1 }}>
        <TabsScrollView<string>
          key={style}
          label="Réglages de l'avatar"
          value={current}
          onChange={setTab}
          pages={pages}
          scrollToTopPill={false}
          scrollableTabs={pages.length > 4}
        />
      </View>
    </View>
  )
}
