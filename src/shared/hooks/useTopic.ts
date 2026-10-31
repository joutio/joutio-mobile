import { useEffect, useRef } from "react";
import { onStompConnect, subscribeStomp } from "@/lib/ws";

/** Abonnement STOMP lié au composant ; `onConnect` rattrape après une coupure. */
export function useTopic<T>(
  destination: string | null,
  onMessage: (message: T) => void,
  onConnect?: () => void,
): void {
  const handlers = useRef({ onMessage, onConnect });
  handlers.current = { onMessage, onConnect };

  useEffect(() => {
    if (!destination) return;
    const unsubscribe = subscribeStomp(destination, (body) =>
      handlers.current.onMessage(body as T),
    );
    const stop = onStompConnect(() => handlers.current.onConnect?.());
    return () => {
      stop();
      unsubscribe();
    };
  }, [destination]);
}
