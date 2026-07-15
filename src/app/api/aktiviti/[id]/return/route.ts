/**
 * POST /api/aktiviti/[id]/return
 * Penyelaras returns to Pengajar (with required notes).
 * Status: menunggu_semakan → draf (catatanPenolakan set, notification to Pengajar)
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile, sanitizeText } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  if (profile.role !== 'penyelaras' && profile.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Hanya Penyelaras boleh memulangkan rekod.' }, { status: 403 })
  }
  const { id } = await ctx.params

  const akt = await db.aktiviti.findUnique({ where: { id } })
  if (!akt) return NextResponse.json({ ok: false, error: 'Rekod tidak dijumpai.' }, { status: 404 })
  if (akt.status !== 'menunggu_semakan') {
    return NextResponse.json({ ok: false, error: 'Hanya rekod Menunggu Semakan boleh dipulangkan.' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const catatan = sanitizeText(String(body?.catatan ?? ''), 1000)
  if (!catatan) {
    return NextResponse.json({ ok: false, error: 'Catatan sebab pemulangan adalah wajib.' }, { status: 400 })
  }

  const updated = await db.aktiviti.update({
    where: { id },
    data: {
      status: 'draf',
      catatanPenolakan: catatan,
      disemakOleh: profile.id,
    },
  })

  await db.auditLog.create({
    data: {
      aktivitiId: id,
      tindakan: 'return',
      olehId: profile.id,
      catatan: `Dipulangkan kepada Pengajar: ${catatan}`,
    },
  })

  // Notify the pengajar
  await db.notification.create({
    data: {
      profileId: akt.diciptaOleh,
      title: 'Aktiviti Dipulangkan oleh Penyelaras',
      message: `"${akt.namaAktiviti}" telah dipulangkan untuk pembetulan. Sebab: ${catatan}`,
      type: 'return',
    },
  })

  return NextResponse.json({ ok: true, data: updated })
}
