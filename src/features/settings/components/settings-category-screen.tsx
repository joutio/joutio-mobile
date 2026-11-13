import { nextRecruiterTier, RECRUITER_TIERS } from '@joutio/client-domain/share'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { Linking, View } from 'react-native'
import {
  ArrowCounterClockwiseIcon,
  Button,
  CakeIcon,
  CategoryTile,
  CheckCircleIcon,
  CrownSimpleIcon,
  DatabaseIcon,
  EnvelopeSimpleIcon,
  FileTextIcon,
  GiftIcon,
  GlobeHemisphereWestIcon,
  InfoIcon,
  LifebuoyIcon,
  LightningIcon,
  ListGroup,
  ListRow,
  MedalIcon,
  MobileSheet,
  PaletteIcon,
  ProgressBar,
  ProhibitIcon,
  RadioGroup,
  RobotIcon,
  SectionHeader,
  ShareNetworkIcon,
  ShieldCheckIcon,
  SparkleIcon,
  SpeakerHighIcon,
  Stat,
  Text,
  toast,
  tokens,
  TrashIcon,
  useDeviceSettings,
  useThemeStore,
  useTheme,
  VibrateIcon,
  type CategoryCode,
} from '@/design-system'
import { useMe, useReferral, useSetBirthDate } from '@/features/me'
import { PushPermissionRow } from '@/features/notifications/components/push-permission-row'
import { usePushRematches } from '@/features/notifications/hooks/use-push-preferences'
import { useAutoTrain } from '@/features/play/hooks/use-play'
import { usePremiumSheet } from '@/features/premium/premium-store'
import { useNotificationPreferences, useSetNotificationPreference, useUpdateMe } from '@/features/profile/hooks/use-profile'
import { useShare } from '@/features/share'
import { config } from '@/lib/config'
import { appVersion } from '@/shared/utils/app-info'
import { BirthDatePicker, birthDateError, formatBirthDate } from '@/shared/components/birth-date-picker'
import { APPEARANCE, LANGUAGES } from '../lib/settings-options'
import { Group, SettingsFrame, type SettingsPage } from './settings-frame'

const PAGES: readonly SettingsPage[] = ['account', 'privacy', 'notifications', 'game', 'display', 'invite', 'help']
const SUPPORT = 'mailto:contact@joutio.com'
const MAX_INTERESTS = 3
const UNIVERSES = Object.keys(tokens.category) as CategoryCode[]

const openPage = (path: string) => () => void WebBrowser.openBrowserAsync(`${config.siteUrl}${path}`)

/** Une catégorie des Réglages (`reglages.md` § 1, Pages), retour « Réglages ». */
export function SettingsCategoryScreen() {
  const { page } = useLocalSearchParams<{ page: SettingsPage }>()
  if (!PAGES.includes(page)) return <Redirect href="/profile/settings" />
  switch (page) {
    case 'account':
      return <AccountPage />
    case 'privacy':
      return <PrivacyPage />
    case 'notifications':
      return <NotificationsPage />
    case 'game':
      return <GamePage />
    case 'display':
      return <DisplayPage />
    case 'invite':
      return <InvitePage />
    case 'help':
      return <HelpPage />
  }
}

/** Date de naissance, modifiable ici seulement (`editer-profil.md` § 5) : enregistrée à la validation. */
function BirthDateSheet({ open, value, onClose }: { open: boolean; value: string | null | undefined; onClose: () => void }) {
  const save = useSetBirthDate()
  const [edited, setEdited] = useState<string | null>(null)
  const draft = edited ?? value ?? null
  const dismiss = () => {
    setEdited(null)
    onClose()
  }
  return (
    <MobileSheet
      open={open}
      onClose={dismiss}
      title="Date de naissance"
      footer={
        <Button
          full
          disabled={!draft || draft === value || birthDateError(draft) !== undefined}
          loading={save.isPending}
          onPress={() =>
            draft &&
            save.mutate(draft, {
              onSuccess: () => {
                toast.success('Date de naissance enregistrée')
                dismiss()
              },
              onError: () => toast.error("La date n'a pas été enregistrée"),
            })
          }
        >
          Valider
        </Button>
      }
    >
      <BirthDatePicker value={draft} onChange={setEdited} />
    </MobileSheet>
  )
}

