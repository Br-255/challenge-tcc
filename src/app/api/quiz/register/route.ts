import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getAttempt, QuizError } from '@/lib/quiz-engine'
import { quizFailure } from '@/lib/quiz-http'
export async function POST(req: NextRequest) {
  try {
    const { qrCode, nickname, phone } = await req.json()
    if (typeof nickname !== 'string' || nickname.trim().length < 2 || nickname.trim().length > 20 ||
      typeof phone !== 'string' || !/^\+?[\d ()-]{8,25}$/.test(phone)) throw new QuizError(400, 'Apelido ou telefone inválido')
    const db = getDb()
    const result = db.transaction(() => {
      const attempt = getAttempt(db, qrCode)
      if (attempt.status !== 'pending' || attempt.nickname) throw new QuizError(409, 'Cadastro já realizado')
      db.prepare(`UPDATE attempts SET nickname = ?, phone = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(nickname.trim(), phone, attempt.id)
      return { success: true, attemptId: attempt.id }
    }).immediate()
    return NextResponse.json(result)
  } catch (error) { return quizFailure(error) }
}
