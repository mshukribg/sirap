/**
 * POST /api/aktiviti/[id]/reject
 * Penolong Pengarah rejects (with required notes).
 * Status: menunggu_pengesahan → draf (catatanPenolakan set, notification to Pengajar)
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile, sanitizeText } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  if (profile.role !== 'penolong_pengarah' && profile.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Hanya Penolong Pengarah boleh menolak rekod.' }, { status: 403 })
  }
  const { id } = await ctx.params

  const akt = await db.aktiviti.findUnique({ where: { id } })
  if (!akt) return NextResponse.json({ ok: false, error: 'Rekod tidak dijumpai.' }, { status: 404 })
  if (akt.status !== 'menunggu_pengesahan') {
    return NextResponse.json({ ok: false, error: 'Hanya rekod Menunggu Pengesahan boleh ditolak.' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const catatan = sanitizeText(String(body?.catatan ?? ''), 1000)
  if (!catatan) {
    return NextResponse.json({ ok: false, error: 'Catatan sebab penolakan adalah wajib.' }, { status: 400 })
  }

  const updated = await db.aktiviti.update({
    where: { id },
    data: {
      status: 'draf',
      catatanPenolakan: catatan,
      disahkanOleh: profile.id,
    },
  })

  await db.auditLog.create({
    data: {
      aktivitiId: id,
      tindakan: 'reject',
      olehId: profile.id,
      catatan: `Ditolak: ${catatan}`,
    },
  })

  await db.notification.create({
    data: {
      profileId: akt.diciptaOleh,
      title: 'Aktiviti Ditolak oleh Penolong Pengarah',
      message: `"${akt.namaAktiviti}" telah ditolak. Sebab: ${catatan}`,
      type: 'reject',
    },
  })

  return NextResponse.json({ ok: true, data: updated })
}