function AccountPage() {
  const data = useMe(true).data
  const showPremium = usePremiumSheet((state) => state.show)
  const [birthOpen, setBirthOpen] = useState(false)
  return (
    <SettingsFrame title="Compte" overlay={<BirthDateSheet open={birthOpen} value={data?.birthDate} onClose={() => setBirthOpen(false)} />}>
      <Group title="Connexion">
        <ListRow icon={EnvelopeSimpleIcon} label="E-mail" value={data?.email} control="value" last />
      </Group>
      <Group footer="Privée : elle ne s'affiche jamais sur ton profil. Joutio est réservé aux 15 ans et plus.">
        <ListRow icon={CakeIcon} label="Date de naissance" value={formatBirthDate(data?.birthDate)} control="chevron" onPress={() => setBirthOpen(true)} last />
      </Group>
      <Group>
        <ListRow icon={CrownSimpleIcon} label="Premium" value={data?.premium ? 'Actif' : 'Bientôt'} control="chevron" onPress={() => showPremium()} last />
      </Group>
      <Group>
        <ListRow icon={TrashIcon} label="Supprimer mon compte" control="none" destructive onPress={() => router.push('/delete-account')} last />
      </Group>
    </SettingsFrame>
  )
}

function PrivacyPage() {
  return (
    <SettingsFrame title="Confidentialité et sécurité">
      <Group title="Joueurs">
        <ListRow icon={ProhibitIcon} label="Joueurs bloqués" value="Bientôt" control="value" disabled last />
      </Group>
      <Group title="Données">
        <ListRow icon={ShieldCheckIcon} label="Politique de confidentialité" control="chevron" onPress={openPage('/privacy')} />
        <ListRow
          icon={DatabaseIcon}
          label="Mes données"
          sub="Ce que Joutio conserve et comment le supprimer"
          control="chevron"
          onPress={openPage('/data-deletion')}
          last
        />
      </Group>
    </SettingsFrame>
  )
}

function NotificationsPage() {
  const device = useDeviceSettings()
  const rematches = usePushRematches()
  const preferences = useNotificationPreferences()
  const setPreference = useSetNotificationPreference()
  const rooms = preferences.data?.find((item) => item.category === 'ROOM')?.enabled ?? true
  return (
    <SettingsFrame title="Notifications">
      <ListGroup surface="surface">
        <PushPermissionRow />
      </ListGroup>
      <Group title="Me prévenir quand">
        <ListRow
          icon={LightningIcon}
          label="Défis et salons"
          sub="On te défie ou t'invite dans un salon"
          control="toggle"
          on={rooms}
          disabled={setPreference.isPending}
          onToggle={(enabled) => setPreference.mutate({ category: 'ROOM', enabled })}
        />
        <ListRow
          icon={ArrowCounterClockwiseIcon}
          label="Revanches"
          sub="Ton adversaire veut sa revanche"
          control="toggle"
          on={device.notifyRematches}
          disabled={rematches.isPending}
          onToggle={(enabled) => rematches.mutate(enabled)}
        />
        <ListRow
          icon={MedalIcon}
          label="Rangs et badges"
          sub="Tu changes de rang ou gagnes un badge"
          control="toggle"
          on={device.notifyRanks}
          onToggle={(notifyRanks) => device.set({ notifyRanks })}
          last
        />
      </Group>
    </SettingsFrame>
  )
}

