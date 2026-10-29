import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, revokeAdminToken } from '@/lib/db'
import { adminGuard } from '@/lib/admin-auth'

// POST /api/admin/logout — Logout admin
export async function POST(req: NextRequest) {
  const denied = adminGuard(req)
  if (denied) return denied
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  if (token) revokeAdminToken(token)
  const response = NextResponse.json({ success: true })
  response.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
