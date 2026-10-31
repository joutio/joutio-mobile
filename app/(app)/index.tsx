import { Redirect } from "expo-router";
import { HOME_HREF } from "@/lib/navigation";

/** `/` redirige vers l'onglet Accueil natif. */
export default function AppIndex() {
  return <Redirect href={HOME_HREF} />;
}
