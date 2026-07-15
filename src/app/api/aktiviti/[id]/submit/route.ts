/**
 * POST /api/aktiviti/[id]/submit
 * Pengajar submits a draft to Penyelaras.
 * Status: draf → menunggu_semakan
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  if (profile.role !== 'pengajar') {
    return NextResponse.json({ ok: false, error: 'Hanya Pengajar boleh menghantar rekod.' }, { status: 403 })
  }
  const { id } = await ctx.params

  const akt = await db.aktiviti.findUnique({ where: { id } })
  if (!akt) return NextResponse.json({ ok: false, error: 'Rekod tidak dijumpai.' }, { status: 404 })
  if (akt.diciptaOleh !== profile.id) {
    return NextResponse.json({ ok: false, error: 'Anda hanya boleh menghantar rekod sendiri.' }, { status: 403 })
  }
  if (akt.status !== 'draf') {
    return NextResponse.json({ ok: false, error: 'Hanya rekod Draf boleh dihantar.' }, { status: 400 })
  }

  const updated = await db.aktiviti.update({
    where: { id },
    data: {
      status: 'menunggu_semakan',
      dihantarSemakanPada: new Date(),
    },
  })

  await db.auditLog.create({
    data: {
      aktivitiId: id,
      tindakan: 'submit',
      olehId: profile.id,
      catatan: `Hantar kepada Penyelaras: ${akt.namaAktiviti}`,
    },
  })

  return NextResponse.json({ ok: true, data: updated })
}
