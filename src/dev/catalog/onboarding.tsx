import { useState, type ReactNode } from 'react'
import { View } from 'react-native'
import {
  CategoryTile,
  CodeInput,
  ForceDark,
  Logo,
  PageDots,
  RadioGroup,
  SocialButton,
  SplashLogo,
  tokens,
  TopicCard,
  TopicRow,
  useTheme,
  type CategoryCode,
} from '@/design-system'
import { SAMPLE_BANNER, SAMPLE_IMAGE, Specimen } from './kit'

export function LogoDemo() {
  return (
    <>
      <Specimen label="mark" row>
        <Logo size={24} />
        <Logo size={32} />
        <Logo size={48} />
      </Specimen>
      <Specimen label="lockup">
        <Logo variant="lockup" size={32} />
      </Specimen>
    </>
  )
}

function DarkPanel({ children }: { children: ReactNode }) {
  const { colors, radius } = useTheme()
  return <View style={{ alignItems: 'center', paddingVertical: tokens.space[8], borderRadius: radius.lg, backgroundColor: colors.bg }}>{children}</View>
}

export function SplashLogoDemo() {
  return (
    <>
      <Specimen label="launch (toujours sombre)">
        <ForceDark>
          <DarkPanel>
            <SplashLogo />
          </DarkPanel>
        </ForceDark>
      </Specimen>
      <Specimen label="loading (respire)">
        <SplashLogo variant="loading" />
      </Specimen>
    </>
  )
}

export function SocialButtonDemo() {
  return (
    <>
      <SocialButton provider="google" />
      <SocialButton provider="facebook" />
      <SocialButton provider="google" loading />
    </>
  )
}

export function CodeInputDemo() {
  const [code, setCode] = useState('')
  return (
    <>
      <Specimen label="Saisie (000000 : erreur)">
        <CodeInput value={code} onChange={setCode} error={code === '000000'} />
      </Specimen>
      <Specimen label="Focus forcé">
        <CodeInput value="12" onChange={() => undefined} focused />
      </Specimen>
      <Specimen label="Erreur">
        <CodeInput value="483920" onChange={() => undefined} error />
      </Specimen>
    </>
  )
}

const TILES: CategoryCode[] = ['HISTORY', 'SCIENCE', 'MOVIES', 'SPORTS', 'MUSIC', 'GAMES']

export function CategoryTileDemo() {
  const [selected, setSelected] = useState<CategoryCode[]>(['HISTORY'])
  const full = selected.length === 3
  return (
    <Specimen label="1 à 3 choix ; au 3e, les autres se désactivent">
      {[TILES.slice(0, 3), TILES.slice(3)].map((row, index) => (
        <View key={index} style={{ flexDirection: 'row', gap: tokens.space[3] }}>
          {row.map((category) => {
            const on = selected.includes(category)
            return (
              <CategoryTile
                key={category}
                category={category}
                selected={on}
                disabled={full && !on}
                onToggle={() => setSelected(on ? selected.filter((item) => item !== category) : [...selected, category])}
                style={{ flex: 1 }}
              />
            )
          })}
        </View>
      ))}
    </Specimen>
  )
}

export function PageDotsDemo() {
  return (
    <Specimen label="Étapes 1, 2, 3">
      <PageDots count={3} index={0} />
      <PageDots count={3} index={1} />
      <PageDots count={3} index={2} />
    </Specimen>
  )
}

const TOPICS = [
  { id: 'karnak', title: 'Karnak, la cité des dieux', category: 'HISTORY' as const, image: SAMPLE_BANNER },
  { id: 'olympia', title: "L'Olympia, temple de la chanson", category: 'MUSIC' as const, image: SAMPLE_IMAGE },
  { id: 'kings', title: 'Rois de France', category: 'HISTORY' as const },
]

export function TopicRowDemo() {
  const { colors, radius } = useTheme()
  const [picked, setPicked] = useState('karnak')
  return (
    <>
      <Specimen label="radio, dans un RadioGroup">
        <View style={{ borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' }}>
          <RadioGroup label="Premier thème">
            {TOPICS.map((topic, index) => (
              <TopicRow
                key={topic.id}
                {...topic}
                control="radio"
                on={picked === topic.id}
                onPress={() => setPicked(topic.id)}
                last={index === TOPICS.length - 1}
              />
            ))}
          </RadioGroup>
        </View>
      </Specimen>
      <Specimen label="chevron">
        <View style={{ borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' }}>
          <TopicRow title="Rois de France" category="HISTORY" sub="320 questions" onPress={() => undefined} last />
        </View>
      </Specimen>
    </>
  )
}

export function TopicCardDemo() {
  return (
    <>
      <Specimen label="landscape, image">
        <TopicCard title="Karnak, la cité des dieux" category="HISTORY" image={SAMPLE_BANNER} onPress={() => undefined} />
      </Specimen>
      <Specimen label="landscape, sans image">
        <TopicCard title="Rois de France" category="HISTORY" />
      </Specimen>
      <Specimen label="portrait" row>
        <TopicCard title="L'Olympia" category="MUSIC" image={SAMPLE_IMAGE} orientation="portrait" style={{ width: 140 }} />
        <TopicCard title="Échecs" category="GAMES" orientation="portrait" style={{ width: 140 }} />
      </Specimen>
    </>
  )
}
