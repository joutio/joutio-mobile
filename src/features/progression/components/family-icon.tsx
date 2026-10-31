import {
  CalendarCheck,
  Compass,
  Crown,
  Eye,
  Fire,
  Gauge,
  GraduationCap,
  Megaphone,
  Sparkle,
  Stack,
  Sword,
  Target,
  UsersThree,
  type Icon,
} from "@/ui/phosphor";

const ICONS: Record<string, Icon> = {
  VOLUME: Sword,
  VICTORY: Crown,
  MASTERY: GraduationCap,
  EXPLOIT: Sparkle,
  SERIES: Fire,
  ASSIDUITY: CalendarCheck,
  SOCIAL: UsersThree,
  CHALLENGES: Megaphone,
  VISION: Eye,
  PRECISION: Target,
  SPEED: Gauge,
  EXPLORATION: Compass,
  COLLECTION: Stack,
};

export const FAMILY_LABEL: Record<string, string> = {
  VOLUME: "Volume",
  VICTORY: "Victoires",
  MASTERY: "Maîtrise",
  EXPLOIT: "Exploit",
  SERIES: "Série",
  ASSIDUITY: "Assiduité",
  SOCIAL: "Social",
  CHALLENGES: "Défis",
  VISION: "Vision",
  PRECISION: "Précision",
  SPEED: "Rapidité",
  EXPLORATION: "Exploration",
  COLLECTION: "Collection",
};

/** Emblème d'une famille de badges, passé à `JoBadge`. */
export function familyIcon(family: string) {
  const FamilyIcon = ICONS[family] ?? Sparkle;
  return ({ size, color }: { size: number; color: string }) => (
    <FamilyIcon size={size} color={color} weight="fill" />
  );
}
