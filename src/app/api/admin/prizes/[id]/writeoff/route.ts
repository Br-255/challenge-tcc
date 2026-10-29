import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { adminGuard, adminSession } from '@/lib/admin-auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = adminGuard(req)
  if (denied) return denied

  try {
    const { quantity, reason } = await req.json()
    const amount = Number(quantity)
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: 'A quantidade deve ser um inteiro maior que zero' }, { status: 400 })
    }
    if (!reason || String(reason).trim().length < 3) {
      return NextResponse.json({ error: 'Informe o motivo da baixa' }, { status: 400 })
    }

    const db = getDb()
    const result = db.transaction(() => {
      const prize = db.prepare('SELECT id, name, available FROM prizes WHERE id = ?').get(params.id) as { id: string; name: string; available: number } | undefined
      if (!prize) throw new Error('NOT_FOUND')
      if (prize.available < amount) throw new Error('INSUFFICIENT_STOCK')

      db.prepare(`UPDATE prizes SET available = available - ?, updated_at = datetime('now') WHERE id = ?`).run(amount, params.id)
      db.prepare(`INSERT INTO admin_logs (id, action, target, details, admin_user) VALUES (?, ?, ?, ?, ?)`).run(
        crypto.randomUUID(), 'stock_writeoff', params.id, `Baixa de ${amount} unidade(s) de ${prize.name}. Motivo: ${String(reason).trim()}`, adminSession(req)!.u
      )
      return { name: prize.name, available: prize.available - amount }
    }).immediate()

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Brinde não encontrado' }, { status: 404 })
    if (error instanceof Error && error.message === 'INSUFFICIENT_STOCK') return NextResponse.json({ error: 'Estoque insuficiente para essa baixa' }, { status: 409 })
    console.error('Stock writeoff error:', error)
    return NextResponse.json({ error: 'Erro ao dar baixa no estoque' }, { status: 500 })
  }
}
