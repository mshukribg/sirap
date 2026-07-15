import { NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET() {
  const profile = await getSessionProfile()
  if (!profile) {
    return NextResponse.json({ ok: false, profile: null }, { status: 200 })
  }
  return NextResponse.json({
    ok: true,
    profile: {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      role: profile.role,
      bengkel: profile.bengkel ? { id: profile.bengkel.id, namaBengkel: profile.bengkel.namaBengkel } : null,
    },
  })
}
