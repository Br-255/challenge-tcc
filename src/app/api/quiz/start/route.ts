import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { startAttempt } from '@/lib/quiz-engine'
import { quizFailure } from '@/lib/quiz-http'
export async function POST(req: NextRequest) {
  try {
    const { qrCode, deviceId } = await req.json()
    return NextResponse.json(await startAttempt(getDb(), qrCode, deviceId), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return quizFailure(error) }
}
