import { View } from 'react-native'
import {
  BadgeFamilyRow,
  FireIcon,
  LightningIcon,
  RankLadder,
  RewardCard,
  Streak,
  StreakCalendar,
  SwordIcon,
  TopicsDonut,
  tokens,
  useTheme,
  type LadderRung,
} from '@/design-system'
import { Specimen } from './kit'

function Card({ children }: { children: React.ReactNode }) {
  const { colors, radius } = useTheme()
  return <View style={{ borderRadius: radius.lg, backgroundColor: colors.surface, padding: tokens.space[5] }}>{children}</View>
}

export function StreakDemo() {
  return (
    <>
      <Specimen label="En cours">
        <Card>
          <Streak count={4} hint="Record 12 · Argent à 14 jours" week={['done', 'done', 'done', 'today', 'future', 'future', 'future']} />
        </Card>
      </Specimen>
      <Specimen label="Jour manqué">
        <Card>
          <Streak count={1} week={['done', 'missed', 'done', 'today', 'future', 'future', 'future']} />
        </Card>
      </Specimen>
      <Specimen label="À lancer, compact">
        <Card>
          <Streak count={0} hint="Joue un duel aujourd'hui pour lancer ta série" compact />
        </Card>
      </Specimen>
    </>
  )
}

export function StreakCalendarDemo() {
  return (
    <Card>
      <StreakCalendar
        month="Octobre 2026"
        legend="18 jours actifs"
        offset={3}
        days={31}
        today={29}
        active={[1, 2, 5, 6, 7, 9, 12, 13, 14, 15, 16, 19, 20, 22, 23, 26, 27, 28]}
      />
    </Card>
  )
}

export function TopicsDonutDemo() {
  return (
    <Card>
      <TopicsDonut
        label="Sujets joués"
        data={[
          { key: 'history', label: 'Histoire', value: 42, color: tokens.category.HISTORY.color },
          { key: 'nature', label: 'Animaux du monde', value: 28, color: tokens.category.NATURE.color },
          { key: 'music', label: 'Musique', value: 14, color: tokens.category.MUSIC.color },
          { key: 'sports', label: 'Sports', value: 9, color: tokens.category.SPORTS.color },
          { key: 'movies', label: 'Cinéma', value: 6, color: tokens.category.MOVIES.color },
          { key: 'games', label: 'Jeux vidéo', value: 3, color: tokens.category.GAMES.color },
          { key: 'science', label: 'Sciences', value: 2, color: tokens.category.SCIENCE.color },
        ]}
      />
    </Card>
  )
}

export function BadgeFamilyRowDemo() {
  return (
    <>
      <BadgeFamilyRow name="Rapidité" icon={LightningIcon} meta="Or · 30 / 100" earned={4} progress={30} onPress={() => undefined} />
      <BadgeFamilyRow name="Série" icon={FireIcon} meta="4 / 5" earned={0} progress={80} />
    </>
  )
}

const RUNGS: LadderRung[] = [
  { tier: 'FER', rule: '3 duels', status: 'Acquis', earned: true },
  { tier: 'BRONZE', rule: '10 duels', status: 'Acquis', earned: true },
  { tier: 'ARGENT', rule: '30 duels', status: '18 / 30' },
  { tier: 'OR', rule: '100 duels', status: '—' },
]

export function RankLadderDemo() {
  return <RankLadder rungs={RUNGS} icon={SwordIcon} />
}

export function RewardCardDemo() {
  return (
    <>
      <RewardCard title="Avatar de base" state="active" rule="Offert à tous les joueurs." />
      <RewardCard title="Micah" state="locked" rule="Badge Régulier : 7 jours de série." progress={57} progressLabel="4 sur 7" />
      <RewardCard title="Lorelei" state="premium" rule="Inclus dans Premium." cta={{ label: 'Découvrir Premium' }} />
    </>
  )
}
