import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { adminGuard } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const denied = await adminGuard(req)
  if (denied) return denied
  const status = req.nextUrl.searchParams.get('status')
  const round = req.nextUrl.searchParams.get('round')
  let query = 'SELECT * FROM attempts WHERE 1=1'
  const params: (string | number)[] = []
  if (status) {
    params.push(status)
    query += ` AND status = $${params.length}`
  }
  if (round) {
    if (!Number.isInteger(Number(round)) || Number(round) < 0 || Number(round) > 10) {
      return NextResponse.json({ error: 'Rodada inválida' }, { status: 400 })
    }
    params.push(Number(round))
    query += ` AND round = $${params.length}`
  }
  query += ' ORDER BY created_at DESC LIMIT 500'
  const { rows } = await getDb().query(query, params)
  return NextResponse.json({ attempts: rows })
}
