import { NextRequest, NextResponse } from 'next/server'
import { getDb, getRoundFromDate } from '@/lib/db'
import { adminGuard } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const denied = await adminGuard(req)
  if (denied) return denied
  const { rows } = await getDb().query(`SELECT
    COUNT(*) AS "totalAttempts",
    COUNT(*) FILTER (WHERE status = 'pending') AS pending,
    COUNT(*) FILTER (WHERE status = 'in_progress') AS "inProgress",
    COUNT(*) FILTER (WHERE status = 'completed') AS completed,
    COUNT(*) FILTER (WHERE status = 'revoked') AS revoked,
    COUNT(*) FILTER (WHERE correct_answers = 6 AND status = 'completed') AS "perfectScores"
    FROM attempts`)
  return NextResponse.json({ ...rows[0], currentRound: getRoundFromDate(new Date()) })
}
