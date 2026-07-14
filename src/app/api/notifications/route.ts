import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET() {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })

  const data = await db.notification.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const unreadCount = await db.notification.count({ where: { profileId: profile.id, read: false } })

  return NextResponse.json({ ok: true, data, unreadCount })
}
