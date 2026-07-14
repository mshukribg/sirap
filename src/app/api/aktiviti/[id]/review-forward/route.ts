/**
 * POST /api/aktiviti/[id]/review-forward
 * Penyelaras forwards to Penolong Pengarah.
 * Status: menunggu_semakan → menunggu_pengesahan
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  if (profile.role !== 'penyelaras' && profile.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Hanya Penyelaras boleh menyemak & menghantar ke Penolong Pengarah.' }, { status: 403 })
  }
  const { id } = await ctx.params

  const akt = await db.aktiviti.findUnique({ where: { id } })
  if (!akt) return NextResponse.json({ ok: false, error: 'Rekod tidak dijumpai.' }, { status: 404 })
  if (akt.status !== 'menunggu_semakan') {
    return NextResponse.json({ ok: false, error: 'Hanya rekod Menunggu Semakan boleh dihantar ke Penolong Pengarah.' }, { status: 400 })
  }

  const updated = await db.aktiviti.update({
    where: { id },
    data: {
      status: 'menunggu_pengesahan',
      disemakOleh: profile.id,
      dihantarPengesahanPada: new Date(),
    },
  })

  await db.auditLog.create({
    data: {
      aktivitiId: id,
      tindakan: 'review_forward',
      olehId: profile.id,
      catatan: `Disemak & dihantar kepada Penolong Pengarah: ${akt.namaAktiviti}`,
    },
  })

  return NextResponse.json({ ok: true, data: updated })
}
