import { eq } from 'drizzle-orm'
import { db } from '../db'
import { events, users } from '../database/schema'

// public URLs carry an unguessable public_id (uuid), internally everything still keys on the integer PK, so these helpers translate an inbound :id param to that PK
// a purely numeric param is treated as a legacy bookmark and matched against legacy_numeric_id, which is only set for rows that predate the UUID migration, so new rows are unreachable by number
// returns the integer PK, or null when nothing matches (callers should 404)

const NUMERIC = /^\d+$/
// postgres rejects a non-uuid string against a uuid column (22P02), so the format is checked before querying
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// a bigger number than postgres integer can hold would overflow the legacy_numeric_id comparison
const MAX_INT4 = 2147483647

type RouteParam = string | string[] | undefined

// express route params are typed string | string[]; collapse to a single string
const normalize = (param: RouteParam): string | undefined =>
  Array.isArray(param) ? param[0] : param

export async function resolveEventPk(rawParam: RouteParam): Promise<number | null> {
  const param = normalize(rawParam)
  if (!param) return null
  if (NUMERIC.test(param)) {
    const n = Number(param)
    if (!Number.isSafeInteger(n) || n > MAX_INT4) return null
    const [row] = await db.select({ id: events.id }).from(events).where(eq(events.legacy_numeric_id, n)).limit(1)
    return row?.id ?? null
  }
  if (!UUID.test(param)) return null
  const [row] = await db.select({ id: events.id }).from(events).where(eq(events.public_id, param)).limit(1)
  return row?.id ?? null
}

export async function resolveUserPk(rawParam: RouteParam): Promise<number | null> {
  const param = normalize(rawParam)
  if (!param) return null
  if (NUMERIC.test(param)) {
    const n = Number(param)
    if (!Number.isSafeInteger(n) || n > MAX_INT4) return null
    const [row] = await db.select({ id: users.id }).from(users).where(eq(users.legacy_numeric_id, n)).limit(1)
    return row?.id ?? null
  }
  if (!UUID.test(param)) return null
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.public_id, param)).limit(1)
  return row?.id ?? null
}
