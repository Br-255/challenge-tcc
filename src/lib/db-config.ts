import { readFileSync } from 'node:fs'
import type { PoolConfig } from 'pg'

export function databaseConfig(env: Record<string, string | undefined> = process.env): PoolConfig {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL não configurada. Preencha o .env.local seguindo o README.')
  let url: URL
  try { url = new URL(env.DATABASE_URL) } catch { throw new Error('DATABASE_URL deve ser uma URL PostgreSQL válida.') }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL deve usar postgres:// ou postgresql://.')
  if (env.DATABASE_SSL && !['true', 'false'].includes(env.DATABASE_SSL)) throw new Error('DATABASE_SSL deve ser true ou false.')
  const max = Number(env.DATABASE_POOL_MAX || 3)
  if (!Number.isSafeInteger(max) || max < 1 || max > 100) throw new Error('DATABASE_POOL_MAX deve ser um inteiro entre 1 e 100.')

  // pg replaces the entire ssl object when these appear in the connection URI.
  // Keep TLS configuration here so a pasted Aiven URI cannot discard the CA.
  for (const key of ['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'sslnegotiation', 'uselibpqcompat']) url.searchParams.delete(key)
  const ssl = env.DATABASE_SSL !== 'false'
  const ca = ssl ? (env.DATABASE_CA_CERT?.replace(/\\n/g, '\n') ||
    (env.DATABASE_CA_CERT_PATH ? readFileSync(env.DATABASE_CA_CERT_PATH, 'utf8') : undefined)) : undefined
  return {
    connectionString: url.toString(),
    ssl: ssl ? { rejectUnauthorized: true, ...(ca ? { ca } : {}) } : false,
    max,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    application_name: 'growth-intelligence-quiz',
  }
}
