import { CATEGORY_ICONS, type IconProps } from '../icons'
import { tokens, type CategoryCode } from '../tokens.generated'

/** Icône d'un univers, d'après `tokens.category.*.icon`. */
export function CategoryIcon({ category, ...props }: IconProps & { category: CategoryCode }) {
  const IconComponent = CATEGORY_ICONS[tokens.category[category].icon]
  return <IconComponent {...props} />
}

/** Code d'univers du BFF (chaîne libre) → code connu des tokens, ou `GENERAL`. */
export function toCategoryCode(value: string | null | undefined): CategoryCode {
  return value && value in tokens.category ? (value as CategoryCode) : 'GENERAL'
}
