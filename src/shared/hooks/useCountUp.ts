import { useEffect, useRef, useState } from "react";

/** Fait défiler un nombre vers sa nouvelle valeur (scores, XP). */
export function useCountUp(value: number, durationMs = 900): number {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);

  useEffect(() => {
    const from = shownRef.current;
    if (from === value) return;
    const start = Date.now();
    let frame = 0;
    const step = () => {
      const progress = Math.min(1, (Date.now() - start) / durationMs);
      const next = Math.round(from + (value - from) * progress);
      shownRef.current = next;
      setShown(next);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [durationMs, value]);

  return shown;
}
