import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { adminGuard, adminSession } from '@/lib/admin-auth'
import type { Attempt } from '@/lib/quiz-engine'

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const denied = adminGuard(req)
  if (denied) return denied
  const db = getDb()
  const attempt = db.prepare(`SELECT * FROM attempts WHERE redemption_code = ?`).get(params.code) as Attempt | undefined
  if (!attempt) return NextResponse.json({ error: 'Código inválido' }, { status: 404 })
  if (attempt.status !== 'completed') return NextResponse.json({ error: 'Tentativa não concluída' }, { status: 400 })

  const eligibleNames = attempt.correct_answers >= 6
    ? ['Adesivos', 'Marcador de Página', 'Bloco de Notas']
    : attempt.correct_answers >= 3
      ? ['Adesivos', 'Marcador de Página']
      : ['Adesivos']
  const placeholders = eligibleNames.map(() => '?').join(',')
  const availablePrizes = db.prepare(`SELECT id, name, category, available FROM prizes WHERE name IN (${placeholders}) AND available > 0`).all(...eligibleNames)

  return NextResponse.json({
    nickname: attempt.nickname,
    correctAnswers: attempt.correct_answers,
    totalTime: attempt.total_time,
    round: attempt.round,
    redeemed: attempt.redeemed === 1,
    redeemedAt: attempt.redeemed_at,
    prizes: attempt.prizes ? JSON.parse(attempt.prizes) : null,
    availablePrizes,
    eligibleNames,
  })
}

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const denied = adminGuard(req)
  if (denied) return denied

  try {
    const adminUser = adminSession(req)!.u
    const db = getDb()
    const attempt = db.prepare(`SELECT * FROM attempts WHERE redemption_code = ?`).get(params.code) as Attempt | undefined
    if (!attempt) return NextResponse.json({ error: 'Código inválido' }, { status: 404 })
    if (attempt.status !== 'completed') return NextResponse.json({ error: 'Tentativa não concluída' }, { status: 400 })
    if (attempt.redeemed === 1) return NextResponse.json({ error: 'Resgate já realizado' }, { status: 409 })

    const eligibleNames = attempt.correct_answers >= 6
      ? ['Adesivos', 'Marcador de Página', 'Bloco de Notas']
      : attempt.correct_answers >= 3
        ? ['Adesivos', 'Marcador de Página']
        : ['Adesivos']
    const placeholders = eligibleNames.map(() => '?').join(',')
    const prizes = db.prepare(`SELECT id, name, category, available FROM prizes WHERE name IN (${placeholders})`).all(...eligibleNames) as Array<{ id: string; name: string; category: string; available: number }>
    if (prizes.length !== eligibleNames.length) return NextResponse.json({ error: 'Itens elegíveis não cadastrados' }, { status: 409 })
    const unavailable = prizes.find((prize) => prize.available < 1)
    if (unavailable) return NextResponse.json({ error: `Brinde "${unavailable.name}" esgotado` }, { status: 409 })

    const delivered = db.transaction(() => {
      for (const prize of prizes) {
        const result = db.prepare(`UPDATE prizes SET available = available - 1, updated_at = datetime('now') WHERE id = ? AND available > 0`).run(prize.id)
        if (result.changes !== 1) throw new Error('STOCK_RACE')
        db.prepare(`INSERT INTO prize_deliveries (id, prize_id, attempt_id, quantity, status) VALUES (?, ?, ?, 1, 'delivered')`).run(crypto.randomUUID(), prize.id, attempt.id)
      }
      const items = prizes.map((prize) => ({ id: prize.id, name: prize.name, category: prize.category }))
      const claimed = db.prepare(`UPDATE attempts SET redeemed = 1, redeemed_at = datetime('now'), prizes = ?, updated_at = datetime('now') WHERE id = ? AND redeemed = 0 AND status = 'completed'`).run(JSON.stringify(items), attempt.id)
      if (claimed.changes !== 1) throw new Error('STOCK_RACE')
      db.prepare(`INSERT INTO admin_logs (id, action, target, details, admin_user) VALUES (?, ?, ?, ?, ?)`).run(crypto.randomUUID(), 'prize_deliver', params.code, `Entrega confirmada: ${items.map((item) => item.name).join(', ')}`, adminUser)
      return items
    }).immediate()

    return NextResponse.json({ success: true, prizes: delivered.map((item) => item.name) })
  } catch (error) {
    if (error instanceof Error && error.message === 'STOCK_RACE') return NextResponse.json({ error: 'Estoque alterado por outro atendimento. Confira novamente.' }, { status: 409 })
    console.error('Redemption error:', error)
    return NextResponse.json({ error: 'Erro ao processar resgate' }, { status: 500 })
  }
}
