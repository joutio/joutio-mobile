import { router } from 'expo-router'
import { useState } from 'react'

const close = () => (router.canGoBack() ? router.back() : router.replace('/catalog'))
import { BadgeUnlock, LightningIcon, RankPromotion, TitleUnlock, UnlockSequence } from '@/design-system'

/** Séquence de déblocages (`resultat.md` §§ 1-3) : rang, titre, puis badge, balayables, chacun en plein écran. */
export function UnlockSequenceDemo() {
  const [step, setStep] = useState(0)
  const [worn, setWorn] = useState(false)
  const pages = [
    <RankPromotion key="rank" from="OR" tier="PLATINE" next="EMERAUDE" name="Nadjim" text="Ton cadre change sur ton profil et en duel." nextRule="à 1 200." />,
    <TitleUnlock
      key="title"
      tier="OR"
      title="Connétable"
      topic="Histoire de France"
      text="Porte-le : il s'affiche sous ton nom, sur ton profil et en duel."
      next="PLATINE"
      nextRule="à 9 000 points d'expérience."
      worn={worn}
      onWear={() => setWorn(true)}
    />,
    <BadgeUnlock
      key="badge"
      tier="OR"
      badge="Réflexe absolu"
      family="Rapidité"
      icon={LightningIcon}
      text="30 bonnes réponses en moins de 3 s dans tes duels entre joueurs."
      next="PLATINE"
      nextRule="à 100 réponses rapides."
      reward={{ label: 'Essayer Micah' }}
    />,
  ]
  return <UnlockSequence pages={pages} step={step} onStepChange={setStep} onDone={close} />
}
