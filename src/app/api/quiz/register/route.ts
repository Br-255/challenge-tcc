import { NextRequest, NextResponse } from 'next/server'
import { getDb, transaction } from '@/lib/db'
import { getAttempt, QuizError } from '@/lib/quiz-engine'
import { quizFailure } from '@/lib/quiz-http'

export async function POST(req: NextRequest) {
  try {
    const { qrCode, nickname, phone } = await req.json()
    if (typeof nickname !== 'string' || nickname.trim().length < 2 || nickname.trim().length > 20 ||
      typeof phone !== 'string' || !/^\+?[\d ()-]{8,25}$/.test(phone)) throw new QuizError(400, 'Apelido ou telefone inválido')
    const result = await transaction(getDb(), async (db) => {
      const attempt = await getAttempt(db, qrCode, true)
      if (attempt.status !== 'pending' || attempt.nickname) throw new QuizError(409, 'Cadastro já realizado')
      await db.query('UPDATE attempts SET nickname = $1, phone = $2, updated_at = $3 WHERE id = $4',
        [nickname.trim(), phone, new Date().toISOString(), attempt.id])
      return { success: true, attemptId: attempt.id }
    })
    return NextResponse.json(result)
  } catch (error) { return quizFailure(error) }
}
