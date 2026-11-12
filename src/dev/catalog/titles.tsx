import { useState } from 'react'
import { ListGroup, Text, TitleRow, tokens, type TierCode } from '@/design-system'
import { Specimen } from './kit'

const TIERS = Object.keys(tokens.tier) as TierCode[]

/** Validation sur appareil des sept matières, du port et des longs rubans. */
export function TitleRowDemo() {
  const [worn, setWorn] = useState<string | null>('OR')
  return (
    <>
      <Text variant="caption" color="muted">
        Touche une ligne pour porter ou enlever le titre. Les titres longs sont tronqués avec une ellipse, sans défilement.
      </Text>
      <Specimen label="Les sept paliers · Porter / Enlever">
        <ListGroup surface="surface">
          {TIERS.map((tier, index) => (
            <TitleRow
              key={tier}
              tier={tier}
              title={index % 2 ? 'Grand gardien des histoires extraordinaires et des royaumes oubliés' : 'Gardien des rois'}
              worn={worn === tier}
              onWear={() => setWorn(worn === tier ? null : tier)}
              last={index === TIERS.length - 1}
            />
          ))}
        </ListGroup>
      </Specimen>
      <Specimen label="Verrouillé · progression conservée">
        <ListGroup surface="surface">
          <TitleRow tier="DIAMANT" title="Souverain des royaumes oubliés" locked progress={{ value: 62, label: "212 points d'expérience restants" }} last />
        </ListGroup>
      </Specimen>
    </>
  )
}