function GamePage() {
  const data = useMe(true).data
  const device = useDeviceSettings()
  const autoTrain = useAutoTrain()
  const saveInterests = useUpdateMe('interests')
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string[]>([])
  const interests = data?.interests ?? []
  const toggle = (category: string) => setDraft(draft.includes(category) ? draft.filter((item) => item !== category) : [...draft, category])
  return (
    <SettingsFrame
      title="Jeu"
      overlay={
        <MobileSheet
          open={open}
          onClose={() => setOpen(false)}
          title="Centres d'intérêt"
          subtitle={`${draft.length} sur ${MAX_INTERESTS}`}
          tall
          footer={
            <Button
              full
              disabled={draft.join() === interests.join()}
              loading={saveInterests.isPending}
              onPress={() => saveInterests.mutate(draft, { onSuccess: () => setOpen(false) })}
            >
              Enregistrer
            </Button>
          }
        >
          <View style={{ gap: tokens.space[4] }}>
            <Text variant="callout" color="muted">
              Ils personnalisent ton accueil. Le premier choisi est ton univers principal.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] }}>
              {UNIVERSES.map((category) => {
                const on = draft.includes(category)
                return (
                  <CategoryTile
                    key={category}
                    category={category}
                    selected={on}
                    disabled={draft.length === MAX_INTERESTS && !on}
                    onToggle={() => toggle(category)}
                    style={{ width: '31.5%' }}
                  />
                )
              })}
            </View>
          </View>
        </MobileSheet>
      }
    >
      <Group title="Duel">
        <ListRow icon={SpeakerHighIcon} label="Sons du duel" control="toggle" on={device.sounds} onToggle={(sounds) => device.set({ sounds })} />
        <ListRow icon={VibrateIcon} label="Vibrations" control="toggle" on={device.haptics} onToggle={(haptics) => device.set({ haptics })} />
        <ListRow
          icon={CheckCircleIcon}
          label="Icônes et points des réponses"
          sub="Coche, croix et points à la révélation"
          control="toggle"
          on={device.answerDetails}
          onToggle={(answerDetails) => device.set({ answerDetails })}
          last
        />
      </Group>
      <Group title="Recherche d'adversaire">
        <ListRow
          icon={RobotIcon}
          label="Entraînement si aucun adversaire"
          sub="Après 10 s sans joueur, sans points d'expérience ni série"
          control="toggle"
          on={autoTrain.enabled}
          disabled={autoTrain.pending}
          onToggle={autoTrain.set}
          last
        />
      </Group>
      <Group title="Accueil">
        <ListRow
          icon={SparkleIcon}
          label="Centres d'intérêt"
          sub={interests.map((category) => tokens.category[category as CategoryCode]?.label ?? category).join(', ') || 'Aucun pour l’instant'}
          control="chevron"
          onPress={() => {
            setDraft(interests)
            setOpen(true)
          }}
          last
        />
      </Group>
    </SettingsFrame>
  )
}

function DisplayPage() {
  const data = useMe(true).data
  const language = useUpdateMe('language')
  const appearance = useThemeStore((state) => state.preference)
  const setAppearance = useThemeStore((state) => state.setPreference)
  const [sheet, setSheet] = useState<'language' | 'appearance'>()
  return (
    <SettingsFrame
      title="Affichage et langue"
      overlay={
        <>
          <MobileSheet open={sheet === 'language'} onClose={() => setSheet(undefined)} title="Langue">
            <ListGroup surface="surface">
              <RadioGroup label="Langue">
                {LANGUAGES.map((option, index) => (
                  <ListRow
                    key={option.value}
                    label={option.label}
                    control="radio"
                    on={(data?.language ?? 'fr') === option.value}
                    disabled={language.isPending}
                    last={index === LANGUAGES.length - 1}
                    onToggle={() => {
                      if (option.value === (data?.language ?? 'fr')) setSheet(undefined)
                      else language.mutate(option.value, { onSuccess: () => setSheet(undefined) })
                    }}
                  />
                ))}
              </RadioGroup>
            </ListGroup>
          </MobileSheet>
          <MobileSheet open={sheet === 'appearance'} onClose={() => setSheet(undefined)} title="Apparence">
            <ListGroup surface="surface">
              <RadioGroup label="Apparence">
                {APPEARANCE.map((option, index) => (
                  <ListRow
                    key={option.value}
                    label={option.label}
                    control="radio"
                    on={appearance === option.value}
                    last={index === APPEARANCE.length - 1}
                    onToggle={() => {
                      setAppearance(option.value)
                      setSheet(undefined)
                    }}
                  />
                ))}
              </RadioGroup>
            </ListGroup>
          </MobileSheet>
        </>
      }
    >
      <Group>
        <ListRow
          icon={GlobeHemisphereWestIcon}
          label="Langue"
          value={LANGUAGES.find((option) => option.value === (data?.language ?? 'fr'))?.label}
          control="chevron"
          onPress={() => setSheet('language')}
        />
        <ListRow
          icon={PaletteIcon}
          label="Apparence"
          value={APPEARANCE.find((option) => option.value === appearance)?.label}
          control="chevron"
          onPress={() => setSheet('appearance')}
          last
        />
      </Group>
    </SettingsFrame>
  )
}

