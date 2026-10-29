import { NextRequest, NextResponse } from 'next/server'
import { getDb, transaction } from '@/lib/db'
import { adminGuard, adminSession } from '@/lib/admin-auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await adminGuard(req)
  if (denied) return denied
  try {
    const { reason } = await req.json()
    if (reason !== undefined && (typeof reason !== 'string' || reason.length > 1000)) return NextResponse.json({ error: 'Motivo inválido' }, { status: 400 })
    const adminUser = (await adminSession(req))!.u
    const found = await transaction(getDb(), async (db) => {
      const result = await db.query(`UPDATE attempts SET status = 'revoked', revoked_reason = $1,
        revoked_at = $2, updated_at = $2 WHERE id = $3`, [reason || 'Sem motivo', new Date().toISOString(), params.id])
      if (!result.rowCount) return false
      await db.query(`INSERT INTO admin_logs (id, action, target, details, admin_user) VALUES ($1, $2, $3, $4, $5)`,
        [crypto.randomUUID(), 'attempt_revoke', params.id, reason || 'Sem motivo', adminUser])
      return true
    })
    return found ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'Tentativa não encontrada' }, { status: 404 })
  } catch (err) {
    console.error('Revoke error:', err)
    return NextResponse.json({ error: 'Erro ao revogar' }, { status: 500 })
  }
}
