import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, parseAdminToken } from './db'

export async function adminSession(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  return token ? parseAdminToken(token) : null
}

export async function adminGuard(req: NextRequest): Promise<NextResponse | null> {
  if (!await adminSession(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const origin = req.headers.get('origin')
  if (!['GET', 'HEAD'].includes(req.method) && origin && origin !== req.nextUrl.origin) {
    return NextResponse.json({ error: 'Origem inválida' }, { status: 403 })
  }
  return null
}
