/** Options proposées par l'éditeur (Micah), libellés du lab (`design/src/lab/fixtures/avatars.ts`). */
export interface AvatarVariant {
  value: string
  label: string
}

export const HAIR: readonly AvatarVariant[] = [
  { value: 'fonze', label: 'Banane' },
  { value: 'dannyPhantom', label: 'Mèche' },
  { value: 'dougFunny', label: 'Courts' },
  { value: 'full', label: 'Longs' },
  { value: 'mrClean', label: 'Rasés' },
  { value: 'mrT', label: 'Crête' },
  { value: 'pixie', label: 'Pixie' },
  { value: 'turban', label: 'Turban' },
]

export const EYES: readonly AvatarVariant[] = [
  { value: 'eyes', label: 'Naturels' },
  { value: 'eyesShadow', label: 'Ombrés' },
  { value: 'round', label: 'Ronds' },
  { value: 'smiling', label: 'Rieurs' },
  { value: 'smilingShadow', label: 'Malicieux' },
]

export const MOUTHS: readonly AvatarVariant[] = [
  { value: 'laughing', label: 'Rire' },
  { value: 'smile', label: 'Sourire' },
  { value: 'smirk', label: 'En coin' },
  { value: 'surprised', label: 'Surprise' },
  { value: 'nervous', label: 'Nerveuse' },
  { value: 'pucker', label: 'Bisou' },
  { value: 'frown', label: 'Moue' },
  { value: 'sad', label: 'Triste' },
]

export const GLASSES: readonly AvatarVariant[] = [
  { value: 'none', label: 'Aucune' },
  { value: 'round', label: 'Rondes' },
  { value: 'square', label: 'Carrées' },
]

export const HAIR_COLORS = [
  '#18181b',
  '#3f3f46',
  '#78350f',
  '#b45309',
  '#dc2626',
  '#db2777',
  '#7c3aed',
  '#2563eb',
  '#0891b2',
  '#16a34a',
  '#facc15',
  '#f472b6',
  '#e5e7eb',
] as const
