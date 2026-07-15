/**
 * POST /api/aktiviti/bulk-approve
 * Penolong Pengarah approves multiple records at once.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  if (profile.role !== 'penolong_pengarah' && profile.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Hanya Penolong Pengarah boleh mengesahkan rekod.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: any) => typeof x === 'string') : []
  if (!ids.length) return NextResponse.json({ ok: false, error: 'Pilih sekurang-kurangnya satu rekod.' }, { status: 400 })
  if (ids.length > 100) return NextResponse.json({ ok: false, error: 'Had 100 rekod setiap operasi pukal.' }, { status: 400 })

  const records = await db.aktiviti.findMany({ where: { id: { in: ids } } })
  const invalid = records.filter(r => r.status !== 'menunggu_pengesahan')
  if (invalid.length) {
    return NextResponse.json({ ok: false, error: `${invalid.length} rekod bukan Menunggu Pengesahan.` }, { status: 400 })
  }

  const now = new Date()
  await db.$transaction([
    db.aktiviti.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'disahkan',
        disahkanOleh: profile.id,
        disahkanPada: now,
        catatanPenolakan: null,
        updatedAt: now,
      },
    }),
    ...ids.map(id =>
      db.auditLog.create({
        data: {
          aktivitiId: id,
          tindakan: 'bulk_approve',
          olehId: profile.id,
          catatan: 'Pengesahan pukal',
        },
      })
    ),
  ])

  // Notify all pengajars
  for (const r of records) {
    await db.notification.create({
      data: {
        profileId: r.diciptaOleh,
        title: 'Aktiviti Disahkan',
        message: `"${r.namaAktiviti}" telah disahkan oleh Penolong Pengarah.`,
        type: 'approve',
      },
    })
  }

  return NextResponse.json({ ok: true, count: ids.length })
}
