import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { adminGuard, adminSession } from '@/lib/admin-auth'
import { contentVersion } from '@/lib/quiz-content'

export async function POST(req: NextRequest) {
  try {
    const denied = adminGuard(req)
    if (denied) return denied

    const db = getDb()
    const qrCode = crypto.randomUUID()
    const id = crypto.randomUUID()
    const origin = req.nextUrl.origin
    const url = `${origin}/qr/${qrCode}`

    db.prepare(
      `INSERT INTO attempts (id, qr_code, nickname, phone, status, content_version)
       VALUES (?, ?, '', '', 'pending', ?)`
    ).run(id, qrCode, contentVersion)

    db.prepare(
      `INSERT INTO admin_logs (id, action, target, details, admin_user) VALUES (?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), 'qr_generate', qrCode, `QR gerado para ${url}`, adminSession(req)!.u)

    return NextResponse.json({ qrCode, attemptId: id, url })
  } catch (err) {
    console.error('QR generate error:', err)
    return NextResponse.json({ error: 'Erro ao gerar QR' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const denied = adminGuard(req)
  if (denied) return denied

  const db = getDb()
  const rows = db.prepare(
    `SELECT qr_code, status, nickname, created_at FROM attempts ORDER BY created_at DESC LIMIT 200`
  ).all()

  return NextResponse.json({ qrs: rows })
}
