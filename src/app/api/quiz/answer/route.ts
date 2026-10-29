import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { answerPhase } from '@/lib/quiz-engine'
import { quizFailure } from '@/lib/quiz-http'
export async function POST(req: NextRequest) {
  try {
    const { qrCode, phase, answer, deviceId } = await req.json()
    return NextResponse.json(await answerPhase(getDb(), qrCode, phase, answer, deviceId), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return quizFailure(error) }
}
