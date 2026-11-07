import type { QueryClient, QueryKey } from '@tanstack/react-query'

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const identity = (value: unknown): string | undefined => {
  if (!object(value)) return undefined
  for (const key of ['notificationId', 'challengeId', 'roomId', 'questionId', 'topicId', 'userId', 'reportId', 'category', 'key']) {
    if (typeof value[key] === 'string') return `${key}:${value[key]}`
  }
  return undefined
}

/** Undo only this transaction's changes, preserving later edits to other fields/entities. */
export function rollbackChange(before: unknown, after: unknown, current: unknown, field = ''): unknown {
  if (Object.is(before, after)) return current
  if (Object.is(current, after)) return before
  if (typeof before === 'number' && typeof after === 'number' && typeof current === 'number' && /Count$|^count$|^totalElements$/.test(field))
    return Math.max(0, current - (after - before))
  if (Array.isArray(before) && Array.isArray(after) && Array.isArray(current)) {
    const keyed = [...before, ...after, ...current].every((item) => identity(item) !== undefined)
    if (!keyed) return current.map((item, index) => rollbackChange(before[index], after[index], item))
    const old = new Map(before.map((item) => [identity(item), item]))
    const next = new Map(after.map((item) => [identity(item), item]))
    const result = current
      .filter((item) => old.has(identity(item)) || !next.has(identity(item)))
      .map((item) => {
        const id = identity(item)
        return old.has(id) && next.has(id) ? rollbackChange(old.get(id), next.get(id), item) : item
      })
    for (const [index, item] of before.entries()) {
      const id = identity(item)
      if (!next.has(id) && !result.some((entry) => identity(entry) === id)) result.splice(Math.min(index, result.length), 0, item)
    }
    return result
  }
  if (object(before) && object(after) && object(current)) {
    const result = { ...current }
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (!Object.is(before[key], after[key])) result[key] = rollbackChange(before[key], after[key], current[key], key)
    }
    return result
  }
  return current
}

/** Cancel older reads, update existing caches immediately, return a targeted rollback. No refetch on settlement. */
export async function optimisticUpdate(client: QueryClient, keys: readonly QueryKey[], update: () => void) {
  await Promise.all(keys.map((queryKey) => client.cancelQueries({ queryKey })))
  const snapshots = new Map<string, { key: QueryKey; before: unknown; after?: unknown }>()
  for (const queryKey of keys) for (const [key, before] of client.getQueriesData({ queryKey })) snapshots.set(JSON.stringify(key), { key, before })
  update()
  for (const queryKey of keys)
    for (const [key, after] of client.getQueriesData({ queryKey })) {
      const hash = JSON.stringify(key)
      const snapshot = snapshots.get(hash) ?? { key, before: undefined }
      snapshots.set(hash, { ...snapshot, after })
    }
  return {
    rollback: () => {
      for (const { key, before, after } of snapshots.values()) {
        const current = client.getQueryData(key)
        const restored = rollbackChange(before, after, current)
        if (restored === undefined) {
          if (current === after) client.removeQueries({ queryKey: key, exact: true })
        } else client.setQueryData(key, restored)
      }
    },
  }
}

let sequence = 0
export const optimisticId = () => `pending-${Date.now()}-${++sequence}`
