/**
 * Catégories de sujets : libellés et couleurs du design system 2.1.
 * La table locale est centralisée dans `src/ui/tokens.ts` (source :
 * `design/tokens.json`) pour éviter les doublons entre mobile et web.
 */
import {
  categoryHex,
  categoryLabel as tokenCategoryLabel,
} from "@/ui/tokens";

export function categoryColor(code: string): string {
  return categoryHex(code);
}

export function categoryLabel(code: string, fallback?: string): string {
  return tokenCategoryLabel(code, fallback);
}