/** Inviter des amis (`partage.md` § 6) : lien de parrainage, compteurs et progression du badge Recruteur. */
function InvitePage() {
  const { colors } = useTheme()
  const me = useMe(true).data
  const referral = useReferral()
  const share = useShare()
  const data = referral.data
  const next = data ? nextRecruiterTier(data.qualified) : null
  const previous = data ? ([...RECRUITER_TIERS].reverse().find((tier) => tier <= data.qualified) ?? 0) : 0
  const progress = data && next ? Math.round(((data.qualified - previous) / (next - previous)) * 100) : 100
  return (
    <SettingsFrame title="Inviter des amis">
      <View style={{ alignItems: 'center', gap: tokens.space[3], paddingTop: tokens.space[3] }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: tokens.radius.lg,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: '-6deg' }],
          }}
        >
          <GiftIcon size={32} weight="fill" color={colors.onAccent} />
        </View>
        <Text variant="title2" align="center">
          Fais venir tes amis
        </Text>
        <Text variant="callout" color="muted" align="center">
          Ils te suivent dès leur arrivée. Chaque ami qui termine son premier duel te rapproche du badge Recruteur.
        </Text>
      </View>
      {data && (
        <>
          <View
            style={{ gap: tokens.space[1], padding: tokens.space[4], borderRadius: tokens.radius.lg, backgroundColor: colors.surface, alignItems: 'center' }}
          >
            <Text variant="caption" color="muted">
              Ton code de parrainage
            </Text>
            <Text variant="title1" mono>
              {data.code}
            </Text>
          </View>
          <Button
            full
            variant="tinted"
            icon={ShareNetworkIcon}
            onPress={() =>
              share({ kind: 'invite', id: data.code, message: `${me?.pseudonym ?? 'Un joueur'} t’invite sur Joutio, le jeu de duels de culture générale.` })
            }
          >
            Partager mon lien
          </Button>
          <View style={{ gap: tokens.space[3] }}>
            <SectionHeader title="Badge Recruteur" />
            <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
              <Stat label="Amis invités" value={String(data.invited)} compact />
              <Stat label="Ont joué" value={String(data.qualified)} tone="accent" compact />
            </View>
            <View style={{ gap: tokens.space[2], padding: tokens.space[4], borderRadius: tokens.radius.lg, backgroundColor: colors.surface }}>
              <ProgressBar value={progress} label={next ? `${data.qualified} sur ${next} amis` : 'Tous les paliers atteints'} />
              <Text variant="caption" color="muted">
                {`Paliers : ${RECRUITER_TIERS.join(', ')} amis qui ont joué.`}
              </Text>
            </View>
          </View>
        </>
      )}
    </SettingsFrame>
  )
}

function HelpPage() {
  return (
    <SettingsFrame title="Aide et à propos">
      <Group>
        <ListRow icon={LifebuoyIcon} label="Contacter le support" control="chevron" onPress={() => void Linking.openURL(SUPPORT).catch(() => undefined)} />
        <ListRow icon={FileTextIcon} label="Conditions d'utilisation" control="chevron" onPress={openPage('/terms')} />
        <ListRow icon={ShieldCheckIcon} label="Politique de confidentialité" control="chevron" onPress={openPage('/privacy')} last />
      </Group>
      <Group>
        <ListRow icon={InfoIcon} label="Version" value={appVersion} control="value" last />
      </Group>
    </SettingsFrame>
  )
}
