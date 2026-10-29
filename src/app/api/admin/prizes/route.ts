import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { adminGuard } from '@/lib/admin-auth'

// GET /api/admin/prizes — Listar brindes
export async function GET(req: NextRequest) {
  const denied = await adminGuard(req)
  if (denied) return denied

  const db = getDb()
  const prizes = (await db.query('SELECT * FROM prizes ORDER BY category, name')).rows

  return NextResponse.json({ prizes })
}

// POST /api/admin/prizes — Adicionar brinde
export async function POST(req: NextRequest) {
  const denied = await adminGuard(req)
  if (denied) return denied

  try {
    const body = await req.json()
    const { name, category, quantity, description } = body

    if (typeof name !== 'string' || !name.trim() || name.length > 100 || typeof category !== 'string' || !category || category.length > 50 || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 2147483647 || (description !== undefined && description !== null && (typeof description !== 'string' || description.length > 1000))) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const db = getDb()
    await db.query(
      `INSERT INTO prizes (id, name, category, quantity, available, description) VALUES ($1, $2, $3, $4, $5, $6)`
    , [crypto.randomUUID(), name, category, quantity, quantity, description || null])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Add prize error:', err)
    return NextResponse.json({ error: 'Erro ao adicionar brinde' }, { status: 500 })
  }
}

// PUT /api/admin/prizes/[id] — Atualizar brinde
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const denied = await adminGuard(req)
  if (denied) return denied

  try {
    const { id } = params
    const body = await req.json()
    const { name, category, quantity, description } = body

    const db = getDb()
    const prize = (await db.query('SELECT * FROM prizes WHERE id = $1', [id])).rows[0] as { name: string; category: string; quantity: number; available: number; description: string | null } | undefined
    if (!prize) {
      return NextResponse.json({ error: 'Brinde não encontrado' }, { status: 404 })
    }

    if ((name !== undefined && (typeof name !== 'string' || !name.trim() || name.length > 100)) ||
      (category !== undefined && (typeof category !== 'string' || !category || category.length > 50)) ||
      (quantity !== undefined && (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 2147483647)) ||
      (description !== undefined && description !== null && (typeof description !== 'string' || description.length > 1000))) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    const newQuantity = quantity ?? prize.quantity
    const delta = newQuantity - prize.quantity
    const result = await db.query(`UPDATE prizes SET name = $1, category = $2, quantity = $3, available = available + $4,
      description = $5, updated_at = to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') WHERE id = $6 AND quantity = $7 AND available + $8 >= 0`, [name ?? prize.name, category ?? prize.category, newQuantity, delta,
        description !== undefined ? description : prize.description, id, prize.quantity, delta])
    if (result.rowCount !== 1) return NextResponse.json({ error: 'Estoque insuficiente ou alterado' }, { status: 409 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Update prize error:', err)
    return NextResponse.json({ error: 'Erro ao atualizar brinde' }, { status: 500 })
  }
}
