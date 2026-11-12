import { TitleRowDemo } from './titles'
import { SearchHeaderDemo } from './search-header'
import { LoadMoreDemo } from './load-more'
import type { ComponentType } from 'react'
import { AvatarDemo, BadgeDemo, ButtonDemo, IconButtonDemo, PillDemo, PremiumBadgeDemo, SkeletonDemo } from './row1'
import { BottomNavDemo, MobileTopBarDemo, StickyScreenDemo } from './row2'
import {
  ChipDemo,
  FieldDemo,
  ListRowDemo,
  MatchRowDemo,
  PlayerRowDemo,
  RadioGroupDemo,
  SearchFieldDemo,
  JoutioTabsDemo,
  SegmentedDemo,
  SwitchDemo,
} from './row3'
import { BannerDemo, DialogDemo, NoticeDemo, MenuDemo, MobileSheetDemo, MobileSheetInputDemo, SheetHeaderDemo, ToastDemo } from './row4'
import { CategoryTileDemo, CodeInputDemo, LogoDemo, PageDotsDemo, SocialButtonDemo, SplashLogoDemo, TopicCardDemo, TopicRowDemo } from './onboarding'
import { BadgeFamilyRowDemo, RankLadderDemo, RewardCardDemo, StreakCalendarDemo, StreakDemo, TopicsDonutDemo } from './profile'
import { ChallengeListRowDemo, NotificationRowDemo } from './inbox'
import { UnlockSequenceDemo } from './result'
import { AdSlotDemo, AnswerEditorRowDemo, ModerationCardDemo } from './authoring'
import { CollapsibleTabsScreenDemo, EmptyStateDemo, FeedFooterDemo, ParallaxScreenDemo, SectionHeaderDemo } from './row5'

export interface CatalogEntry {
  id: string
  title: string
  /** Rangée du socle (kit mobile § 3). */
  row: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  /** Spec de référence dans `design/specs/`. */
  spec: string
  Demo: ComponentType
  /** La démo fournit son propre écran (Screen, ParallaxScreen). */
  fullscreen?: boolean
}

