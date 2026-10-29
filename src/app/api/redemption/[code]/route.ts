import { NextRequest, NextResponse } from 'next/server'
import { getDb, transaction } from '@/lib/db'
import { adminGuard, adminSession } from '@/lib/admin-auth'
import type { Attempt } from '@/lib/quiz-engine'

function eligibleNames(correct: number) {
  return correct >= 6 ? ['Adesivos', 'Marcador de Página', 'Bloco de Notas']
    : correct >= 3 ? ['Adesivos', 'Marcador de Página'] : ['Adesivos']
}

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const denied = await adminGuard(req)
  if (denied) return denied
  const db = getDb()
  const attempt = (await db.query('SELECT * FROM attempts WHERE redemption_code = $1', [params.code])).rows[0] as Attempt | undefined
  if (!attempt) return NextResponse.json({ error: 'Código inválido' }, { status: 404 })
  if (attempt.status !== 'completed') return NextResponse.json({ error: 'Tentativa não concluída' }, { status: 400 })
  const names = eligibleNames(attempt.correct_answers)
  const { rows } = await db.query('SELECT id, name, category, available FROM prizes WHERE name = ANY($1::text[]) AND available > 0', [names])
  return NextResponse.json({ nickname: attempt.nickname, correctAnswers: attempt.correct_answers,
    totalTime: attempt.total_time, round: attempt.round, redeemed: attempt.redeemed === 1,
    redeemedAt: attempt.redeemed_at, prizes: attempt.prizes ? JSON.parse(attempt.prizes) : null,
    availablePrizes: rows, eligibleNames: names })
}

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const denied = await adminGuard(req)
  if (denied) return denied
  try {
    const adminUser = (await adminSession(req))!.u
    const result = await transaction(getDb(), async (db) => {
      const attempt = (await db.query('SELECT * FROM attempts WHERE redemption_code = $1 FOR UPDATE', [params.code])).rows[0] as Attempt | undefined
      if (!attempt) return { error: 'Código inválido', status: 404 } as const
      if (attempt.status !== 'completed') return { error: 'Tentativa não concluída', status: 400 } as const
      if (attempt.redeemed === 1) return { error: 'Resgate já realizado', status: 409 } as const
      const names = eligibleNames(attempt.correct_answers)
      // Consistent lock order also serializes different attempts claiming the same stock.
      const prizes = (await db.query(`SELECT id, name, category, available FROM prizes
        WHERE name = ANY($1::text[]) ORDER BY id FOR UPDATE`, [names])).rows as Array<{ id: string; name: string; category: string; available: number }>
      if (prizes.length !== names.length) return { error: 'Itens elegíveis não cadastrados', status: 409 } as const
      const unavailable = prizes.find((prize) => prize.available < 1)
      if (unavailable) return { error: `Brinde "${unavailable.name}" esgotado`, status: 409 } as const
      for (const prize of prizes) {
        await db.query('UPDATE prizes SET available = available - 1, updated_at = $1 WHERE id = $2', [new Date().toISOString(), prize.id])
        await db.query(`INSERT INTO prize_deliveries (id, prize_id, attempt_id, quantity, status) VALUES ($1, $2, $3, 1, 'delivered')`, [crypto.randomUUID(), prize.id, attempt.id])
      }
      const items = prizes.map(({ id, name, category }) => ({ id, name, category }))
      await db.query('UPDATE attempts SET redeemed = 1, redeemed_at = $1, prizes = $2, updated_at = $1 WHERE id = $3', [new Date().toISOString(), JSON.stringify(items), attempt.id])
      await db.query(`INSERT INTO admin_logs (id, action, target, details, admin_user) VALUES ($1, $2, $3, $4, $5)`,
        [crypto.randomUUID(), 'prize_deliver', params.code, `Entrega confirmada: ${items.map((item) => item.name).join(', ')}`, adminUser])
      return { prizes: items } as const
    })
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ success: true, prizes: result.prizes.map((item) => item.name) })
  } catch (error) {
    console.error('Redemption error:', error)
    return NextResponse.json({ error: 'Erro ao processar resgate' }, { status: 500 })
  }
}
