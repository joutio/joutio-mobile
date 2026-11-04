import { SwordIcon, EmptyState, MobileTopBar, Screen } from '@/design-system'

/** Onglet Défis provisoire : son écran suit l'ordre du kit (`design/specs/mobile-kit.md` § 4). */
export default function DefisTab() {
  return (
    <Screen inTabs header={<MobileTopBar title="Défis" />} contentStyle={{ flexGrow: 1 }}>
      <EmptyState fill icon={SwordIcon} title="Défis" description="Cet écran arrive dans une prochaine étape." />
    </Screen>
  )
}
