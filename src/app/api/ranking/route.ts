import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { eventClock } from '@/lib/event-clock'
import { finalizeClosedRounds, standings } from '@/lib/hourly-ranking'
export const dynamic = 'force-dynamic'
export async function GET(req: NextRequest) {
  const clock = eventClock()
  const value = req.nextUrl.searchParams.get('round')
  const round = value === null ? clock.round : Number(value)
  const date = req.nextUrl.searchParams.get('date') || clock.date
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(round) || (value !== null && (round < 1 || round > 9))) {
    return NextResponse.json({ error: 'Rodada ou data inválida' }, { status: 400 })
  }
  const db = getDb()
  await finalizeClosedRounds(db)
  const rankings = round >= 1 && round <= 9 ? (await standings(db, date, round)).slice(0, 100).map((row) => ({
    nickname: row.nickname, correct_answers: row.correct_answers, total_time: row.total_time,
    score: row.score, round_position: row.round_position, round,
  })) : []
  const finalized = (await db.query(`SELECT state FROM hourly_rounds WHERE event_date = $1 AND timezone = $2 AND round = $3`, [date, clock.timezone, round])).rows[0] as { state: string } | undefined
  return NextResponse.json({ round, currentRound: clock.round, date, timezone: clock.timezone, rankings,
    finalized: !!finalized, state: finalized?.state || 'open' }, { headers: { 'Cache-Control': 'no-store' } })
}
