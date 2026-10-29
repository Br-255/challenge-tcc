import { NextRequest, NextResponse } from 'next/server'
import { getDb, transaction } from '@/lib/db'
import { adminGuard, adminSession } from '@/lib/admin-auth'
import { contentVersion } from '@/lib/quiz-content'

export async function POST(req: NextRequest) {
  try {
    const denied = await adminGuard(req)
    if (denied) return denied
    const adminUser = (await adminSession(req))!.u
    const qrCode = crypto.randomUUID()
    const id = crypto.randomUUID()
    const origin = process.env.APP_URL || req.nextUrl.origin
    const url = `${origin.replace(/\/$/, '')}/qr/${qrCode}`
    await transaction(getDb(), async (db) => {
      await db.query(`INSERT INTO attempts (id, qr_code, nickname, phone, status, content_version)
        VALUES ($1, $2, '', '', 'pending', $3)`, [id, qrCode, contentVersion])
      await db.query(`INSERT INTO admin_logs (id, action, target, details, admin_user) VALUES ($1, $2, $3, $4, $5)`,
        [crypto.randomUUID(), 'qr_generate', qrCode, `QR gerado para ${url}`, adminUser])
    })
    return NextResponse.json({ qrCode, attemptId: id, url })
  } catch (err) {
    console.error('QR generate error:', err)
    return NextResponse.json({ error: 'Erro ao gerar QR' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const denied = await adminGuard(req)
  if (denied) return denied
  const { rows } = await getDb().query('SELECT qr_code, status, nickname, created_at FROM attempts ORDER BY created_at DESC LIMIT 200')
  return NextResponse.json({ qrs: rows })
}