export const CATALOG: CatalogEntry[] = [
  { id: 'title-row', title: 'TitleRow · Rubans extensibles', row: 8, spec: 'components/contenu.md', Demo: TitleRowDemo },
  { id: 'search-header', title: 'Recherche animée Joutio', row: 2, spec: 'Social / Sujets — composants du lab', Demo: SearchHeaderDemo, fullscreen: true },
  { id: 'button', title: 'Button', row: 1, spec: 'components/button.md', Demo: ButtonDemo },
  { id: 'icon-button', title: 'IconButton', row: 1, spec: 'components/button.md', Demo: IconButtonDemo },
  { id: 'pill', title: 'Pill', row: 1, spec: 'components/primitives.md', Demo: PillDemo },
  { id: 'badge', title: 'Badge', row: 1, spec: 'components/primitives.md', Demo: BadgeDemo },
  { id: 'avatar', title: 'Avatar et RankFrame', row: 1, spec: 'components/primitives.md, marque.md', Demo: AvatarDemo },
  { id: 'premium-badge', title: 'PremiumBadge', row: 1, spec: 'components/marque.md', Demo: PremiumBadgeDemo },
  { id: 'skeleton', title: 'Skeleton', row: 1, spec: 'components/primitives.md', Demo: SkeletonDemo },
  { id: 'mobile-top-bar', title: 'MobileTopBar', row: 2, spec: 'components/navigation.md', Demo: MobileTopBarDemo },
  { id: 'bottom-nav', title: 'BottomNav', row: 2, spec: 'components/navigation.md', Demo: BottomNavDemo },
  { id: 'sticky-bar', title: 'Screen et StickyBar', row: 2, spec: 'foundations.md § 10', Demo: StickyScreenDemo, fullscreen: true },
  { id: 'list-row', title: 'ListRow', row: 3, spec: 'components/formulaires.md', Demo: ListRowDemo },
  { id: 'player-row', title: 'PlayerRow', row: 3, spec: 'components/listes.md', Demo: PlayerRowDemo },
  { id: 'match-row', title: 'MatchRow', row: 3, spec: 'components/listes.md', Demo: MatchRowDemo },
  { id: 'radio-group', title: 'RadioGroup', row: 3, spec: 'components/formulaires.md', Demo: RadioGroupDemo },
  { id: 'switch', title: 'Switch', row: 3, spec: 'components/formulaires.md', Demo: SwitchDemo },
  { id: 'joutio-tabs', title: 'JoutioTabs', row: 3, spec: 'components/navigation.md', Demo: JoutioTabsDemo },
  { id: 'segmented', title: 'Segmented', row: 3, spec: 'components/formulaires.md', Demo: SegmentedDemo },
  { id: 'field', title: 'Field', row: 3, spec: 'components/formulaires.md', Demo: FieldDemo },
  { id: 'search-field', title: 'SearchField', row: 3, spec: 'components/formulaires.md', Demo: SearchFieldDemo },
  { id: 'chip', title: 'Chip', row: 3, spec: 'components/primitives.md', Demo: ChipDemo },
  { id: 'mobile-sheet', title: 'MobileSheet', row: 4, spec: 'components/navigation.md', Demo: MobileSheetDemo },
  { id: 'mobile-sheet-input', title: 'MobileSheet avec saisie', row: 4, spec: 'components/navigation.md', Demo: MobileSheetInputDemo },
  { id: 'sheet-header', title: 'SheetHeader', row: 4, spec: 'components/navigation.md', Demo: SheetHeaderDemo },
  { id: 'dialog', title: 'Dialog', row: 4, spec: 'components/feedback.md', Demo: DialogDemo },
  { id: 'menu', title: 'Menu', row: 4, spec: 'components/feedback.md', Demo: MenuDemo },
  { id: 'toast', title: 'Toast', row: 4, spec: 'components/toast.md', Demo: ToastDemo },
  { id: 'banner', title: 'Banner', row: 4, spec: 'components/feedback.md', Demo: BannerDemo },
  { id: 'notice', title: 'Notice', row: 4, spec: 'components/feedback.md', Demo: NoticeDemo },
  { id: 'section-header', title: 'SectionHeader', row: 5, spec: 'components/primitives.md', Demo: SectionHeaderDemo },
  { id: 'empty-state', title: 'EmptyState', row: 5, spec: 'components/primitives.md', Demo: EmptyStateDemo },
  { id: 'native-load-more', title: 'Suite native (écran et feuille)', row: 5, spec: 'components/contenu.md', Demo: LoadMoreDemo, fullscreen: true },
  { id: 'feed-footer', title: 'FeedFooter', row: 5, spec: 'components/contenu.md', Demo: FeedFooterDemo },
  { id: 'parallax-screen', title: 'ParallaxScreen', row: 5, spec: 'screens/fiche-sujet.md', Demo: ParallaxScreenDemo, fullscreen: true },
  { id: 'collapsible-tabs-screen', title: 'CollapsibleTabsScreen', row: 5, spec: 'screens/fiche-sujet.md', Demo: CollapsibleTabsScreenDemo, fullscreen: true },
  { id: 'logo', title: 'Logo', row: 6, spec: 'components/marque.md', Demo: LogoDemo },
  { id: 'splash-logo', title: 'SplashLogo', row: 6, spec: 'components/marque.md', Demo: SplashLogoDemo },
  { id: 'social-button', title: 'SocialButton', row: 6, spec: 'components/formulaires.md', Demo: SocialButtonDemo },
  { id: 'code-input', title: 'CodeInput', row: 6, spec: 'components/formulaires.md', Demo: CodeInputDemo },
  { id: 'category-tile', title: 'CategoryTile', row: 6, spec: 'screens/onboarding.md', Demo: CategoryTileDemo },
  { id: 'page-dots', title: 'PageDots', row: 6, spec: 'components/feedback.md', Demo: PageDotsDemo },
  { id: 'topic-row', title: 'TopicRow', row: 6, spec: 'components/contenu.md', Demo: TopicRowDemo },
  { id: 'topic-card', title: 'TopicCard', row: 6, spec: 'components/contenu.md', Demo: TopicCardDemo },
  { id: 'unlock-sequence', title: 'UnlockSequence (rang, titre, badge)', row: 7, spec: 'screens/resultat.md', Demo: UnlockSequenceDemo, fullscreen: true },
  { id: 'streak', title: 'Streak', row: 8, spec: 'screens/profil.md', Demo: StreakDemo },
  { id: 'streak-calendar', title: 'StreakCalendar', row: 8, spec: 'screens/profil.md', Demo: StreakCalendarDemo },
  { id: 'topics-donut', title: 'TopicsDonut', row: 8, spec: 'screens/profil.md', Demo: TopicsDonutDemo },
  { id: 'badge-family-row', title: 'BadgeFamilyRow', row: 8, spec: 'screens/profil.md', Demo: BadgeFamilyRowDemo },
  { id: 'rank-ladder', title: 'RankLadder', row: 8, spec: 'screens/profil.md', Demo: RankLadderDemo },
  { id: 'reward-card', title: 'RewardCard', row: 8, spec: 'screens/profil.md', Demo: RewardCardDemo },
  { id: 'challenge-list-row', title: 'ChallengeListRow', row: 9, spec: 'screens/defis.md', Demo: ChallengeListRowDemo },
  { id: 'notification-row', title: 'NotificationRow', row: 9, spec: 'screens/notifications.md', Demo: NotificationRowDemo },
  { id: 'answer-editor-row', title: 'AnswerEditorRow', row: 10, spec: 'screens/creation.md', Demo: AnswerEditorRowDemo },
  { id: 'moderation-card', title: 'ModerationCard', row: 10, spec: 'screens/creation.md', Demo: ModerationCardDemo },
  { id: 'ad-slot', title: 'AdSlot', row: 10, spec: 'screens/etats-systeme.md', Demo: AdSlotDemo },
]

export const ROW_TITLES: Record<CatalogEntry['row'], string> = {
  1: 'Primitives',
  2: 'Structure',
  3: 'Saisie et listes',
  4: 'Feuilles et retours',
  5: 'Contenu',
  6: 'Métier : onboarding',
  7: 'Métier : résultat',
  8: 'Métier : profil',
  9: 'Métier : défis et notifications',
  10: 'Métier : création et états système',
}
