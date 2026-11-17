import { Redirect, useLocalSearchParams } from 'expo-router'
import { router } from '@/shared/navigation/router'
import * as WebBrowser from 'expo-web-browser'
import { zodResolver } from '@hookform/resolvers/zod'
import { birthDateSchema } from '@joutio/client/forms'
import { isoDay } from '@joutio/client/profile'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
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
  GlobeHemisphereWestIcon,
  InfoIcon,
  LifebuoyIcon,
  LightningIcon,
  ListGroup,
  ListRow,
  MedalIcon,
  MobileSheet,
  PaletteIcon,
  ProhibitIcon,
  RadioGroup,
  RobotIcon,
  ShieldCheckIcon,
  SparkleIcon,
  SpeakerHighIcon,
  Text,
  toast,
  tokens,
  TrashIcon,
  useDeviceSettings,
  useThemeStore,
  VibrateIcon,
  type CategoryCode,
} from '@/design-system'
import { useMe, useSetBirthDate } from '@/features/me'
import { PushPermissionRow } from '@/features/notifications/components/push-permission-row'
import { usePushRematches } from '@/features/notifications/hooks/use-push-preferences'
import { useAutoTrain } from '@/features/play/hooks/use-play'
import { usePremiumSheet } from '@/features/premium/premium-store'
import { useNotificationPreferences, useSetNotificationPreference, useUpdateMe } from '@/features/profile/hooks/use-profile'
import { config } from '@/lib/config'
import { appVersion } from '@/shared/utils/app-info'
import { BirthDatePicker, formatBirthDate } from '@/shared/components/birth-date-picker'
import { APPEARANCE, LANGUAGES } from '../lib/settings-options'
import { Group, SettingsFrame, useSettingsOrigin, type SettingsPage } from './settings-frame'
import { useT } from '@/lib/i18n'

const PAGES: readonly SettingsPage[] = ['account', 'privacy', 'notifications', 'game', 'display', 'help']
const SUPPORT = 'mailto:contact@joutio.com'
const MAX_INTERESTS = 3
const UNIVERSES = Object.keys(tokens.category) as CategoryCode[]

const openPage = (path: string) => () => void WebBrowser.openBrowserAsync(`${config.siteUrl}${path}`)

/** Une catégorie des Réglages (`reglages.md` § 1, Pages), retour « Réglages ». */
export function SettingsCategoryScreen() {
  const { page } = useLocalSearchParams<{ page: SettingsPage }>()
  const origin = useSettingsOrigin()
  // Page inconnue : retour à la racine des Réglages **de la même pile** (Accueil ou Profil).
  if (!PAGES.includes(page)) return <Redirect href={origin === 'home' ? '/home/settings' : '/profile/settings'} />
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
    case 'help':
      return <HelpPage />
  }
}

/** Date de naissance, modifiable ici seulement (`editer-profil.md` § 5) : enregistrée à la validation. */
function BirthDateSheet({ open, value, onClose }: { open: boolean; value: string | null | undefined; onClose: () => void }) {
  const t = useT()
  const save = useSetBirthDate()
  const form = useForm({ resolver: zodResolver(birthDateSchema(isoDay(new Date()))), mode: 'onChange', defaultValues: { birthDate: value ?? '' } })
  const dismiss = () => {
    form.reset({ birthDate: value ?? '' })
    onClose()
  }
  return (
    <MobileSheet
      open={open}
      onClose={dismiss}
      title={t('account.birthDate')}
      footer={
        <Button
          full
          disabled={!form.formState.isDirty || !form.formState.isValid}
          loading={save.isPending}
          onPress={() =>
            void form.handleSubmit(({ birthDate }) =>
              save.mutate(birthDate, {
                onSuccess: () => {
                  toast.success(t('account.birthDateSaved'))
                  dismiss()
                },
                onError: () => toast.error(t('mobile.onboarding.birthFailed')),
              }),
            )()
          }
        >
          {t('account.validate')}
        </Button>
      }
    >
      <Controller
        control={form.control}
        name="birthDate"
        render={({ field }) => <BirthDatePicker value={field.value || null} onChange={(next) => field.onChange(next ?? '')} />}
      />
    </MobileSheet>
  )
}

