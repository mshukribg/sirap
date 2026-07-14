import { NextResponse } from 'next/server'
import { destroySession, clearSessionCookie } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST() {
  await destroySession()
  await clearSessionCookie()
  return NextResponse.json({ ok: true })
}
