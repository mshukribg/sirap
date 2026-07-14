/**
 * GET    /api/aktiviti/[id]   — get one activity (with RLS-style checks)
 * PUT    /api/aktiviti/[id]   — update a draft (Pengajar only, own draft)
 * DELETE /api/aktiviti/[id]   — delete a draft (Pengajar only, own draft)
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile, sanitizeText } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  const { id } = await ctx.params

  const akt = await db.aktiviti.findUnique({
    where: { id },
    include: {
      bengkel: true, negeri: true, daerah: true,
      pencipta: { select: { id: true, fullName: true, email: true } },
      penyemak: { select: { id: true, fullName: true, email: true } },
      pengesah: { select: { id: true, fullName: true, email: true } },
      auditLogs: { include: { oleh: { select: { id: true, fullName: true, role: true } } }, orderBy: { diciptaPada: 'desc' } },
    },
  })
  if (!akt) return NextResponse.json({ ok: false, error: 'Rekod tidak dijumpai.' }, { status: 404 })

  // RLS-style visibility
  if (profile.role === 'pengajar' && akt.diciptaOleh !== profile.id) {
    return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 403 })
  }
  if (profile.role === 'penyelaras' && akt.status === 'draf' && akt.diciptaOleh !== profile.id) {
    return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 403 })
  }
  if (profile.role === 'penolong_pengarah' && !['menunggu_pengesahan', 'disahkan', 'ditolak'].includes(akt.status)) {
    return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 403 })
  }

  return NextResponse.json({ ok: true, data: akt })
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  const { id } = await ctx.params

  const akt = await db.aktiviti.findUnique({ where: { id } })
  if (!akt) return NextResponse.json({ ok: false, error: 'Rekod tidak dijumpai.' }, { status: 404 })

  // Only pengajar (own) can edit, only when draf
  if (profile.role !== 'pengajar' && profile.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Hanya Pengajar boleh mengedit rekod.' }, { status: 403 })
  }
  if (akt.diciptaOleh !== profile.id && profile.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Anda hanya boleh mengedit rekod sendiri.' }, { status: 403 })
  }
  if (akt.status !== 'draf') {
    return NextResponse.json({ ok: false, error: 'Hanya rekod berstatus Draf boleh diedit.' }, { status: 400 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const data: any = { updatedAt: new Date() }

    if (body.tarikhPelaksanaan !== undefined) {
      const d = new Date(body.tarikhPelaksanaan)
      if (isNaN(d.getTime())) return NextResponse.json({ ok: false, error: 'Tarikh tidak sah.' }, { status: 400 })
      data.tarikhPelaksanaan = d
    }
    if (body.namaAktiviti !== undefined) data.namaAktiviti = sanitizeText(String(body.namaAktiviti), 300)
    if (body.bengkelId !== undefined) {
      const b = await db.bengkel.findUnique({ where: { id: String(body.bengkelId) } })
      if (!b) return NextResponse.json({ ok: false, error: 'Bengkel tidak sah.' }, { status: 400 })
      data.bengkelId = b.id
    }
    if (body.negeriId !== undefined) {
      const n = await db.negeri.findUnique({ where: { id: String(body.negeriId) } })
      if (!n) return NextResponse.json({ ok: false, error: 'Negeri tidak sah.' }, { status: 400 })
      data.negeriId = n.id
    }
    if (body.daerahId !== undefined) {
      const d = await db.daerah.findUnique({ where: { id: String(body.daerahId) } })
      if (!d) return NextResponse.json({ ok: false, error: 'Daerah tidak sah.' }, { status: 400 })
      if (body.negeriId && d.negeriId !== body.negeriId) {
        return NextResponse.json({ ok: false, error: 'Daerah tidak sepadan dengan negeri.' }, { status: 400 })
      }
      data.daerahId = d.id
    }
    if (body.namaPengurusAktiviti !== undefined) data.namaPengurusAktiviti = sanitizeText(String(body.namaPengurusAktiviti), 200)

    const updated = await db.aktiviti.update({ where: { id }, data })

    await db.auditLog.create({
      data: {
        aktivitiId: id,
        tindakan: 'update',
        olehId: profile.id,
        catatan: `Kemaskini draf: ${data.namaAktiviti ?? akt.namaAktiviti}`,
      },
    })

    return NextResponse.json({ ok: true, data: updated })
  } catch (e) {
    console.error('Update aktiviti error:', e)
    return NextResponse.json({ ok: false, error: 'Ralat pelayan.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  const { id } = await ctx.params

  const akt = await db.aktiviti.findUnique({ where: { id } })
  if (!akt) return NextResponse.json({ ok: false, error: 'Rekod tidak dijumpai.' }, { status: 404 })

  if (profile.role !== 'pengajar' && profile.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Hanya Pengajar boleh memadam rekod.' }, { status: 403 })
  }
  if (akt.diciptaOleh !== profile.id && profile.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Anda hanya boleh memadam rekod sendiri.' }, { status: 403 })
  }
  if (akt.status !== 'draf') {
    return NextResponse.json({ ok: false, error: 'Hanya rekod berstatus Draf boleh dipadam.' }, { status: 400 })
  }

  // Soft log via audit_log BEFORE delete (auditLogs have FK with onDelete: Cascade, so we capture first)
  await db.auditLog.create({
    data: {
      aktivitiId: id,
      tindakan: 'delete',
      olehId: profile.id,
      catatan: `Padam draf: ${akt.namaAktiviti}`,
    },
  })

  await db.aktiviti.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
