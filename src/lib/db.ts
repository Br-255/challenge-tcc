import { Pool, types, type PoolClient } from 'pg'
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { databaseConfig } from './db-config'
import { eventClock } from './event-clock'

const globalDb = globalThis as typeof globalThis & { quizPool?: Pool }
export type Database = Pick<PoolClient, 'query'>

export function getDb(): Pool {
  if (!globalDb.quizPool) globalDb.quizPool = createDatabasePool()
  return globalDb.quizPool
}

export function createDatabasePool(env: Record<string, string | undefined> = process.env): Pool {
  const pool = new Pool({ ...databaseConfig(env), types: {
    getTypeParser(oid) {
      // Epoch milliseconds exceed int4 but fit safely in a JS number.
      if (oid === 20) return (value: string) => {
        const number = Number(value)
        if (!Number.isSafeInteger(number)) throw new Error('Valor bigint fora do intervalo seguro de JavaScript.')
        return number
      }
      return types.getTypeParser(oid)
    },
  } })
  pool.on('error', (error) => console.error('PostgreSQL pool error:', error.message))
  return pool
}

export async function closeDb() {
  const pool = globalDb.quizPool
  globalDb.quizPool = undefined
  if (pool) await pool.end()
}

export async function transaction<T>(pool: Pool, operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await operation(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
}

// Final answers and round finalization share a lock so a winner is not finalized
// while a last answer for that round is still being committed.
export const RANKING_LOCK = 194728601

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const hashBuf = Buffer.from(hash, 'hex')
  const testBuf = scryptSync(password, salt, 64)
  return hashBuf.length === testBuf.length && timingSafeEqual(hashBuf, testBuf)
}

export const ADMIN_COOKIE = 'gi_admin_session'
function sessionHash(token: string) { return createHash('sha256').update(token).digest('hex') }

export async function createAdminToken(username: string, now = Date.now()): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  await getDb().query(`INSERT INTO admin_sessions (token_hash, username, created_at, expires_at)
    VALUES ($1, $2, $3, $4)`, [sessionHash(token), username, now, now + 8 * 60 * 60 * 1000])
  return token
}

export async function parseAdminToken(token: string, now = Date.now()): Promise<{ u: string; t: number } | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null
  const { rows } = await getDb().query<{ u: string; t: number }>(`SELECT s.username AS u, s.created_at AS t
    FROM admin_sessions s JOIN admins a ON a.username = s.username
    WHERE token_hash = $1 AND expires_at > $2 AND s.created_at <= $2`, [sessionHash(token), now])
  return rows[0] || null
}

export async function revokeAdminToken(token: string) {
  await getDb().query('DELETE FROM admin_sessions WHERE token_hash = $1', [sessionHash(token)])
}

export function getRoundFromDate(date: Date): number { return eventClock(date).round }
