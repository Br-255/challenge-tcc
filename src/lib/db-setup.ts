import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
import { hashPassword, transaction } from './db'

export async function migrateDatabase(pool: Pool) {
  const files = (await readdir(join(process.cwd(), 'migrations'))).filter((name) => /^\d+.*\.sql$/.test(name)).sort()
  return transaction(pool, async (db) => {
    await db.query('SELECT pg_advisory_xact_lock($1)', [194728602])
    await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`)
    const applied: string[] = []
    for (const name of files) {
      if ((await db.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name])).rowCount) continue
      await db.query(await readFile(join(process.cwd(), 'migrations', name), 'utf8'))
      await db.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name])
      applied.push(name)
    }
    return applied
  })
}

export async function seedDatabase(pool: Pool, env: Record<string, string | undefined> = process.env) {
  const username = env.ADMIN_USERNAME?.trim()
  const password = env.ADMIN_PASSWORD
  if (!username || username.length > 100 || !password || password.length < 12 || password.length > 1024) {
    throw new Error('Configure ADMIN_USERNAME (até 100 caracteres) e ADMIN_PASSWORD (12 a 1024 caracteres) antes de executar o seed.')
  }
  return transaction(pool, async (db) => {
    await db.query('SELECT pg_advisory_xact_lock($1)', [194728603])
    await db.query(`INSERT INTO admins (id, username, password_hash) VALUES ($1, $2, $3)
      ON CONFLICT (username) DO NOTHING`, [randomUUID(), username, hashPassword(password)])
    const prizes = [
      ['seed-bloco', 'Bloco de Notas', 'premium', 49, 'Caderno premium do Growth Intelligence Hub'],
      ['seed-marcador', 'Marcador de Página', 'basic', 499, 'Marcador de página com identidade do Hub'],
      ['seed-adesivos', 'Adesivos', 'basic', 989, 'Adesivos decorativos da coleção Hub'],
      ['seed-balas', 'Balas', 'free', 950, 'Balas para distribuição livre no stand'],
      ['seed-mousepad', 'Mousepad', 'ranking', 10, 'Mousepad exclusivo do ranking horário'],
    ] as const
    for (const [id, name, category, quantity, description] of prizes) {
      await db.query(`INSERT INTO prizes (id, name, category, quantity, available, description)
        SELECT $1, $2, $3, $4, $4, $5 WHERE NOT EXISTS (SELECT 1 FROM prizes WHERE name = $2)
        ON CONFLICT (id) DO NOTHING`, [id, name, category, quantity, description])
    }
  })
}
