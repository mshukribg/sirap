/**
 * GET  /api/admin/daerah   — list all daerah (with negeri info)
 * POST /api/admin/daerah   — create daerah (requires namaDaerah + negeriId)
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile, sanitizeText } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  if (profile.role !== 'admin') return NextResponse.json({ ok: false, error: 'Hanya Admin.' }, { status: 403 })

  const negeriId = req.nextUrl.searchParams.get('negeriId') || undefined
  const data = await db.daerah.findMany({
    where: negeriId ? { negeriId } : undefined,
    include: { negeri: true, _count: { select: { aktiviti: true } } },
    orderBy: [{ negeri: { namaNegeri: 'asc' } }, { namaDaerah: 'asc' }],
  })
  return NextResponse.json({ ok: true, data })
}

export async function POST(req: NextRequest) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  if (profile.role !== 'admin') return NextResponse.json({ ok: false, error: 'Hanya Admin.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const namaDaerah = sanitizeText(String(body?.namaDaerah ?? ''), 100)
  const negeriId = sanitizeText(String(body?.negeriId ?? ''), 50)

  if (!namaDaerah) return NextResponse.json({ ok: false, error: 'Nama daerah diperlukan.' }, { status: 400 })
  if (!negeriId) return NextResponse.json({ ok: false, error: 'Negeri diperlukan.' }, { status: 400 })

  const n = await db.negeri.findUnique({ where: { id: negeriId } })
  if (!n) return NextResponse.json({ ok: false, error: 'Negeri tidak sah.' }, { status: 400 })

  const dup = await db.daerah.findUnique({
    where: { namaDaerah_negeriId: { namaDaerah, negeriId } },
  }).catch(() => null)
  if (dup) return NextResponse.json({ ok: false, error: 'Daerah telah wujud dalam negeri ini.' }, { status: 409 })

  const d = await db.daerah.create({ data: { namaDaerah, negeriId }, include: { negeri: true } })
  return NextResponse.json({ ok: true, data: d })
}
