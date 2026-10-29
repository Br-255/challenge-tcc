import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { phaseContent, readyPhase } from '@/lib/quiz-engine'
import { quizFailure } from '@/lib/quiz-http'
export const dynamic = 'force-dynamic'
export async function GET(req: NextRequest) {
  try {
    return NextResponse.json(await phaseContent(getDb(), req.nextUrl.searchParams.get('qrCode'),
      Number(req.nextUrl.searchParams.get('phase'))), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return quizFailure(error) }
}
export async function POST(req: NextRequest) {
  try {
    const { qrCode, phase, deviceId } = await req.json()
    return NextResponse.json(await readyPhase(getDb(), qrCode, phase, deviceId), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return quizFailure(error) }
}
