import type { Pool } from 'pg'
import { transaction, RANKING_LOCK, type Database } from './db'
import { calculateScore, eventClock, EVENT_TIMEZONE, parseStoredDate } from './event-clock'

interface Entry { id: string; nickname: string; correct_answers: number; total_time: number; score: number; round_position: number }

export async function standings(db: Database, date: string, round: number, timezone = EVENT_TIMEZONE): Promise<Entry[]> {
  const rows = (await db.query(`SELECT id, nickname, correct_answers, total_time FROM attempts
    WHERE status = 'completed' AND event_date = $1 AND event_timezone = $2 AND round = $3
    ORDER BY correct_answers DESC, total_time ASC, id ASC`, [date, timezone, round])).rows as Entry[]
  return rows.map((row, i) => ({ ...row, score: calculateScore(row.correct_answers, row.total_time),
    round_position: i > 0 && row.correct_answers === rows[i - 1].correct_answers && row.total_time === rows[i - 1].total_time
      ? rows.findIndex((r) => r.correct_answers === row.correct_answers && r.total_time === row.total_time) + 1 : i + 1 }))
}

export async function finalizeClosedRounds(pool: Pool, timestamp?: Date) {
  return transaction(pool, async (db) => {
    await db.query('SELECT pg_advisory_xact_lock($1)', [RANKING_LOCK])
    const now = timestamp ?? new Date()
    // Retain legacy rows, but do not silently certify client-supplied times as authoritative.
    const legacy = (await db.query(`SELECT id, completed_at FROM attempts WHERE completed_at IS NOT NULL AND event_date IS NULL`)).rows as { id: string; completed_at: string }[]
    for (const row of legacy) {
      const date = parseStoredDate(row.completed_at)
      if (!Number.isFinite(date.getTime())) continue
      const clock = eventClock(date)
      await db.query('UPDATE attempts SET event_date = $1, event_timezone = $2, round = $3 WHERE id = $4', [clock.date, clock.timezone, clock.round, row.id])
    }
    const clock = eventClock(now)
    const closed = new Set((await db.query('SELECT event_date, round FROM hourly_rounds WHERE timezone = $1 AND event_date <= $2',
      [clock.timezone, clock.date])).rows.map((row) => `${row.event_date}:${row.round}`))
    const dates = (await db.query(`SELECT DISTINCT event_date FROM attempts WHERE event_date IS NOT NULL AND event_timezone = $1`, [clock.timezone])).rows as { event_date: string }[]
    if (!dates.some((d) => d.event_date === clock.date)) dates.push({ event_date: clock.date })
    for (const { event_date: day } of dates) {
      if (day > clock.date) continue
      for (let round = 1; round <= 9; round++) {
        if (day === clock.date && clock.hour < round + 11) continue
        if (closed.has(`${day}:${round}`)) continue
        const all = await standings(db, day, round)
        if (all.length) await db.query(`UPDATE attempts AS a SET round_position = r.position, score = r.score
          FROM UNNEST($1::text[], $2::integer[], $3::double precision[]) AS r(id, position, score)
          WHERE a.id = r.id`, [all.map((row) => row.id), all.map((row) => row.round_position), all.map((row) => row.score)])
        const certified = new Set((await db.query('SELECT id FROM attempts WHERE event_date = $1 AND event_timezone = $2 AND round = $3 AND timing_version = 1', [day, clock.timezone, round])).rows.map((row) => row.id))
        const eligible = all.filter((row) => certified.has(row.id))
        const best = eligible[0]
        const candidates = best ? eligible.filter((r) => r.correct_answers === best.correct_answers && r.total_time === best.total_time) : []
        await db.query(`INSERT INTO hourly_rounds (event_date, timezone, round, state, winner_id, candidates, finalized_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)`, [day, clock.timezone, round,
            candidates.length === 0 ? 'empty' : candidates.length === 1 ? 'winner' : 'tie',
            candidates.length === 1 ? candidates[0].id : null, JSON.stringify(candidates), now.toISOString()])
      }
    }
  })
}

export async function attemptPosition(db: Database, attempt: { id: string; event_date: string | null; event_timezone: string | null; round: number | null }, now = new Date()) {
  const metadata = { eventDate: attempt.event_date, eventTimezone: attempt.event_timezone,
    roundStart: attempt.round && attempt.round >= 1 && attempt.round <= 9 ? `${String(attempt.round + 10).padStart(2, '0')}:00` : null,
    roundEnd: attempt.round && attempt.round >= 1 && attempt.round <= 9 ? `${String(attempt.round + 11).padStart(2, '0')}:00` : null }
  if (!attempt.event_date || !attempt.event_timezone || !attempt.round || attempt.round < 1 || attempt.round > 9) {
    return { ...metadata, roundPosition: null, isHourlyWinner: false, roundStatus: 'outside', roundFinalized: false }
  }
  const row = (await standings(db, attempt.event_date, attempt.round, attempt.event_timezone)).find((r) => r.id === attempt.id)
  const winner = (await db.query(`SELECT winner_id, state FROM hourly_rounds WHERE event_date = $1 AND timezone = $2 AND round = $3`, [attempt.event_date, attempt.event_timezone, attempt.round])).rows[0] as { winner_id: string | null; state: string } | undefined
  const clock = eventClock(now, attempt.event_timezone)
  const current = attempt.event_date === clock.date && attempt.round === clock.round
  return { ...metadata, roundPosition: row?.round_position ?? null, isHourlyWinner: winner?.winner_id === attempt.id,
    roundStatus: winner ? winner.state === 'tie' ? 'tied' : 'closed' : current ? 'current' : 'open', roundFinalized: !!winner }
}
