import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { calculateScore } from '@/lib/event-clock'
import { attemptPosition, finalizeClosedRounds } from '@/lib/hourly-ranking'
import type { Attempt } from '@/lib/quiz-engine'
export const dynamic = 'force-dynamic'
export async function GET(req: NextRequest, { params }: { params: { qrCode: string } }) {
  const db = getDb()
  const attempt = db.prepare('SELECT * FROM attempts WHERE qr_code = ?').get(params.qrCode) as Attempt | undefined
  if (!attempt) return NextResponse.json({ error: 'QR não encontrado' }, { status: 404 })
  if (attempt.status === 'revoked') return NextResponse.json({ status: 'revoked', message: 'Este acesso está indisponível.' })
  if (attempt.status === 'completed') {
    finalizeClosedRounds(db)
    const updated = db.prepare('SELECT * FROM attempts WHERE id = ?').get(attempt.id) as Attempt
    return NextResponse.json({ status: 'completed', attemptId: attempt.id, nickname: attempt.nickname,
      correctAnswers: attempt.correct_answers, score: calculateScore(attempt.correct_answers, attempt.total_time),
      totalTime: attempt.total_time, round: updated.round,
      ...attemptPosition(db, updated), redemptionCode: attempt.redemption_code, redeemed: attempt.redeemed === 1,
      prizes: attempt.prizes ? JSON.parse(attempt.prizes) : null }, { headers: { 'Cache-Control': 'no-store' } })
  }
  return NextResponse.json({ status: attempt.status, attemptId: attempt.id, hasNickname: !!attempt.nickname,
    contentVersion: attempt.content_version }, { headers: { 'Cache-Control': 'no-store' } })
}
