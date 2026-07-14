import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET() {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })

  const data = await db.negeri.findMany({ orderBy: { namaNegeri: 'asc' } })
  return NextResponse.json({ ok: true, data })
}
