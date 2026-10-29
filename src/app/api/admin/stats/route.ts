import { NextRequest, NextResponse } from 'next/server'
import { getDb, getRoundFromDate } from '@/lib/db'
import { adminGuard } from '@/lib/admin-auth'

// GET /api/admin/stats — Estatísticas gerais
export async function GET(req: NextRequest) {
  const denied = adminGuard(req)
  if (denied) return denied

  const db = getDb()
  const now = new Date()
  const currentRound = getRoundFromDate(now)

  const stats = {
    totalAttempts: (db.prepare('SELECT COUNT(*) as c FROM attempts').get() as { c: number }).c,
    pending: (db.prepare("SELECT COUNT(*) as c FROM attempts WHERE status = 'pending'").get() as { c: number }).c,
    inProgress: (db.prepare("SELECT COUNT(*) as c FROM attempts WHERE status = 'in_progress'").get() as { c: number }).c,
    completed: (db.prepare("SELECT COUNT(*) as c FROM attempts WHERE status = 'completed'").get() as { c: number }).c,
    revoked: (db.prepare("SELECT COUNT(*) as c FROM attempts WHERE status = 'revoked'").get() as { c: number }).c,
    currentRound,
    perfectScores: (db.prepare("SELECT COUNT(*) as c FROM attempts WHERE correct_answers = 6 AND status = 'completed'").get() as { c: number }).c,
  }

  return NextResponse.json(stats)
}
