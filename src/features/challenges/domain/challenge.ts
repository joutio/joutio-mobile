import type { ChallengeView, RoomView } from "@/shared/types/bff";

export interface PendingChallenges {
  received: ChallengeView[];
  sent: ChallengeView[];
  rooms: RoomView[];
  total: number;
}

function isActive(expiresAt: string, now: number): boolean {
  return Date.parse(expiresAt) > now;
}

/** Sépare les défis reçus et envoyés, sans ce qui a déjà expiré côté horloge locale. */
export function splitPending(
  challenges: ChallengeView[],
  rooms: RoomView[],
  userId: string | undefined,
  now: number,
): PendingChallenges {
  const active = challenges.filter((item) => isActive(item.expiresAt, now));
  const received = active.filter((item) => item.opponent?.userId === userId);
  const sent = active.filter((item) => item.challenger?.userId === userId);
  const openRooms = rooms.filter((item) => isActive(item.expiresAt, now));
  return {
    received,
    sent,
    rooms: openRooms,
    total: received.length + sent.length + openRooms.length,
  };
}

/** Délai restant court : « 52 min », « 5 h », « 2 j ». */
export function remainingLabel(expiresAt: string, now: number): string {
  const minutes = Math.max(
    1,
    Math.ceil((Date.parse(expiresAt) - now) / 60_000),
  );
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} j`;
}
