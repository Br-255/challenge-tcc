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
  finalizeClosedRounds(db)
  const rankings = round >= 1 && round <= 9 ? standings(db, date, round).slice(0, 100).map(({ id: _id, ...row }) => ({ ...row, round })) : []
  const finalized = db.prepare(`SELECT state FROM hourly_rounds WHERE event_date = ? AND timezone = ? AND round = ?`).get(date, clock.timezone, round) as { state: string } | undefined
  return NextResponse.json({ round, currentRound: clock.round, date, timezone: clock.timezone, rankings,
    finalized: !!finalized, state: finalized?.state || 'open' }, { headers: { 'Cache-Control': 'no-store' } })
}
