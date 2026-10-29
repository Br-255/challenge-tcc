import Database from 'better-sqlite3'
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { eventClock } from './event-clock'
import { mkdirSync, existsSync } from 'fs'
import { dirname, join } from 'path'

const DB_PATH = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'quiz.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const dir = dirname(DB_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  initSchema(db)
  ensureScoreColumn(db)
  migrateBackend(db)
  seedAdmin(db)

  return db
}

function ensureScoreColumn(db: Database.Database) {
  const columns = db.prepare('PRAGMA table_info(attempts)').all() as Array<{ name: string }>
  if (!columns.some((column) => column.name === 'score')) {
    db.exec('ALTER TABLE attempts ADD COLUMN score INTEGER DEFAULT 0')
  }
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      qr_code TEXT UNIQUE NOT NULL,
      nickname TEXT NOT NULL,
      phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      started_at TEXT,
      completed_at TEXT,
      correct_answers INTEGER DEFAULT 0,
      total_time INTEGER DEFAULT 0,
      score INTEGER DEFAULT 0,
      phase1_answer TEXT, phase1_correct INTEGER DEFAULT 0, phase1_time INTEGER DEFAULT 0,
      phase2_answer TEXT, phase2_correct INTEGER DEFAULT 0, phase2_time INTEGER DEFAULT 0,
      phase3_answer TEXT, phase3_correct INTEGER DEFAULT 0, phase3_time INTEGER DEFAULT 0,
      phase4_answer TEXT, phase4_correct INTEGER DEFAULT 0, phase4_time INTEGER DEFAULT 0,
      phase5_answer TEXT, phase5_correct INTEGER DEFAULT 0, phase5_time INTEGER DEFAULT 0,
      phase6_answer TEXT, phase6_correct INTEGER DEFAULT 0, phase6_time INTEGER DEFAULT 0,
      redemption_code TEXT UNIQUE,
      redeemed INTEGER DEFAULT 0,
      redeemed_at TEXT,
      prizes TEXT,
      round INTEGER,
      round_position INTEGER,
      content_version TEXT DEFAULT 'v1',
      revoked_reason TEXT,
      revoked_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_attempts_round ON attempts(round);
    CREATE INDEX IF NOT EXISTS idx_attempts_status ON attempts(status);
    CREATE INDEX IF NOT EXISTS idx_attempts_completed ON attempts(completed_at);


    CREATE TABLE IF NOT EXISTS prizes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      available INTEGER NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_prizes_category ON prizes(category);

    CREATE TABLE IF NOT EXISTS prize_deliveries (
      id TEXT PRIMARY KEY,
      prize_id TEXT NOT NULL,
      attempt_id TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      status TEXT DEFAULT 'delivered',
      reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (prize_id) REFERENCES prizes(id),
      FOREIGN KEY (attempt_id) REFERENCES attempts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_deliveries_attempt ON prize_deliveries(attempt_id);
    CREATE INDEX IF NOT EXISTS idx_deliveries_prize ON prize_deliveries(prize_id);

    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      target TEXT,
      details TEXT,
      admin_user TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
    CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at);

    CREATE TABLE IF NOT EXISTS hourly_winners (
      round INTEGER PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      nickname TEXT NOT NULL,
      correct_answers INTEGER NOT NULL,
      score INTEGER NOT NULL,
      total_time INTEGER NOT NULL,
      finalized_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

function seedPrizes(db: Database.Database) {
  const count = db.prepare('SELECT COUNT(*) as c FROM prizes').get() as { c: number }
  if (count.c > 0) return

  const insert = db.prepare(`
    INSERT INTO prizes (id, name, category, quantity, available, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const prizes = [
    { name: 'Bloco de Notas', category: 'premium', quantity: 49, available: 49, desc: 'Caderno premium do Growth Intelligence Hub' },
    { name: 'Marcador de Página', category: 'basic', quantity: 499, available: 499, desc: 'Marcador de página com identidade do Hub' },
    { name: 'Adesivos', category: 'basic', quantity: 989, available: 989, desc: 'Adesivos decorativos da coleção Hub' },
    { name: 'Balas', category: 'free', quantity: 950, available: 950, desc: 'Balas para distribuição livre no stand' },
    { name: 'Mousepad', category: 'ranking', quantity: 10, available: 10, desc: 'Mousepad exclusivo do ranking horário' },
  ]

  for (const p of prizes) {
    insert.run(crypto.randomUUID(), p.name, p.category, p.quantity, p.available, p.desc)
  }
}

function seedAdmin(db: Database.Database) {
  const count = db.prepare('SELECT COUNT(*) as c FROM admins').get() as { c: number }
  if (count.c > 0) return

  const hash = hashPassword('admin123')
  db.prepare('INSERT INTO admins (id, username, password_hash) VALUES (?, ?, ?)').run(
    crypto.randomUUID(),
    'admin',
    hash
  )
}

// --- Password hashing ---
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  const hashBuf = Buffer.from(hash, 'hex')
  const testBuf = scryptSync(password, salt, 64)
  return hashBuf.length === testBuf.length && timingSafeEqual(hashBuf, testBuf)
}

// --- Admin auth (session via cookie) ---
export const ADMIN_COOKIE = 'gi_admin_session'

export function createAdminToken(username: string, now = Date.now()): string {
  const token = randomBytes(32).toString('base64url')
  getDb().prepare(`INSERT INTO admin_sessions (token_hash, username, created_at, expires_at)
    VALUES (?, ?, ?, ?)`).run(sessionHash(token), username, now, now + 8 * 60 * 60 * 1000)
  return token
}

function sessionHash(token: string) { return createHash('sha256').update(token).digest('hex') }

export function parseAdminToken(token: string, now = Date.now()): { u: string; t: number } | null {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null
  const row = getDb().prepare(`SELECT s.username AS u, s.created_at AS t
    FROM admin_sessions s JOIN admins a ON a.username = s.username
    WHERE token_hash = ? AND expires_at > ? AND s.created_at <= ?`).get(sessionHash(token), now, now)
  return (row as { u: string; t: number } | undefined) || null
}

export function revokeAdminToken(token: string) {
  getDb().prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(sessionHash(token))
}

export function migrateBackend(database: Database.Database) {
  database.transaction(() => {
    const columns = database.prepare('PRAGMA table_info(attempts)').all() as Array<{ name: string }>
    for (const [name, type] of Object.entries({ device_id: 'TEXT', question_snapshots: 'TEXT',
      timing_version: 'INTEGER DEFAULT 0', event_date: 'TEXT', event_timezone: 'TEXT',
      phase1_started_ms: 'INTEGER', phase2_started_ms: 'INTEGER', phase3_started_ms: 'INTEGER',
      phase4_started_ms: 'INTEGER', phase5_started_ms: 'INTEGER', phase6_started_ms: 'INTEGER',
      phase1_result: 'TEXT', phase2_result: 'TEXT', phase3_result: 'TEXT',
      phase4_result: 'TEXT', phase5_result: 'TEXT', phase6_result: 'TEXT' })) {
      if (!columns.some((c) => c.name === name)) database.exec(`ALTER TABLE attempts ADD COLUMN ${name} ${type}`)
    }
    database.exec(`CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash TEXT PRIMARY KEY, username TEXT NOT NULL REFERENCES admins(username),
      created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS hourly_rounds (
        event_date TEXT NOT NULL, timezone TEXT NOT NULL, round INTEGER NOT NULL,
        state TEXT NOT NULL, winner_id TEXT, candidates TEXT NOT NULL, finalized_at TEXT NOT NULL,
        PRIMARY KEY(event_date, timezone, round));
      CREATE INDEX IF NOT EXISTS idx_attempts_event ON attempts(event_date, event_timezone, round);`)
  }).immediate()
}

// --- Round calculation ---
// Event runs from 11h to 20h. Hour 11-12 = round 1, ..., 19-20 = round 9.
export function getRoundFromDate(date: Date): number {
  return eventClock(date).round
}

import * as crypto from 'crypto'
