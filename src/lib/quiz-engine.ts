import type Database from 'better-sqlite3'
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
export function getAttempt(db: Database.Database, qrCode: unknown): Attempt {
  if (typeof qrCode !== 'string' || !qrCode || qrCode.length > 200) throw new QuizError(400, 'QR inválido')
  const attempt = db.prepare('SELECT * FROM attempts WHERE qr_code = ?').get(qrCode) as Attempt | undefined
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
export function startAttempt(db: Database.Database, qrCode: unknown, deviceId: unknown, timestamp?: number) {
  return db.transaction(() => {
    const now = timestamp ?? Date.now()
    let attempt = getAttempt(db, qrCode)
    const id = device(attempt, deviceId)
    if (!attempt.nickname) throw new QuizError(400, 'Cadastro não realizado')
    const resumed = attempt.status !== 'pending'
    if (!resumed) {
      const questions = Array.from({ length: 6 }, (_, i) => selectQuestionForAttempt(attempt.qr_code, i + 1))
      if (questions.some((q) => !q)) throw new QuizError(500, 'Conteúdo indisponível')
      db.prepare(`UPDATE attempts SET status = 'in_progress', started_at = ?, device_id = ?,
        question_snapshots = ?, timing_version = 1, content_version = ? WHERE id = ?`)
        .run(new Date(now).toISOString(), id, JSON.stringify(questions), contentVersion, attempt.id)
      attempt = getAttempt(db, qrCode)
    } else if (attempt.status !== 'completed') snapshots(attempt)
    const phase = currentPhase(attempt)
    const results = Array.from({ length: 6 }, (_, i) => attempt[`phase${i + 1}_result`])
      .filter((r): r is string => typeof r === 'string').map((r) => JSON.parse(r) as Record<string, unknown>)
    return { attemptId: attempt.id, status: attempt.status, resumed, phase, currentPhase: phase, results,
      ...timer(attempt, phase, now) }
  }).immediate()
}
export function phaseContent(db: Database.Database, qrCode: unknown, phase: unknown) {
  const p = phaseNumber(phase)
  const attempt = getAttempt(db, qrCode)
  const question = snapshots(attempt)[p - 1]
  if (p !== currentPhase(attempt) || attempt.status !== 'in_progress') throw new QuizError(409, 'Fase fora de ordem', 'PHASE_CONFLICT')
  return { phase: p, question: { id: question.id, title: question.title, subtitle: question.subtitle,
    scenario: question.scenario, alternatives: question.alternatives,
    ...(question.comparison ? { comparison: question.comparison } : {}) } }
}
export function readyPhase(db: Database.Database, qrCode: unknown, phase: unknown, deviceId: unknown, timestamp?: number) {
  return db.transaction(() => {
    const now = timestamp ?? Date.now()
    const p = phaseNumber(phase)
    let attempt = getAttempt(db, qrCode)
    device(attempt, deviceId)
    snapshots(attempt)
    if (attempt.status !== 'in_progress' || p !== currentPhase(attempt)) throw new QuizError(409, 'Fase fora de ordem', 'PHASE_CONFLICT')
    db.prepare(`UPDATE attempts SET phase${p}_started_ms = ? WHERE id = ? AND phase${p}_started_ms IS NULL`).run(now, attempt.id)
    attempt = getAttempt(db, qrCode)
    return { phase: p, ...timer(attempt, p, now) }
  }).immediate()
}
export function answerPhase(db: Database.Database, qrCode: unknown, phase: unknown, answer: unknown, deviceId: unknown, timestamp?: number) {
  return db.transaction(() => {
    const now = timestamp ?? Date.now()
    const p = phaseNumber(phase)
    const attempt = getAttempt(db, qrCode)
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
    db.prepare(`UPDATE attempts SET phase${p}_answer = ?, phase${p}_correct = ?, phase${p}_time = ?,
      phase${p}_result = ?, updated_at = ? WHERE id = ?`).run(answer, Number(correct), elapsedMs / 1000, JSON.stringify(result), new Date(now).toISOString(), attempt.id)
    if (p === 6) {
      const updated = getAttempt(db, qrCode)
      const count = Array.from({ length: 6 }, (_, i) => Number(updated[`phase${i + 1}_correct`])).reduce((a, b) => a + b, 0)
      const seconds = Array.from({ length: 6 }, (_, i) => Number(updated[`phase${i + 1}_time`])).reduce((a, b) => a + b, 0)
      const clock = eventClock(new Date(now))
      let code: string
      do { code = randomBytes(9).toString('base64url').toUpperCase() } while (db.prepare('SELECT 1 FROM attempts WHERE redemption_code = ?').get(code))
      db.prepare(`UPDATE attempts SET status = 'completed', completed_at = ?, correct_answers = ?, total_time = ?,
        score = ?, round = ?, event_date = ?, event_timezone = ?, redemption_code = ? WHERE id = ?`)
        .run(new Date(now).toISOString(), count, seconds, calculateScore(count, seconds), clock.round, clock.date, clock.timezone, code, attempt.id)
    }
    return result
  }).immediate()
}
