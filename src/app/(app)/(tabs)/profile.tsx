import { router } from 'expo-router'
import { View } from 'react-native'
import { Button, EmptyState, MobileTopBar, Screen, tokens, UserIcon } from '@/design-system'
import { useLogout } from '@/features/auth'
import { useMe } from '@/features/me'
import { config } from '@/lib/config'

/** Onglet Profil provisoire (écran n° 8 du kit) : garde l'accès au catalogue et la déconnexion. */
export default function ProfileTab() {
  const me = useMe()
  const logout = useLogout()
  return (
    <Screen inTabs header={<MobileTopBar title="Profil" />} contentStyle={{ flexGrow: 1, padding: tokens.space[5], gap: tokens.space[4] }}>
      <EmptyState fill icon={UserIcon} title={me.data?.pseudonym ?? 'Profil'} description="Cet écran arrive dans une prochaine étape." />
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
