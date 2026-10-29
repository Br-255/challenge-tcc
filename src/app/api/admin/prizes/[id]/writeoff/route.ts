import { NextRequest, NextResponse } from 'next/server'
import { getDb, transaction } from '@/lib/db'
import { adminGuard, adminSession } from '@/lib/admin-auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await adminGuard(req)
  if (denied) return denied
  try {
    const { quantity, reason } = await req.json()
    const amount = Number(quantity)
    if (!Number.isInteger(amount) || amount <= 0 || amount > 2147483647) {
      return NextResponse.json({ error: 'A quantidade deve ser um inteiro maior que zero' }, { status: 400 })
    }
    if (typeof reason !== 'string' || reason.trim().length < 3 || reason.length > 1000) {
      return NextResponse.json({ error: 'Informe o motivo da baixa' }, { status: 400 })
    }
    const adminUser = (await adminSession(req))!.u
    const result = await transaction(getDb(), async (db) => {
      const prize = (await db.query('SELECT id, name, available FROM prizes WHERE id = $1 FOR UPDATE', [params.id])).rows[0] as { id: string; name: string; available: number } | undefined
      if (!prize) throw new Error('NOT_FOUND')
      if (prize.available < amount) throw new Error('INSUFFICIENT_STOCK')
      await db.query('UPDATE prizes SET available = available - $1, updated_at = $2 WHERE id = $3', [amount, new Date().toISOString(), params.id])
      await db.query(`INSERT INTO admin_logs (id, action, target, details, admin_user) VALUES ($1, $2, $3, $4, $5)`,
        [crypto.randomUUID(), 'stock_writeoff', params.id, `Baixa de ${amount} unidade(s) de ${prize.name}. Motivo: ${reason.trim()}`, adminUser])
      return { name: prize.name, available: prize.available - amount }
    })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Brinde não encontrado' }, { status: 404 })
    if (error instanceof Error && error.message === 'INSUFFICIENT_STOCK') return NextResponse.json({ error: 'Estoque insuficiente para essa baixa' }, { status: 409 })
    console.error('Stock writeoff error:', error)
    return NextResponse.json({ error: 'Erro ao dar baixa no estoque' }, { status: 500 })
  }
}
