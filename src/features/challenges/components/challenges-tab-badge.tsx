import { JoTabBadge } from "@/ui/jo/jo-tab-bar";
import { usePendingChallenges } from "../hooks/useChallenges";

/** Isolé de la barre : le sondage des défis ne redessine que cette pastille. */
export function ChallengesTabBadge() {
  const { total } = usePendingChallenges();
  return <JoTabBadge count={total} />;
}