function AccountPage() {
  const t = useT()
  const data = useMe(true).data
  const showPremium = usePremiumSheet((state) => state.show)
  const [birthOpen, setBirthOpen] = useState(false)
  return (
    <SettingsFrame title={t('settings.account')} overlay={<BirthDateSheet open={birthOpen} value={data?.birthDate} onClose={() => setBirthOpen(false)} />}>
      <Group title={t('onboarding.code.back')}>
        <ListRow icon={EnvelopeSimpleIcon} label="E-mail" value={data?.email} control="value" last />
      </Group>
      <Group footer={t('account.birthDateFooter')}>
        <ListRow icon={CakeIcon} label={t('account.birthDate')} value={formatBirthDate(data?.birthDate)} control="chevron" onPress={() => setBirthOpen(true)} last />
      </Group>
      <Group>
        <ListRow icon={CrownSimpleIcon} label={t('pending.premium')} value={data?.premium ? t('settings.premiumActive') : t('settings.premiumSoon')} control="chevron" onPress={() => showPremium()} last />
      </Group>
      <Group>
        <ListRow icon={TrashIcon} label={t('settings.deleteAccount')} control="none" destructive onPress={() => router.push('/delete-account')} last />
      </Group>
    </SettingsFrame>
  )
}

function PrivacyPage() {
  const t = useT()
  return (
    <SettingsFrame title={t('settings.privacyCategory')}>
      <Group title={t('board.scope')}>
        <ListRow icon={ProhibitIcon} label={t('privacy.blocked')} value={t('settings.premiumSoon')} control="value" disabled last />
      </Group>
      <Group title={t('privacy.data')}>
        <ListRow icon={ShieldCheckIcon} label={t('privacy.policy')} control="chevron" onPress={openPage('/privacy')} />
        <ListRow
          icon={DatabaseIcon}
          label={t('privacy.myData')}
          sub={t('privacy.myDataSub')}
          control="chevron"
          onPress={openPage('/data-deletion')}
          last
        />
      </Group>
    </SettingsFrame>
  )
}

