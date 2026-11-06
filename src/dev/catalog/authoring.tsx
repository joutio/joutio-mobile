import { useState } from 'react'
import { AdSlot, AnswerEditorRow, ListGroup, ModerationCard, RadioGroup } from '@/design-system'
import { Specimen } from './kit'

export function AnswerEditorRowDemo() {
  const [answers, setAnswers] = useState(['François Ier', 'Louis XIV', '', ''])
  const [correct, setCorrect] = useState(0)
  const english = ['Francis I', '', '', '']
  return (
    <>
      <Specimen label="Français, bonne réponse choisie">
        <RadioGroup label="Bonne réponse">
          <ListGroup surface="surface">
            {answers.map((answer, index) => (
              <AnswerEditorRow
                key={index}
                index={index + 1}
                value={answer}
                correct={correct === index}
                onChange={(next) => setAnswers(answers.map((item, position) => (position === index ? next : item)))}
                onMarkCorrect={() => setCorrect(index)}
                last={index === answers.length - 1}
              />
            ))}
          </ListGroup>
        </RadioGroup>
      </Specimen>
      <Specimen label="Anglais : la réponse française en indication">
        <ListGroup surface="surface">
          {english.map((answer, index) => (
            <AnswerEditorRow
              key={index}
              index={index + 1}
              value={answer}
              placeholder={answers[index] || undefined}
              correct={correct === index}
              last={index === 3}
            />
          ))}
        </ListGroup>
      </Specimen>
    </>
  )
}

export function ModerationCardDemo() {
  return (
    <>
      <Specimen label="À valider">
        <ModerationCard
          author="Hugo L. · Rédacteur · hier"
          question="Quel roi a fait construire le château de Chambord ?"
          answers={['François Ier', 'Louis XIV', 'Henri IV', 'Louis XI']}
          correct={0}
        />
      </Specimen>
      <Specimen label="Approbation en cours">
        <ModerationCard
          author="Inès B. · Rédactrice · lundi"
          question="Sur quel fleuve se trouve Amboise ?"
          answers={['La Loire', 'Le Cher', 'La Seine', "L'Indre"]}
          correct={0}
          busy="approve"
        />
      </Specimen>
    </>
  )
}

export function AdSlotDemo() {
  return (
    <Specimen label="Place réservée (pas de régie en V1)">
      <AdSlot />
    </Specimen>
  )
}
