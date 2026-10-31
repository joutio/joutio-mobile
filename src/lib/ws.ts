import { AppState } from "react-native";
import { Client, ReconnectionTimeMode, type IMessage } from "@stomp/stompjs";
import { create } from "zustand";
import { getAccessToken, refreshAccessToken } from "./auth";
import { config } from "./config";

type Handler = (body: unknown) => void;

interface StompState {
  connected: boolean;
}

/** État de la connexion : le sondage REST ralentit tant qu'elle tient. */
export const useStompStore = create<StompState>(() => ({ connected: false }));

const destinations = new Map<string, Set<Handler>>();
const brokerSubscriptions = new Map<string, { unsubscribe: () => void }>();
const reconnectHandlers = new Set<() => void>();

function deliver(destination: string, message: IMessage): void {
  let body: unknown;
  try {
    body = JSON.parse(message.body);
  } catch {
    return;
  }
  destinations.get(destination)?.forEach((handler) => handler(body));
}

function brokerSubscribe(destination: string): void {
  brokerSubscriptions.set(
    destination,
    client.subscribe(destination, (message) => deliver(destination, message)),
  );
}

const client = new Client({
  webSocketFactory: () =>
    new WebSocket(`${config.apiUrl.replace(/^http/, "ws")}/ws/websocket`),
  reconnectDelay: 1000,
  reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
  maxReconnectDelay: 30_000,
  heartbeatIncoming: 10_000,
  heartbeatOutgoing: 10_000,
  // Requis sous React Native : la pile WebSocket tronque les trames au NULL final.
  forceBinaryWSFrames: true,
  appendMissingNULLonIncoming: true,
  debug: () => undefined,
  beforeConnect: () => {
    const token = getAccessToken();
    client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  },
  onConnect: () => {
    brokerSubscriptions.clear();
    destinations.forEach((_handlers, destination) => brokerSubscribe(destination));
    useStompStore.setState({ connected: true });
    reconnectHandlers.forEach((handler) => handler());
  },
  onWebSocketClose: () => {
    brokerSubscriptions.clear();
    useStompStore.setState({ connected: false });
  },
  // Token expiré : la prochaine reconnexion présente le token rafraîchi.
  onStompError: () => {
    void refreshAccessToken().catch(() => undefined);
  },
});

// En arrière-plan la connexion se ferme : le BFF voit le joueur hors ligne.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    if (destinations.size > 0 && !client.active) client.activate();
  } else if (client.active) {
    void client.deactivate();
  }
});

/** Abonne un handler à une destination, sur la connexion unique du BFF. */
export function subscribeStomp(destination: string, handler: Handler): () => void {
  let handlers = destinations.get(destination);
  if (!handlers) {
    handlers = new Set();
    destinations.set(destination, handlers);
  }
  handlers.add(handler);

  if (client.connected) {
    if (!brokerSubscriptions.has(destination)) brokerSubscribe(destination);
  } else if (!client.active) {
    client.activate();
  }

  return () => {
    const current = destinations.get(destination);
    current?.delete(handler);
    if (current?.size) return;
    destinations.delete(destination);
    brokerSubscriptions.get(destination)?.unsubscribe();
    brokerSubscriptions.delete(destination);
    if (destinations.size === 0) void client.deactivate();
  };
}

/** Rappelé à chaque (re)connexion, pour rattraper ce qui a été manqué. */
export function onStompConnect(handler: () => void): () => void {
  reconnectHandlers.add(handler);
  return () => reconnectHandlers.delete(handler);
}
