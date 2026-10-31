import { useEffect, useState } from "react";

/** Passe à `true` à l'instant donné, sans horloge qui re-rend l'écran. */
export function useReached(at: number | null): boolean {
  const [reached, setReached] = useState(() => at !== null && Date.now() >= at);

  useEffect(() => {
    if (at === null) {
      setReached(false);
      return;
    }
    const delay = at - Date.now();
    setReached(delay <= 0);
    if (delay <= 0) return;
    const timer = setTimeout(() => setReached(true), delay);
    return () => clearTimeout(timer);
  }, [at]);

  return reached;
}
