import { UsersIcon, EmptyState, MobileTopBar, Screen } from '@/design-system'

/** Onglet Social provisoire : son écran suit l'ordre du kit (`design/specs/mobile-kit.md` § 4). */
export default function SocialTab() {
  return (
    <Screen inTabs header={<MobileTopBar title="Social" />} contentStyle={{ flexGrow: 1 }}>
      <EmptyState fill icon={UsersIcon} title="Social" description="Cet écran arrive dans une prochaine étape." />
    </Screen>
  )
}
