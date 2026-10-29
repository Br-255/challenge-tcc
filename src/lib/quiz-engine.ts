import type { Pool } from 'pg'
import { transaction, RANKING_LOCK, type Database } from './db'
import { randomBytes } from 'crypto'
import { selectQuestionForAttempt, contentVersion, type QuizQuestion } from './quiz-content'
import { calculateScore, eventClock } from './event-clock'

export class QuizError extends Error {
  constructor(public status: number, message: string, public code = 'INVALID_REQUEST') { super(message) }
}
export interface Attempt {
  [key: string]: unknown
  id: string; qr_code: string; nickname: string; phone: string; status: string
  device_id: string | null; question_snapshots: string | null; timing_version: number
  correct_answers: number; total_time: number; score: number; content_version: string
  event_date: string | null; event_timezone: string | null; round: number | null
  redemption_code: string | null; redeemed: number; redeemed_at: string | null; prizes: string | null
}
export async function getAttempt(db: Database, qrCode: unknown, lock = false): Promise<Attempt> {
  if (typeof qrCode !== 'string' || !qrCode || qrCode.length > 200) throw new QuizError(400, 'QR inválido')
  const attempt = (await db.query(`SELECT * FROM attempts WHERE qr_code = $1${lock ? ' FOR UPDATE' : ''}`, [qrCode])).rows[0] as Attempt | undefined
  if (!attempt) throw new QuizError(404, 'QR não encontrado')
  if (attempt.status === 'revoked') throw new QuizError(403, 'Acesso revogado')
  return attempt
}
function device(attempt: Attempt, deviceId: unknown) {
  if (typeof deviceId !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(deviceId)) throw new QuizError(400, 'deviceId obrigatório ou inválido')
  if (attempt.device_id && attempt.device_id !== deviceId) throw new QuizError(409, 'Tentativa vinculada a outro dispositivo', 'DEVICE_CONFLICT')
  return deviceId
}
function phaseNumber(phase: unknown): number {
  if (typeof phase !== 'number' || !Number.isInteger(phase) || phase < 1 || phase > 6) throw new QuizError(400, 'Fase inválida')
  return phase
}
export function currentPhase(attempt: Attempt) {
  for (let p = 1; p <= 6; p++) if (!attempt[`phase${p}_answer`]) return p
  return 7
}
function snapshots(attempt: Attempt): QuizQuestion[] {
  if (!attempt.question_snapshots || attempt.timing_version !== 1) throw new QuizError(409, 'Tentativa antiga sem relógio confiável. Solicite um novo QR.', 'LEGACY_ATTEMPT')
  return JSON.parse(attempt.question_snapshots) as QuizQuestion[]
}
function timer(attempt: Attempt, phase: number, now: number) {
  const started = attempt[`phase${phase}_started_ms`]
  const start = typeof started === 'number' ? started : null
  return { timerStartedAt: start, timerStartedAtMs: start, serverNow: now, elapsedMs: start === null ? 0 : Math.max(0, now - start) }
}
export async function startAttempt(pool: Pool, qrCode: unknown, deviceId: unknown, timestamp?: number) {
  return transaction(pool, async (db) => {
    let attempt = await getAttempt(db, qrCode, true)
    const now = timestamp ?? Date.now()
    const id = device(attempt, deviceId)
    if (!attempt.nickname) throw new QuizError(400, 'Cadastro não realizado')
    const resumed = attempt.status !== 'pending'
    if (!resumed) {
      const questions = Array.from({ length: 6 }, (_, i) => selectQuestionForAttempt(attempt.qr_code, i + 1))
      if (questions.some((q) => !q)) throw new QuizError(500, 'Conteúdo indisponível')
      await db.query(`UPDATE attempts SET status = 'in_progress', started_at = $1, device_id = $2,
        question_snapshots = $3, timing_version = 1, content_version = $4 WHERE id = $5`, [new Date(now).toISOString(), id, JSON.stringify(questions), contentVersion, attempt.id])
      attempt = await getAttempt(db, qrCode, true)
    } else if (attempt.status !== 'completed') snapshots(attempt)
    const phase = currentPhase(attempt)
    const results = Array.from({ length: 6 }, (_, i) => attempt[`phase${i + 1}_result`])
      .filter((r): r is string => typeof r === 'string').map((r) => JSON.parse(r) as Record<string, unknown>)
    return { attemptId: attempt.id, status: attempt.status, resumed, phase, currentPhase: phase, results,
      ...timer(attempt, phase, now) }
  })
}
export async function phaseContent(db: Database, qrCode: unknown, phase: unknown) {
  const p = phaseNumber(phase)
  const attempt = await getAttempt(db, qrCode)
  const question = snapshots(attempt)[p - 1]
  if (p !== currentPhase(attempt) || attempt.status !== 'in_progress') throw new QuizError(409, 'Fase fora de ordem', 'PHASE_CONFLICT')
  return { phase: p, question: { id: question.id, title: question.title, subtitle: question.subtitle,
    scenario: question.scenario, alternatives: question.alternatives,
    ...(question.comparison ? { comparison: question.comparison } : {}) } }
}
export async function readyPhase(pool: Pool, qrCode: unknown, phase: unknown, deviceId: unknown, timestamp?: number) {
  return transaction(pool, async (db) => {
    const p = phaseNumber(phase)
    let attempt = await getAttempt(db, qrCode, true)
    const now = timestamp ?? Date.now()
    device(attempt, deviceId)
    snapshots(attempt)
    if (attempt.status !== 'in_progress' || p !== currentPhase(attempt)) throw new QuizError(409, 'Fase fora de ordem', 'PHASE_CONFLICT')
    await db.query(`UPDATE attempts SET phase${p}_started_ms = $1 WHERE id = $2 AND phase${p}_started_ms IS NULL`, [now, attempt.id])
    attempt = await getAttempt(db, qrCode, true)
    return { phase: p, ...timer(attempt, p, now) }
  })
}
export async function answerPhase(pool: Pool, qrCode: unknown, phase: unknown, answer: unknown, deviceId: unknown, timestamp?: number) {
  return transaction(pool, async (db) => {
    const p = phaseNumber(phase)
    if (p === 6) await db.query('SELECT pg_advisory_xact_lock($1)', [RANKING_LOCK])
    const attempt = await getAttempt(db, qrCode, true)
    const now = timestamp ?? Date.now()
    device(attempt, deviceId)
    const question = snapshots(attempt)[p - 1]
    if (typeof answer !== 'string' || !question.alternatives.some((a) => a.id === answer)) throw new QuizError(400, 'Alternativa inválida')
    const stored = attempt[`phase${p}_result`]
    if (typeof stored === 'string') {
      if (attempt[`phase${p}_answer`] !== answer) throw new QuizError(409, 'Fase já respondida', 'ANSWER_CONFLICT')
      return JSON.parse(stored) as Record<string, unknown>
    }
    if (attempt.status !== 'in_progress' || p !== currentPhase(attempt)) throw new QuizError(409, 'Fase fora de ordem', 'PHASE_CONFLICT')
    const started = attempt[`phase${p}_started_ms`]
    if (typeof started !== 'number') throw new QuizError(409, 'Fase ainda não pronta', 'PHASE_NOT_READY')
    if (now < started) throw new QuizError(409, 'Relógio do servidor indisponível')
    const elapsedMs = now - started
    const correct = answer === question.correctId
    const result = { correct, explanation: question.explanation, phase: p, elapsedMs, timeMs: elapsedMs, timeSpent: elapsedMs / 1000 }
    await db.query(`UPDATE attempts SET phase${p}_answer = $1, phase${p}_correct = $2, phase${p}_time = $3,
      phase${p}_result = $4, updated_at = $5 WHERE id = $6`, [answer, Number(correct), elapsedMs / 1000, JSON.stringify(result), new Date(now).toISOString(), attempt.id])
    if (p === 6) {
      const updated = await getAttempt(db, qrCode, true)
      const count = Array.from({ length: 6 }, (_, i) => Number(updated[`phase${i + 1}_correct`])).reduce((a, b) => a + b, 0)
      const seconds = Array.from({ length: 6 }, (_, i) => Number(updated[`phase${i + 1}_time`])).reduce((a, b) => a + b, 0)
      const clock = eventClock(new Date(now))
      let code: string
      do { code = randomBytes(9).toString('base64url').toUpperCase() } while ((await db.query('SELECT 1 FROM attempts WHERE redemption_code = $1', [code])).rows[0])
      await db.query(`UPDATE attempts SET status = 'completed', completed_at = $1, correct_answers = $2, total_time = $3,
        score = $4, round = $5, event_date = $6, event_timezone = $7, redemption_code = $8 WHERE id = $9`, [new Date(now).toISOString(), count, seconds, calculateScore(count, seconds), clock.round, clock.date, clock.timezone, code, attempt.id])
    }
    return result
  })
}
