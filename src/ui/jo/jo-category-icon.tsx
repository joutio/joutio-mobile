import {
  Bank,
  BookOpenText,
  Briefcase,
  Cpu,
  FilmSlate,
  Flask,
  GameController,
  GlobeHemisphereWest,
  GraduationCap,
  Headphones,
  Leaf,
  Lightbulb,
  Palette,
  Pizza,
  Star,
  TelevisionSimple,
  Volleyball,
  type Icon,
} from "@/ui/phosphor";
import { categoryIcon } from "@/ui/tokens";

const ICONS: Record<string, Icon> = {
  volleyball: Volleyball,
  "graduation-cap": GraduationCap,
  flask: Flask,
  cpu: Cpu,
  star: Star,
  "book-open-text": BookOpenText,
  palette: Palette,
  headphones: Headphones,
  "film-slate": FilmSlate,
  "television-simple": TelevisionSimple,
  pizza: Pizza,
  bank: Bank,
  "game-controller": GameController,
  leaf: Leaf,
  briefcase: Briefcase,
  "globe-hemisphere-west": GlobeHemisphereWest,
  lightbulb: Lightbulb,
};

interface JoCategoryIconProps {
  category?: string | null;
  size: number;
}

/** Icône pleine posée sur la teinte de catégorie, quand le sujet n'a pas d'image. */
export function JoCategoryIcon({ category, size }: JoCategoryIconProps) {
  const Glyph = ICONS[categoryIcon(category ?? "GENERAL")] ?? Lightbulb;
  return <Glyph size={size} color="rgba(0,0,0,0.82)" weight="fill" />;
}
