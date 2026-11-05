import { router } from 'expo-router'
import { useMemo } from 'react'
import { View } from 'react-native'
import { Button, CrownSimpleIcon, MobileTopBar, RewardCard, Screen, Skeleton, Text, tokens } from '@/design-system'
import { avatarStylesFor } from '@/features/avatar/lib/avatar-styles'
import { useAvatarPreview } from '@/features/avatar/lib/avatar-preview'
import { useMe } from '@/features/me'
import { usePremiumSheet } from '@/features/premium/premium-store'
import { useMyBadges, useMyRewards } from '../hooks/use-profile'

/**
 * Récompenses (`profil.md` § 2) : lecture seule, une `RewardCard` par style d'avatar, sans action, puis « Découvrir
 * Premium ». Choisir son avatar se fait dans l'éditeur.
 */
export function RewardsScreen() {
  const me = useMe(true)
  const rewards = useMyRewards()
  const badges = useMyBadges()
  const showPremium = usePremiumSheet((state) => state.show)
  const preview = useAvatarPreview()
  const styles = useMemo(() => avatarStylesFor(me.data, rewards.data, badges.data), [me.data, rewards.data, badges.data])
  const ready = Boolean(me.data && rewards.data)
  return (
    <Screen
      inTabs
      header={<MobileTopBar variant="inline" back="Profil" onBack={() => router.back()} title="Récompenses" />}
      contentStyle={{ gap: tokens.space[4], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[2], paddingBottom: tokens.space[7] }}
    >
      <Text variant="callout" color="muted">
        Les styles d'avatar se débloquent par tes badges ou avec Premium.
      </Text>
      {ready ? (
        styles.map((style) => (
          <RewardCard
            key={style.id}
            title={style.title}
            state={style.state}
            rule={style.rule}
            progress={style.progress}
            progressLabel={style.progressLabel}
            image={preview(style.id)}
          />
        ))
      ) : (
        <View style={{ gap: tokens.space[4] }}>
          <Skeleton shape="card" />
          <Skeleton shape="card" />
        </View>
      )}
      {!me.data?.premium && (
        <Button full icon={CrownSimpleIcon} style={{ marginTop: tokens.space[2] }} onPress={() => showPremium()}>
          Découvrir Premium
        </Button>
      )}
    </Screen>
  )
}
