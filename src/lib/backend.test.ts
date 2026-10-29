import { test } from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { getDb, createAdminToken, parseAdminToken, revokeAdminToken, migrateBackend } from './db'
import { startAttempt, phaseContent, readyPhase, answerPhase, getAttempt, QuizError } from './quiz-engine'
import { eventClock, calculateScore } from './event-clock'
import { standings, finalizeClosedRounds, attemptPosition } from './hourly-ranking'
import type { QuizQuestion } from './quiz-content'
import { NextRequest } from 'next/server'
import * as qr from '../app/api/qr/generate/route'
import * as prizes from '../app/api/admin/prizes/route'
import * as attempts from '../app/api/admin/attempts/route'
import * as revoke from '../app/api/admin/attempts/[id]/revoke/route'
import * as writeoff from '../app/api/admin/prizes/[id]/writeoff/route'
import * as stats from '../app/api/admin/stats/route'
import * as winners from '../app/api/admin/winners/route'
import * as redemption from '../app/api/redemption/[code]/route'
import * as login from '../app/api/admin/login/route'
import * as logout from '../app/api/admin/logout/route'
import * as ranking from '../app/api/ranking/route'
import * as resultRoute from '../app/api/qr/[qrCode]/route'
import * as answerRoute from '../app/api/quiz/answer/route'
import * as contentRoute from '../app/api/quiz/content/route'
import * as prizeById from '../app/api/admin/prizes/[id]/route'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

