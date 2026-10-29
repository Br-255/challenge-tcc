import { NextRequest, NextResponse } from 'next/server'
import { getDb, verifyPassword, createAdminToken, parseAdminToken, ADMIN_COOKIE } from '@/lib/db'

// POST /api/admin/login — Login admin
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password } = body

    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password || username.length > 100 || password.length > 1024) {
      return NextResponse.json({ error: 'Credenciais obrigatórias' }, { status: 400 })
    }

    const db = getDb()
    const admin = (await db.query('SELECT * FROM admins WHERE username = $1', [username])).rows[0] as { password_hash: string } | undefined

    if (!admin || !verifyPassword(password, admin.password_hash)) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const token = await createAdminToken(username)
    const response = NextResponse.json({ success: true, username })
    response.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60,
      path: '/',
    })

    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Erro ao autenticar' }, { status: 500 })
  }
}

// GET /api/admin/login — Verificar se está autenticado
export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const parsed = await parseAdminToken(token)
  if (!parsed) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({ authenticated: true, username: parsed.u })
}
