/**
 * GET  /api/admin/negeri   — list all negeri (with daerah count)
 * POST /api/admin/negeri   — create negeri
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile, sanitizeText } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET() {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  if (profile.role !== 'admin') return NextResponse.json({ ok: false, error: 'Hanya Admin.' }, { status: 403 })

  const data = await db.negeri.findMany({
    orderBy: { namaNegeri: 'asc' },
    include: { _count: { select: { daerah: true, aktiviti: true } } },
  })
  return NextResponse.json({ ok: true, data })
}

export async function POST(req: NextRequest) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  if (profile.role !== 'admin') return NextResponse.json({ ok: false, error: 'Hanya Admin.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const namaNegeri = sanitizeText(String(body?.namaNegeri ?? ''), 100)
  if (!namaNegeri) return NextResponse.json({ ok: false, error: 'Nama negeri diperlukan.' }, { status: 400 })

  const exists = await db.negeri.findUnique({ where: { namaNegeri } })
  if (exists) return NextResponse.json({ ok: false, error: 'Nama negeri telah wujud.' }, { status: 409 })

  const n = await db.negeri.create({ data: { namaNegeri } })
  return NextResponse.json({ ok: true, data: n })
}