function NotificationsPage() {
  const t = useT()
  const device = useDeviceSettings()
  const rematches = usePushRematches()
  const preferences = useNotificationPreferences()
  const setPreference = useSetNotificationPreference()
  const rooms = preferences.data?.find((item) => item.category === 'ROOM')?.enabled ?? true
  return (
    <SettingsFrame title={t('home.notifications')}>
      <ListGroup surface="surface">
        <PushPermissionRow />
      </ListGroup>
      <Group title={t('notifications.when')}>
        <ListRow
          icon={LightningIcon}
          label={t('settings.notifyChallenges')}
          sub={t('onboarding.notifications.challenge')}
          control="toggle"
          on={rooms}
          disabled={setPreference.isPending}
          onToggle={(enabled) => setPreference.mutate({ category: 'ROOM', enabled })}
        />
        <ListRow
          icon={ArrowCounterClockwiseIcon}
          label={t('settings.notifyRematches')}
          sub={t('onboarding.notifications.rematch')}
          control="toggle"
          on={device.notifyRematches}
          disabled={rematches.isPending}
          onToggle={(enabled) => rematches.mutate(enabled)}
        />
        <ListRow
          icon={MedalIcon}
          label={t('settings.notifyRanks')}
          sub={t('onboarding.notifications.rank')}
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
  const t = useT()
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
      title={t('settings.game')}
      overlay={
        <MobileSheet
          open={open}
          onClose={() => setOpen(false)}
          title={t('settings.interests')}
          subtitle={t('settings.interestsCount', { count: draft.length, max: MAX_INTERESTS })}
          tall
          footer={
            <Button
              full
              disabled={draft.join() === interests.join()}
              loading={saveInterests.isPending}
              onPress={() => saveInterests.mutate(draft, { onSuccess: () => setOpen(false) })}
            >
              {t('settings.save')}
            </Button>
          }
        >
          <View style={{ gap: tokens.space[4] }}>
            <Text variant="callout" color="muted">
              {t('settings.interestsText')}
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
      <Group title={t('pending.duel')}>
        <ListRow icon={SpeakerHighIcon} label={t('settings.sound')} control="toggle" on={device.sounds} onToggle={(sounds) => device.set({ sounds })} />
        <ListRow icon={VibrateIcon} label={t('mobile.settings.haptics')} control="toggle" on={device.haptics} onToggle={(haptics) => device.set({ haptics })} />
        <ListRow
          icon={CheckCircleIcon}
          label={t('settings.answerDetails')}
          sub={t('settings.answerDetailsSub')}
          control="toggle"
          on={device.answerDetails}
          onToggle={(answerDetails) => device.set({ answerDetails })}
          last
        />
      </Group>
      <Group title={t('game.matchmaking')}>
        <ListRow
          icon={RobotIcon}
          label={t('settings.autoTrain')}
          sub={t('settings.autoTrainSub')}
          control="toggle"
          on={autoTrain.enabled}
          disabled={autoTrain.pending}
          onToggle={autoTrain.set}
          last
        />
      </Group>
      <Group title={t('nav.home')}>
        <ListRow
          icon={SparkleIcon}
          label={t('settings.interests')}
          sub={interests.map((category) => tokens.category[category as CategoryCode]?.label ?? category).join(', ') || t('settings.interestsEmpty')}
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
  const t = useT()
  const data = useMe(true).data
  const language = useUpdateMe('language')
  const appearance = useThemeStore((state) => state.preference)
  const setAppearance = useThemeStore((state) => state.setPreference)
  const [sheet, setSheet] = useState<'language' | 'appearance'>()
  return (
    <SettingsFrame
      title={t('settings.display')}
      overlay={
        <>
          <MobileSheet open={sheet === 'language'} onClose={() => setSheet(undefined)} title={t('settings.language')}>
            <ListGroup surface="surface">
              <RadioGroup label={t('settings.language')}>
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
          <MobileSheet open={sheet === 'appearance'} onClose={() => setSheet(undefined)} title={t('settings.appearance')}>
            <ListGroup surface="surface">
              <RadioGroup label={t('settings.appearance')}>
                {APPEARANCE().map((option, index) => (
                  <ListRow
                    key={option.value}
                    label={option.label}
                    control="radio"
                    on={appearance === option.value}
                    last={index === APPEARANCE().length - 1}
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
          label={t('settings.language')}
          value={LANGUAGES.find((option) => option.value === (data?.language ?? 'fr'))?.label}
          control="chevron"
          onPress={() => setSheet('language')}
        />
        <ListRow
          icon={PaletteIcon}
          label={t('settings.appearance')}
          value={APPEARANCE().find((option) => option.value === appearance)?.label}
          control="chevron"
          onPress={() => setSheet('appearance')}
          last
        />
      </Group>
    </SettingsFrame>
  )
}

function HelpPage() {
  const t = useT()
  return (
    <SettingsFrame title={t('settings.help')}>
      <Group>
        <ListRow icon={LifebuoyIcon} label={t('tooYoung.support')} control="chevron" onPress={() => void Linking.openURL(SUPPORT).catch(() => undefined)} />
        <ListRow icon={FileTextIcon} label={t('settings.terms')} control="chevron" onPress={openPage('/terms')} />
        <ListRow icon={ShieldCheckIcon} label={t('privacy.policy')} control="chevron" onPress={openPage('/privacy')} last />
      </Group>
      <Group>
        <ListRow icon={InfoIcon} label={t('help.version')} value={appVersion} control="value" last />
      </Group>
    </SettingsFrame>
  )
}
