import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { adminGuard } from '@/lib/admin-auth'
import { finalizeClosedRounds } from '@/lib/hourly-ranking'
import { eventClock } from '@/lib/event-clock'
export const dynamic = 'force-dynamic'
export async function GET(req: NextRequest) {
  const denied = adminGuard(req)
  if (denied) return denied
  const db = getDb()
  finalizeClosedRounds(db)
  const date = req.nextUrl.searchParams.get('date') || eventClock().date
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
  const rounds = db.prepare(`SELECT r.*, a.nickname, a.correct_answers, a.score, a.total_time, a.phone
    FROM hourly_rounds r LEFT JOIN attempts a ON a.id = r.winner_id
    WHERE r.event_date = ? AND r.timezone = ? ORDER BY r.round`).all(date, eventClock().timezone) as Array<Record<string, unknown> & { candidates: string }>
  const winners = rounds.map(({ candidates, winner_id, ...row }) => ({ ...row, attempt_id: winner_id, candidates: JSON.parse(candidates) as unknown }))
  return NextResponse.json({ date, timezone: eventClock().timezone, winners }, { headers: { 'Cache-Control': 'no-store' } })
}
