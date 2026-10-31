import { SvgXml } from "react-native-svg";

interface JoutioMarkProps {
  size?: number;
}

/**
 * Marque Joutio — contenu visuel exact de `design/assets/logo-mark.svg`.
 * Le SVG source complet (avec métadonnées C2PA) reste la référence design ;
 * ce markup en reprend les trois éléments : tuile, j, point ambre.
 */
const LOGO_MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="28" fill="#181818"/>
  <path d="M60 44V66A18 18 0 0 1 42 84H36" fill="none" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="60" cy="24" r="7" fill="#E8B04A"/>
</svg>`;

export function JoutioMark({ size = 44 }: JoutioMarkProps) {
  return (
    <SvgXml
      xml={LOGO_MARK}
      width={size}
      height={size}
      accessibilityLabel="Joutio"
    />
  );
}
