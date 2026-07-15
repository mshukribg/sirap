/**
 * POST /api/aktiviti/[id]/approve
 * Penolong Pengarah approves.
 * Status: menunggu_pengesahan → disahkan
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  if (profile.role !== 'penolong_pengarah' && profile.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Hanya Penolong Pengarah boleh mengesahkan rekod.' }, { status: 403 })
  }
  const { id } = await ctx.params

  const akt = await db.aktiviti.findUnique({ where: { id } })
  if (!akt) return NextResponse.json({ ok: false, error: 'Rekod tidak dijumpai.' }, { status: 404 })
  if (akt.status !== 'menunggu_pengesahan') {
    return NextResponse.json({ ok: false, error: 'Hanya rekod Menunggu Pengesahan boleh disahkan.' }, { status: 400 })
  }

  const updated = await db.aktiviti.update({
    where: { id },
    data: {
      status: 'disahkan',
      disahkanOleh: profile.id,
      disahkanPada: new Date(),
      catatanPenolakan: null,
    },
  })

  await db.auditLog.create({
    data: {
      aktivitiId: id,
      tindakan: 'approve',
      olehId: profile.id,
      catatan: `Disahkan: ${akt.namaAktiviti}`,
    },
  })

  // Notify pengajar
  await db.notification.create({
    data: {
      profileId: akt.diciptaOleh,
      title: 'Aktiviti Disahkan',
      message: `"${akt.namaAktiviti}" telah disahkan oleh Penolong Pengarah.`,
      type: 'approve',
    },
  })

  return NextResponse.json({ ok: true, data: updated })
}
