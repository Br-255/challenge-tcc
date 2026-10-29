import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { adminGuard } from '@/lib/admin-auth'

// GET /api/admin/attempts — Listar tentativas
export async function GET(req: NextRequest) {
  const denied = adminGuard(req)
  if (denied) return denied

  const db = getDb()
  const status = req.nextUrl.searchParams.get('status')
  const round = req.nextUrl.searchParams.get('round')

  let query = 'SELECT * FROM attempts WHERE 1=1'
  const params: (string | number)[] = []

  if (status) {
    query += ' AND status = ?'
    params.push(status)
  }
  if (round) {
    query += ' AND round = ?'
    params.push(Number(round))
  }

  query += ' ORDER BY created_at DESC LIMIT 500'

  const attempts = db.prepare(query).all(...params)

  return NextResponse.json({ attempts })
}
