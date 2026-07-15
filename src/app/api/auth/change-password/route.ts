/**
 * POST /api/auth/change-password
 * Body: { currentPassword, newPassword }
 * Security: requires valid session; verifies current password before updating.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile, verifyPassword, hashPassword, isValidPassword, sanitizeText } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const profile = await getSessionProfile()
  if (!profile) {
    return NextResponse.json({ ok: false, error: 'Sesi tidak sah. Sila log masuk semula.' }, { status: 401 })
  }
  try {
    const body = await req.json().catch(() => ({}))
    const currentPassword = String(body?.currentPassword ?? '')
    const newPassword = String(body?.newPassword ?? '')

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ ok: false, error: 'Medan tidak lengkap.' }, { status: 400 })
    }
    if (!isValidPassword(newPassword)) {
      return NextResponse.json({
        ok: false,
        error: 'Kata laluan baharu mesti sekurang-kurangnya 8 aksara & mengandungi huruf serta nombor.',
      }, { status: 400 })
    }

    const fresh = await db.profile.findUnique({ where: { id: profile.id } })
    if (!fresh) return NextResponse.json({ ok: false, error: 'Profil tidak dijumpai.' }, { status: 404 })

    if (!verifyPassword(currentPassword, fresh.passwordHash)) {
      return NextResponse.json({ ok: false, error: 'Kata laluan semasa tidak betul.' }, { status: 401 })
    }

    await db.profile.update({
      where: { id: profile.id },
      data: { passwordHash: hashPassword(newPassword) },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Change password error:', e)
    return NextResponse.json({ ok: false, error: 'Ralat pelayan.' }, { status: 500 })
  }
}
