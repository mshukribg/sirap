/**
 * GET  /api/admin/bengkel   — list all bengkel
 * POST /api/admin/bengkel   — create bengkel (admin)
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile, sanitizeText } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET() {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  if (profile.role !== 'admin') return NextResponse.json({ ok: false, error: 'Hanya Admin.' }, { status: 403 })

  const data = await db.bengkel.findMany({
    orderBy: { namaBengkel: 'asc' },
    include: { _count: { select: { profiles: true, aktiviti: true } } },
  })
  return NextResponse.json({ ok: true, data })
}

export async function POST(req: NextRequest) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  if (profile.role !== 'admin') return NextResponse.json({ ok: false, error: 'Hanya Admin.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const namaBengkel = sanitizeText(String(body?.namaBengkel ?? ''), 200)
  if (!namaBengkel) return NextResponse.json({ ok: false, error: 'Nama bengkel diperlukan.' }, { status: 400 })

  const exists = await db.bengkel.findUnique({ where: { namaBengkel } })
  if (exists) return NextResponse.json({ ok: false, error: 'Nama bengkel telah wujud.' }, { status: 409 })

  const b = await db.bengkel.create({ data: { namaBengkel } })
  return NextResponse.json({ ok: true, data: b })
}
