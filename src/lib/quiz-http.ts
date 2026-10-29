import { NextResponse } from 'next/server'
import { QuizError } from './quiz-engine'
export function quizFailure(error: unknown) {
  if (error instanceof QuizError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  console.error('Quiz request failed:', error)
  return NextResponse.json({ error: 'Erro ao processar tentativa' }, { status: 500 })
}
