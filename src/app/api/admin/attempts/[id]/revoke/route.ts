import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { adminGuard, adminSession } from '@/lib/admin-auth'

// POST /api/admin/attempts/[id]/revoke — Revogar tentativa
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const denied = adminGuard(req)
  if (denied) return denied

  try {
    const { id } = params
    const body = await req.json()
    const { reason } = body
    if (reason !== undefined && (typeof reason !== 'string' || reason.length > 1000)) return NextResponse.json({ error: 'Motivo inválido' }, { status: 400 })

    const db = getDb()
    const attempt = db.prepare('SELECT * FROM attempts WHERE id = ?').get(id) as { id: string } | undefined
    if (!attempt) {
      return NextResponse.json({ error: 'Tentativa não encontrada' }, { status: 404 })
    }

    db.prepare(
      `UPDATE attempts SET status = 'revoked', revoked_reason = ?, revoked_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).run(reason || 'Sem motivo', id)

    db.prepare(
      `INSERT INTO admin_logs (id, action, target, details, admin_user) VALUES (?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), 'attempt_revoke', id, reason || 'Sem motivo', adminSession(req)!.u)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Revoke error:', err)
    return NextResponse.json({ error: 'Erro ao revogar' }, { status: 500 })
  }
}
