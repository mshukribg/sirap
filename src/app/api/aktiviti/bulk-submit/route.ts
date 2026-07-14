/**
 * POST /api/aktiviti/bulk-submit
 * Body: { ids: string[] }
 * Pengajar submits multiple drafts in one transaction.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  if (profile.role !== 'pengajar') {
    return NextResponse.json({ ok: false, error: 'Hanya Pengajar boleh menghantar rekod.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: any) => typeof x === 'string') : []
  if (!ids.length) {
    return NextResponse.json({ ok: false, error: 'Pilih sekurang-kurangnya satu rekod.' }, { status: 400 })
  }
  if (ids.length > 100) {
    return NextResponse.json({ ok: false, error: 'Had 100 rekod setiap operasi pukal.' }, { status: 400 })
  }

  // Verify all are drafts owned by this pengajar
  const records = await db.aktiviti.findMany({ where: { id: { in: ids } } })
  const invalid = records.filter(r => r.diciptaOleh !== profile.id || r.status !== 'draf')
  if (invalid.length) {
    return NextResponse.json({
      ok: false,
      error: `${invalid.length} rekod tidak boleh dihantar (bukan draf anda).`,
    }, { status: 400 })
  }

  const now = new Date()
  await db.$transaction([
    db.aktiviti.updateMany({
      where: { id: { in: ids } },
      data: { status: 'menunggu_semakan', dihantarSemakanPada: now, updatedAt: now },
    }),
    ...ids.map(id =>
      db.auditLog.create({
        data: {
          aktivitiId: id,
          tindakan: 'bulk_submit',
          olehId: profile.id,
          catatan: 'Hantar pukal kepada Penyelaras',
        },
      })
    ),
  ])

  return NextResponse.json({ ok: true, count: ids.length })
}
