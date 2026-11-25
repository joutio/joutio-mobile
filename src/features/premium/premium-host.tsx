import { View } from 'react-native'
import {
  Button,
  ChartLineUpIcon,
  CheckIcon,
  CrownSimpleIcon,
  LightningIcon,
  ListGroup,
  ListRow,
  MobileSheet,
  PencilSimpleIcon,
  ProhibitIcon,
  Text,
  tokens,
  useDeviceSettings,
  UserCircleIcon,
  useTheme,
} from '@/design-system'
import { limitReason, planLimits, PREMIUM_LIMITS as P } from '@joutio/client/premium'
import { useMe } from '@joutio/client/me'
import { usePremiumSheet } from './premium-store'
import { t, useT } from '@/lib/i18n'

/** Chiffres tirés des limites Premium par défaut, jamais figés dans les textes (`premium.md` § 2). */
const PERKS = () => [
  { icon: ProhibitIcon, label: t('premium.perkAds') },
  { icon: LightningIcon, label: t('premium.perkLimits', { challenges: P.pendingChallenges, rooms: P.openRooms }) },
  { icon: ChartLineUpIcon, label: t('premium.perkStats') },
  { icon: UserCircleIcon, label: t('premium.perkAvatars') },
  { icon: PencilSimpleIcon, label: t('premium.perkCreation', { topics: P.publishedTopics, questions: P.questionsPerTopic }) },
]

/**
 * Feuille Premium (`premium.md`), état **Bientôt** : l'offre n'est pas ouverte (achat StoreKit / Play Billing à venir),
 * ni prix ni essai ; « Rejoindre la liste », puis « Tu es sur la liste ». Rendue une fois, dans le layout `(app)`.
 */
export function PremiumHost() {
  const t = useT()
  const { colors, radius } = useTheme()
  const open = usePremiumSheet((state) => state.open)
  const context = usePremiumSheet((state) => state.context)
  const hide = usePremiumSheet((state) => state.hide)
  const joined = useDeviceSettings((state) => state.premiumWaitlist)
  const set = useDeviceSettings((state) => state.set)
  const limits = planLimits(useMe().data)
  const pitch = context === 'offer' ? t('premium.soonPitch') : limitReason(context, limits)
  return (
    <MobileSheet
      open={open}
      onClose={hide}
      title={t('pending.premium')}
      tall
      footer={
        <View style={{ gap: tokens.space[3] }}>
          <Button
            full
            icon={joined ? CheckIcon : undefined}
            variant={joined ? 'gray' : 'filled'}
            tone={joined ? 'neutral' : 'accent'}
            disabled={joined}
            onPress={() => set({ premiumWaitlist: true })}
          >
            {joined ? t('premium.joined') : t('premium.join')}
          </Button>
          <Text variant="caption" color="muted" align="center">
            {t('premium.waitlistText')}
          </Text>
        </View>
      }
    >
      <View style={{ gap: tokens.space[5] }}>
        <View style={{ alignItems: 'center', gap: tokens.space[3] }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: radius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.accent,
              transform: [{ rotate: '-6deg' }],
            }}
          >
            <CrownSimpleIcon size={32} weight="fill" color={colors.onAccent} />
          </View>
          <Text variant="title2" align="center" accessibilityRole="header">
            {t('premium.headline')}
          </Text>
          <Text variant="callout" color="muted" align="center">
            {pitch}
          </Text>
        </View>
        <ListGroup>
          {PERKS().map((perk, index) => (
            <ListRow key={perk.label} icon={perk.icon} label={perk.label} control="none" last={index === PERKS().length - 1} />
          ))}
        </ListGroup>
      </View>
    </MobileSheet>
  )
}
