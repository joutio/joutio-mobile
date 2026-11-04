import { router } from 'expo-router'
import { View } from 'react-native'
import { Button, EmptyState, HouseIcon, Screen, tokens } from '@/design-system'
import { useLogout } from '@/features/auth'
import { useMe } from '@/features/me'
import { config } from '@/lib/config'

/** Accueil provisoire : l'écran Accueil est la prochaine étape du kit (§ 4, n° 2). */
export default function Home() {
  const me = useMe()
  const logout = useLogout()
  return (
    <Screen nativeHeader contentStyle={{ flexGrow: 1, padding: tokens.space[5], gap: tokens.space[4] }}>
      <EmptyState
        icon={HouseIcon}
        title="L'accueil arrive"
        description={`${me.data?.pseudonym ? `${me.data.pseudonym}, l` : 'L'}'onboarding est terminé. L'écran Accueil est la prochaine étape.`}
      />
      <View style={{ gap: tokens.space[3] }}>
        {config.catalogEnabled && (
          <Button full variant="tinted" onPress={() => router.push('/catalog')}>
            Catalogue des composants
          </Button>
        )}
        <Button full variant="gray" tone="neutral" loading={logout.isPending} onPress={() => logout.mutate()}>
          Se déconnecter
        </Button>
      </View>
    </Screen>
  )
}
