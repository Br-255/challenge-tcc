import type Database from 'better-sqlite3'
import { calculateScore, eventClock, EVENT_TIMEZONE, parseStoredDate } from './event-clock'

interface Entry { id: string; nickname: string; correct_answers: number; total_time: number; score: number; round_position: number }

export function standings(db: Database.Database, date: string, round: number, timezone = EVENT_TIMEZONE): Entry[] {
  const rows = db.prepare(`SELECT id, nickname, correct_answers, total_time FROM attempts
    WHERE status = 'completed' AND event_date = ? AND event_timezone = ? AND round = ?
    ORDER BY correct_answers DESC, total_time ASC, id ASC`).all(date, timezone, round) as Entry[]
  return rows.map((row, i) => ({ ...row, score: calculateScore(row.correct_answers, row.total_time),
    round_position: i > 0 && row.correct_answers === rows[i - 1].correct_answers && row.total_time === rows[i - 1].total_time
      ? rows.findIndex((r) => r.correct_answers === row.correct_answers && r.total_time === row.total_time) + 1 : i + 1 }))
}

export function finalizeClosedRounds(db: Database.Database, now = new Date()) {
  db.transaction(() => {
    // Retain legacy rows, but do not silently certify client-supplied times as authoritative.
    const legacy = db.prepare(`SELECT id, completed_at FROM attempts WHERE completed_at IS NOT NULL AND event_date IS NULL`).all() as { id: string; completed_at: string }[]
    for (const row of legacy) {
      const date = parseStoredDate(row.completed_at)
      if (!Number.isFinite(date.getTime())) continue
      const clock = eventClock(date)
      db.prepare('UPDATE attempts SET event_date = ?, event_timezone = ?, round = ? WHERE id = ?')
        .run(clock.date, clock.timezone, clock.round, row.id)
    }
    const clock = eventClock(now)
    const dates = db.prepare(`SELECT DISTINCT event_date FROM attempts WHERE event_date IS NOT NULL AND event_timezone = ?`).all(clock.timezone) as { event_date: string }[]
    if (!dates.some((d) => d.event_date === clock.date)) dates.push({ event_date: clock.date })
    for (const { event_date: day } of dates) {
      if (day > clock.date) continue
      for (let round = 1; round <= 9; round++) {
        if (day === clock.date && clock.hour < round + 11) continue
        if (db.prepare('SELECT 1 FROM hourly_rounds WHERE event_date = ? AND timezone = ? AND round = ?').get(day, clock.timezone, round)) continue
        const all = standings(db, day, round)
        for (const row of all) db.prepare('UPDATE attempts SET round_position = ?, score = ? WHERE id = ?').run(row.round_position, row.score, row.id)
        const eligible = all.filter((row) => (db.prepare('SELECT timing_version FROM attempts WHERE id = ?').get(row.id) as { timing_version: number }).timing_version === 1)
        const best = eligible[0]
        const candidates = best ? eligible.filter((r) => r.correct_answers === best.correct_answers && r.total_time === best.total_time) : []
        db.prepare(`INSERT INTO hourly_rounds (event_date, timezone, round, state, winner_id, candidates, finalized_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`).run(day, clock.timezone, round,
            candidates.length === 0 ? 'empty' : candidates.length === 1 ? 'winner' : 'tie',
            candidates.length === 1 ? candidates[0].id : null, JSON.stringify(candidates), now.toISOString())
      }
    }
  }).immediate()
}

export function attemptPosition(db: Database.Database, attempt: { id: string; event_date: string | null; event_timezone: string | null; round: number | null }, now = new Date()) {
  const metadata = { eventDate: attempt.event_date, eventTimezone: attempt.event_timezone,
    roundStart: attempt.round && attempt.round >= 1 && attempt.round <= 9 ? `${String(attempt.round + 10).padStart(2, '0')}:00` : null,
    roundEnd: attempt.round && attempt.round >= 1 && attempt.round <= 9 ? `${String(attempt.round + 11).padStart(2, '0')}:00` : null }
  if (!attempt.event_date || !attempt.event_timezone || !attempt.round || attempt.round < 1 || attempt.round > 9) {
    return { ...metadata, roundPosition: null, isHourlyWinner: false, roundStatus: 'outside', roundFinalized: false }
  }
  const row = standings(db, attempt.event_date, attempt.round, attempt.event_timezone).find((r) => r.id === attempt.id)
  const winner = db.prepare(`SELECT winner_id, state FROM hourly_rounds WHERE event_date = ? AND timezone = ? AND round = ?`).get(attempt.event_date, attempt.event_timezone, attempt.round) as { winner_id: string | null; state: string } | undefined
  const clock = eventClock(now, attempt.event_timezone)
  const current = attempt.event_date === clock.date && attempt.round === clock.round
  return { ...metadata, roundPosition: row?.round_position ?? null, isHourlyWinner: winner?.winner_id === attempt.id,
    roundStatus: winner ? winner.state === 'tie' ? 'tied' : 'closed' : current ? 'current' : 'open', roundFinalized: !!winner }
}
