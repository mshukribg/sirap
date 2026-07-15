import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  const { id } = await ctx.params

  const notif = await db.notification.findUnique({ where: { id } })
  if (!notif) return NextResponse.json({ ok: false, error: 'Notifikasi tidak dijumpai.' }, { status: 404 })
  if (notif.profileId !== profile.id) {
    return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 403 })
  }

  await db.notification.update({ where: { id }, data: { read: true } })
  return NextResponse.json({ ok: true })
}