assert.equal(process.env.DATABASE_PATH, ':memory:', 'Tests must never use the live DB')
const db = getDb()
const device = 'device-test-001'
function insert(id: string) { db.prepare(`INSERT INTO attempts (id, qr_code, nickname, phone) VALUES (?, ?, 'Test', '11999999999')`).run(id, id) }
function reject(fn: () => unknown, status = 409) { assert.throws(fn, (e: unknown) => e instanceof QuizError && e.status === status) }
function request(route: string, method = 'GET', token = 'forged', body?: unknown) {
  return new NextRequest(`http://localhost/api/${route}`, { method, headers: { cookie: `gi_admin_session=${token}`, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
}
function complete(id: string, at: number, correct = true, duration = 1000) {
  insert(id); startAttempt(db, id, device, at)
  const questions = JSON.parse(getAttempt(db, id).question_snapshots!) as QuizQuestion[]
  for (let p = 1; p <= 6; p++) {
    readyPhase(db, id, p, device, at + p * duration)
    answerPhase(db, id, p, correct ? questions[p - 1].correctId : questions[p - 1].alternatives.find((a) => a.id !== questions[p - 1].correctId)!.id, device, at + (p + 1) * duration)
  }
}

test('opaque persisted sessions: forgery, future timestamp, exact expiry, logout revocation', () => {
  const now = Date.now()
  const token = createAdminToken('admin', now)
  assert.deepEqual(parseAdminToken(token, now), { u: 'admin', t: now })
  assert.equal(parseAdminToken(Buffer.from(JSON.stringify({ u: 'admin', t: now + 9999999 })).toString('base64url')), null)
  assert.equal(parseAdminToken('x'.repeat(43)), null)
  assert.equal(parseAdminToken(token, now - 1), null)
  assert.equal(parseAdminToken(token, now + 8 * 3600000), null)
  assert.ok(!JSON.stringify(db.prepare('SELECT * FROM admin_sessions').all()).includes(token))
  revokeAdminToken(token); assert.equal(parseAdminToken(token), null)
})

test('every privileged endpoint rejects forged AND expired sessions before querying/mutating', async () => {
  const expired = createAdminToken('admin', Date.now() - 9 * 3600000)
  for (const token of ['forged', expired]) {
    const calls = [qr.GET(request('qr/generate', 'GET', token)), qr.POST(request('qr/generate', 'POST', token)),
      prizes.GET(request('admin/prizes', 'GET', token)), prizes.POST(request('admin/prizes', 'POST', token)),
      prizes.PUT(request('admin/prizes', 'PUT', token), { params: { id: 'missing' } }),
      attempts.GET(request('admin/attempts', 'GET', token)), stats.GET(request('admin/stats', 'GET', token)),
      winners.GET(request('admin/winners', 'GET', token)),
      revoke.POST(request('admin/revoke', 'POST', token), { params: { id: 'missing' } }),
      writeoff.POST(request('admin/writeoff', 'POST', token), { params: { id: 'missing' } }),
      redemption.GET(request('redemption/x', 'GET', token), { params: { code: 'x' } }),
      redemption.POST(request('redemption/x', 'POST', token), { params: { code: 'x' } }),
      login.GET(request('admin/login', 'GET', token)), logout.POST(request('admin/logout', 'POST', token))]
    for (const response of await Promise.all(calls)) assert.equal(response.status, 401)
  }
  const token = createAdminToken('admin')
  assert.equal((await qr.GET(request('qr/generate', 'GET', token))).status, 200)
  await logout.POST(request('admin/logout', 'POST', token)); assert.equal(parseAdminToken(token), null)
})

test('readiness only, immutable snapshots, reload, order, invalid input and device/idempotency', () => {
  insert('flow'); const start = startAttempt(db, 'flow', device, 10000)
  assert.equal(start.timerStartedAt, null)
  const snapshot = getAttempt(db, 'flow').question_snapshots
  const content = phaseContent(db, 'flow', 1)
  assert.ok(!JSON.stringify(content).includes('correctId'))
  assert.equal(getAttempt(db, 'flow').phase1_started_ms, null)
  reject(() => answerPhase(db, 'flow', 1, 'a', device, 12000))
  reject(() => readyPhase(db, 'flow', 2, device, 12000))
  reject(() => readyPhase(db, 'flow', 1.5, device, 12000), 400)
  reject(() => readyPhase(db, 'flow', 1, 'different-device', 12000))
  reject(() => startAttempt(db, 'flow', 'different-device', 12000))
  assert.equal(readyPhase(db, 'flow', 1, device, 12000).timerStartedAt, 12000)
  assert.equal(readyPhase(db, 'flow', 1, device, 13000).elapsedMs, 1000)
  assert.equal(startAttempt(db, 'flow', device, 14000).elapsedMs, 2000)
  assert.equal(getAttempt(db, 'flow').question_snapshots, snapshot)
  reject(() => answerPhase(db, 'flow', 1, 'invalid', device, 14000), 400)
  reject(() => answerPhase(db, 'flow', -1, 'a', device, 14000), 400)
  reject(() => answerPhase(db, 'flow', 1, 'a', device, 11000))
  const question = (JSON.parse(snapshot!) as QuizQuestion[])[0]
  const response = answerPhase(db, 'flow', 1, question.correctId, device, 14500)
  assert.equal(response.elapsedMs, 2500)
  assert.equal(response.timeMs, 2500)
  assert.deepEqual(answerPhase(db, 'flow', 1, question.correctId, device, 19000), response)
  reject(() => answerPhase(db, 'flow', 1, question.alternatives.find((a) => a.id !== question.correctId)!.id, device, 19000))
  assert.equal(startAttempt(db, 'flow', device, 20000).results.length, 1)
  assert.equal(startAttempt(db, 'flow', device, 20000).phase, 2)
})

test('answer route ignores fabricated timeSpent; six answers finalize atomically and last retry stable', async () => {
  insert('http-timing'); startAttempt(db, 'http-timing', device)
  readyPhase(db, 'http-timing', 1, device, Date.now() - 3500)
  const res = await answerRoute.POST(request('quiz/answer', 'POST', '', { qrCode: 'http-timing', phase: 1, answer: 'a', deviceId: device, timeSpent: -9999 }))
  assert.equal(res.status, 200)
  const data = await res.json(); assert.ok(data.elapsedMs >= 3500); assert.ok(data.timeSpent >= 3.5)
  const at = Date.parse('2026-10-01T14:05:00Z')
  complete('six', at)
  const a = getAttempt(db, 'six'); assert.equal(a.status, 'completed'); assert.equal(a.correct_answers, 6); assert.equal(a.total_time, 6); assert.equal(a.score, 994)
  const question = (JSON.parse(a.question_snapshots!) as QuizQuestion[])[5]
  const retry = answerPhase(db, 'six', 6, question.correctId, device, at + 90000)
  assert.equal(retry.elapsedMs, 1000); assert.equal(getAttempt(db, 'six').redemption_code, a.redemption_code)
  assert.equal(startAttempt(db, 'six', device).phase, 7)
  assert.equal(startAttempt(db, 'six', device).results.length, 6)
})

test('hourly timezone boundaries, day separation, only closed winners, exact ties unresolved, catchup durable', () => {
  for (const [iso, round] of [['2026-10-01T13:59:59Z', 0], ['2026-10-01T14:00:00Z', 1], ['2026-10-01T22:59:59Z', 9], ['2026-10-01T23:00:00Z', 10]] as const) assert.equal(eventClock(new Date(iso)).round, round)
  assert.equal(eventClock(new Date('2026-10-02T01:00:00Z')).date, '2026-10-01')
  assert.equal(eventClock(new Date('2026-10-01T14:00:00Z'), 'UTC').round, 4)
  complete('tie-a', Date.parse('2026-10-03T14:10:00Z')); complete('tie-b', Date.parse('2026-10-03T14:11:00Z'))
  complete('day-two', Date.parse('2026-10-04T14:10:00Z'))
  finalizeClosedRounds(db, new Date('2026-10-03T14:59:59Z'))
  assert.equal(attemptPosition(db, getAttempt(db, 'tie-a')).isHourlyWinner, false)
  finalizeClosedRounds(db, new Date('2026-10-03T15:00:00Z'))
  const tie = db.prepare(`SELECT * FROM hourly_rounds WHERE event_date = '2026-10-03' AND round = 1`).get() as { state: string; winner_id: string | null; candidates: string }
  assert.equal(tie.state, 'tie'); assert.equal(tie.winner_id, null); assert.equal(JSON.parse(tie.candidates).length, 2)
  assert.equal(attemptPosition(db, getAttempt(db, 'tie-a')).roundStatus, 'tied')
  assert.deepEqual(standings(db, '2026-10-03', 1).map((r) => r.round_position), [1, 1])
  finalizeClosedRounds(db, new Date('2026-10-04T15:00:00Z'))
  assert.equal(standings(db, '2026-10-04', 1).length, 1)
  assert.equal(attemptPosition(db, getAttempt(db, 'day-two')).isHourlyWinner, true)
  const rounds = db.prepare('SELECT * FROM hourly_rounds').all()
  finalizeClosedRounds(db, new Date('2026-10-04T15:00:00Z')); assert.deepEqual(db.prepare('SELECT * FROM hourly_rounds').all(), rounds)
  assert.equal((db.prepare(`SELECT COUNT(*) AS c FROM hourly_rounds WHERE event_date = '2026-10-03'`).get() as { c: number }).c, 9)
})

test('accuracy precedes time, points bounded, zero correct has zero; public projections omit private data', async () => {
  assert.equal(calculateScore(0, 0), 0); assert.equal(calculateScore(6, 0), 1000); assert.equal(calculateScore(6, 200), 900)
  complete('slow-perfect', Date.parse('2026-10-05T14:00:00Z'), true, 25000)
  complete('fast-zero', Date.parse('2026-10-05T14:01:00Z'), false, 1)
  assert.equal(standings(db, '2026-10-05', 1)[0].id, 'slow-perfect')
  const publicRank = await (await ranking.GET(request('ranking?round=1&date=2026-10-05'))).json()
  const serialized = JSON.stringify(publicRank)
  for (const secret of ['phone', 'qr_code', 'redemption_code', 'question_snapshots', 'device_id', 'correctId']) assert.ok(!serialized.includes(secret))
  const result = await (await resultRoute.GET(request('qr/slow-perfect'), { params: { qrCode: 'slow-perfect' } })).json()
  assert.equal(result.score, 900); assert.equal(result.roundPosition, 1); assert.equal(result.isHourlyWinner, true)
  assert.equal(result.roundStatus, 'closed'); assert.equal(result.roundStart, '11:00'); assert.equal(result.roundEnd, '12:00')
  assert.equal(result.eventDate, '2026-10-05')
  assert.ok(!JSON.stringify(result).includes('phone'))
})

test('persisted reload across DB connections, device race and answer transaction rollback', async () => {
  insert('durable'); startAttempt(db, 'durable', device, 10000); readyPhase(db, 'durable', 1, device, 11000)
  const path = join(mkdtempSync(join(tmpdir(), 'quiz-persist-')), 'isolated.db')
  await db.backup(path)
  const first = new Database(path); const second = new Database(path)
  assert.equal(startAttempt(second, 'durable', device, 16000).elapsedMs, 5000)
  reject(() => startAttempt(first, 'durable', 'competing-device', 16000))
  const question = (JSON.parse(getAttempt(first, 'durable').question_snapshots!) as QuizQuestion[])[0]
  const one = answerPhase(first, 'durable', 1, question.correctId, device, 17000)
  assert.deepEqual(answerPhase(second, 'durable', 1, question.correctId, device, 19000), one)
  first.close(); second.close()
  insert('rollback'); startAttempt(db, 'rollback', device, 10000); readyPhase(db, 'rollback', 1, device, 11000)
  db.exec(`CREATE TEMP TRIGGER fail_answer BEFORE UPDATE OF phase1_answer ON attempts WHEN NEW.id = 'rollback' BEGIN SELECT RAISE(ABORT, 'test failure'); END`)
  assert.throws(() => answerPhase(db, 'rollback', 1, 'a', device, 12000))
  assert.equal(getAttempt(db, 'rollback').phase1_answer, null); assert.equal(getAttempt(db, 'rollback').phase1_result, null)
  db.exec('DROP TRIGGER fail_answer')
})

test('HTTP content GET never starts timer, ready response and parallel retries agree', async () => {
  insert('content-http'); startAttempt(db, 'content-http', device)
  const content = await contentRoute.GET(request('quiz/content?qrCode=content-http&phase=1'))
  assert.equal(content.status, 200); assert.equal(getAttempt(db, 'content-http').phase1_started_ms, null)
  const ready = await contentRoute.POST(request('quiz/content', 'POST', '', { qrCode: 'content-http', phase: 1, deviceId: device }))
  assert.equal(ready.status, 200); const time = await ready.json(); assert.equal(time.timerStartedAt, time.serverNow)
  const questions = JSON.parse(getAttempt(db, 'content-http').question_snapshots!) as QuizQuestion[]
  const replies = await Promise.all(Array.from({ length: 4 }, () => answerRoute.POST(request('quiz/answer', 'POST', '', {
    qrCode: 'content-http', phase: 1, answer: questions[0].correctId, deviceId: device, timeSpent: 0 }))))
  const results = await Promise.all(replies.map((r) => r.json()))
  for (const result of results) assert.deepEqual(result, results[0])
})

test('orphan prize PUT protected; inventory validation, writeoff and repeated redemption preserve stock', async () => {
  assert.equal((await prizeById.PUT(request('admin/prizes/x', 'PUT'), { params: { id: 'x' } })).status, 401)
  const token = createAdminToken('admin')
  assert.equal((await prizes.POST(request('admin/prizes', 'POST', token, { name: 'Bad', category: 'basic', quantity: -1 }))).status, 400)
  db.prepare(`INSERT INTO prizes (id, name, category, quantity, available) VALUES ('stock', 'Adesivos', 'basic', 10, 10)`).run()
  assert.equal((await writeoff.POST(request('admin/writeoff', 'POST', token, { quantity: 2, reason: 'Test' }), { params: { id: 'stock' } })).status, 200)
  assert.equal((await prizeById.PUT(request('admin/prizes/stock', 'PUT', token, { quantity: 12 }), { params: { id: 'stock' } })).status, 200)
  assert.equal((db.prepare(`SELECT available FROM prizes WHERE id = 'stock'`).get() as { available: number }).available, 10)
  complete('redeem-zero', Date.parse('2026-10-07T14:00:00Z'), false)
  const code = getAttempt(db, 'redeem-zero').redemption_code!
  const responses = await Promise.all([1, 2].map(() => redemption.POST(request('redemption/x', 'POST', token), { params: { code } })))
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409])
  assert.equal((db.prepare(`SELECT available FROM prizes WHERE id = 'stock'`).get() as { available: number }).available, 9)
  assert.equal((db.prepare(`SELECT COUNT(*) AS c FROM prize_deliveries WHERE attempt_id = 'redeem-zero'`).get() as { c: number }).c, 1)
})

test('comparison tables are copied from persisted snapshot into public DTO without gabarito', () => {
  insert('table'); startAttempt(db, 'table', device, 10000)
  const questions = JSON.parse(getAttempt(db, 'table').question_snapshots!) as QuizQuestion[]
  const comparison = { headers: ['Campanha', 'Conversão'], rows: [['A', '3%'], ['B', '5%']] }
  questions[0].comparison = comparison
  db.prepare(`UPDATE attempts SET question_snapshots = ? WHERE id = 'table'`).run(JSON.stringify(questions))
  const publicQuestion = phaseContent(db, 'table', 1).question
  assert.deepEqual(publicQuestion.comparison, comparison)
  assert.ok(!JSON.stringify(publicQuestion).includes('correctId'))
})

test('legacy migration repeatable, non-destructive, unsafe resume blocked and no automatic legacy winner', () => {
  const old = new Database(':memory:')
  old.exec(`CREATE TABLE attempts (id TEXT PRIMARY KEY, round INTEGER); CREATE TABLE admins (username TEXT UNIQUE); INSERT INTO attempts VALUES ('keep', 1)`)
  migrateBackend(old); migrateBackend(old)
  assert.equal((old.prepare('SELECT id FROM attempts').get() as { id: string }).id, 'keep'); old.close()
  insert('legacy'); db.prepare(`UPDATE attempts SET status = 'in_progress', phase1_answer = 'a' WHERE id = 'legacy'`).run()
  reject(() => startAttempt(db, 'legacy', device)); assert.equal(getAttempt(db, 'legacy').phase1_answer, 'a')
  insert('legacy-completed'); db.prepare(`UPDATE attempts SET status = 'completed', completed_at = '2026-10-06 14:10:00', correct_answers = 6 WHERE id = 'legacy-completed'`).run()
  finalizeClosedRounds(db, new Date('2026-10-06T15:00:00Z'))
  assert.equal(getAttempt(db, 'legacy-completed').event_date, '2026-10-06')
  assert.equal(attemptPosition(db, getAttempt(db, 'legacy-completed')).isHourlyWinner, false)
})
