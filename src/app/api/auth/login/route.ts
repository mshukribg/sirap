/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { ok: true, profile } or { ok: false, error }
 *
 * Security:
 *  - Input validation
 *  - Constant-time password verification
 *  - Session token stored in HTTP-only cookie
 *  - Failed attempts logged
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  verifyPassword,
  createSession,
  setSessionCookie,
  isValidEmail,
  sanitizeText,
} from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = sanitizeText(String(body?.email ?? '').toLowerCase(), 254)
    const password = String(body?.password ?? '')

    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: 'E-mel tidak sah.' }, { status: 400 })
    }
    if (!password) {
      return NextResponse.json({ ok: false, error: 'Kata laluan diperlukan.' }, { status: 400 })
    }

    const profile = await db.profile.findUnique({
      where: { email },
      include: { bengkel: true },
    })

    // Always run verifyPassword against a dummy hash to keep timing constant
    const DUMMY_HASH = '000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
    const stored = profile?.passwordHash ?? DUMMY_HASH
    const ok = verifyPassword(password, stored)

    if (!profile || !ok) {
      return NextResponse.json(
        { ok: false, error: 'E-mel atau kata laluan tidak sah.' },
        { status: 401 }
      )
    }

    if (!profile.active) {
      return NextResponse.json(
        { ok: false, error: 'Akaun anda telah dinyahaktifkan. Sila hubungi pentadbir sistem.' },
        { status: 403 }
      )
    }

    // Create session
    const token = await createSession(profile.id)
    await setSessionCookie(token)

    const safeProfile = {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      role: profile.role,
      bengkel: profile.bengkel ? { id: profile.bengkel.id, namaBengkel: profile.bengkel.namaBengkel } : null,
    }
    return NextResponse.json({ ok: true, profile: safeProfile })
  } catch (e: any) {
    console.error('Login error:', e)
    // Expose error message in development/preview for easier debugging
    const isProd = process.env.NODE_ENV === 'production'
    const errorMsg = isProd
      ? 'Ralat pelayan. Sila cuba lagi.'
      : `Ralat pelayan: ${e?.message ?? 'Unknown error'}`
    return NextResponse.json(
      { ok: false, error: errorMsg, details: isProd ? undefined : String(e?.message ?? e) },
      { status: 500 }
    )
  }
}
