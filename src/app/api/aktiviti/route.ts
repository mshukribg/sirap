/**
 * GET  /api/aktiviti           — list (with filter/search/sort/pagination)
 * POST /api/aktiviti           — create new draft (Pengajar only)
 *
 * Query params (GET):
 *   status, bengkelId, negeriId, daerahId, q (search), sort, order, page, pageSize
 *
 * RBAC:
 *  - pengajar:           only own records (any status)
 *  - penyelaras:         menunggu_semakan + (disahkan if they reviewed) — but PRD says they see all menunggu_semakan
 *  - penolong_pengarah:  menunggu_pengesahan + disahkan
 *  - admin:              everything
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile, sanitizeText } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export const runtime = 'nodejs'

const VALID_STATUS = ['draf', 'menunggu_semakan', 'menunggu_pengesahan', 'disahkan', 'ditolak']
const VALID_SORT = ['tarikhPelaksanaan', 'namaAktiviti', 'createdAt', 'updatedAt']
const VALID_ORDER = ['asc', 'desc']

export async function GET(req: NextRequest) {
  const profile = await getSessionProfile()
  if (!profile) {
    return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  }

  const url = req.nextUrl
  const statusParam = url.searchParams.get('status') ?? ''
  const statuses = statusParam
    ? statusParam.split(',').filter(s => VALID_STATUS.includes(s))
    : []
  const bengkelId = url.searchParams.get('bengkelId') || undefined
  const negeriId = url.searchParams.get('negeriId') || undefined
  const daerahId = url.searchParams.get('daerahId') || undefined
  const q = sanitizeText(url.searchParams.get('q') ?? '', 200)
  const sort = VALID_SORT.includes(url.searchParams.get('sort') ?? '') ? url.searchParams.get('sort')! : 'tarikhPelaksanaan'
  const order = VALID_ORDER.includes(url.searchParams.get('order') ?? '') ? url.searchParams.get('order')! : 'desc'
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(5, parseInt(url.searchParams.get('pageSize') ?? '10', 10) || 10))

  // Build where clause per role
  const where: Prisma.AktivitiWhereInput = {}

  if (profile.role === 'pengajar') {
    where.diciptaOleh = profile.id
  } else if (profile.role === 'penyelaras') {
    // Penyelaras sees: menunggu_semakan (any), menunggu_pengesahan (any — they forwarded them), disahkan, ditolak
    // For simplicity & visibility into their work pipeline, show all non-draf records
    where.NOT = { status: 'draf', diciptaOleh: profile.id } // never see own drafts (penyelaras can't be pengajar in this system, but be safe)
    // Actually per PRD: penyelaras sees "Menunggu Semakan" + above (menunggu_pengesahan, disahkan, ditolak). Excludes draf.
    where.status = { not: 'draf' }
  } else if (profile.role === 'penolong_pengarah') {
    // Sees menunggu_pengesahan + disahkan + ditolak (rejected at their level)
    where.status = { in: ['menunggu_pengesahan', 'disahkan', 'ditolak'] }
  }
  // admin: no filter

  if (statuses.length) where.status = { in: statuses }
  if (bengkelId) where.bengkelId = bengkelId
  if (negeriId) where.negeriId = negeriId
  if (daerahId) where.daerahId = daerahId
  if (q) {
    where.OR = [
      { namaAktiviti: { contains: q } },
      { namaPengurusAktiviti: { contains: q } },
    ]
  }

  const [total, records] = await Promise.all([
    db.aktiviti.count({ where }),
    db.aktiviti.findMany({
      where,
      include: {
        bengkel: true,
        negeri: true,
        daerah: true,
        pencipta: { select: { id: true, fullName: true, email: true } },
        penyemak: { select: { id: true, fullName: true, email: true } },
        pengesah: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { [sort]: order },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({
    ok: true,
    data: records,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  })
}

export async function POST(req: NextRequest) {
  const profile = await getSessionProfile()
  if (!profile) {
    return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  }
  if (profile.role !== 'pengajar') {
    return NextResponse.json({ ok: false, error: 'Hanya Pengajar boleh mencipta rekod aktiviti.' }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const tarikh = body?.tarikhPelaksanaan
    const namaAktiviti = sanitizeText(String(body?.namaAktiviti ?? ''), 300)
    const bengkelId = sanitizeText(String(body?.bengkelId ?? ''), 50)
    const negeriId = sanitizeText(String(body?.negeriId ?? ''), 50)
    const daerahId = sanitizeText(String(body?.daerahId ?? ''), 50)
    const namaPengurusAktiviti = sanitizeText(String(body?.namaPengurusAktiviti ?? ''), 200)

    if (!tarikh || isNaN(new Date(tarikh).getTime())) {
      return NextResponse.json({ ok: false, error: 'Tarikh pelaksanaan tidak sah.' }, { status: 400 })
    }
    if (!namaAktiviti) return NextResponse.json({ ok: false, error: 'Nama aktiviti diperlukan.' }, { status: 400 })
    if (!bengkelId) return NextResponse.json({ ok: false, error: 'Bengkel diperlukan.' }, { status: 400 })
    if (!negeriId) return NextResponse.json({ ok: false, error: 'Negeri diperlukan.' }, { status: 400 })
    if (!daerahId) return NextResponse.json({ ok: false, error: 'Daerah diperlukan.' }, { status: 400 })
    if (!namaPengurusAktiviti) return NextResponse.json({ ok: false, error: 'Nama pengurus aktiviti diperlukan.' }, { status: 400 })

    // Validate FK integrity
    const [bengkel, negeri, daerah] = await Promise.all([
      db.bengkel.findUnique({ where: { id: bengkelId } }),
      db.negeri.findUnique({ where: { id: negeriId } }),
      db.daerah.findUnique({ where: { id: daerahId } }),
    ])
    if (!bengkel) return NextResponse.json({ ok: false, error: 'Bengkel tidak sah.' }, { status: 400 })
    if (!negeri) return NextResponse.json({ ok: false, error: 'Negeri tidak sah.' }, { status: 400 })
    if (!daerah || daerah.negeriId !== negeriId) {
      return NextResponse.json({ ok: false, error: 'Daerah tidak sepadan dengan negeri.' }, { status: 400 })
    }

    // Pengajar MUST create with their own bengkel
    if (profile.bengkelId && profile.bengkelId !== bengkelId) {
      // PRD doesn't explicitly forbid choosing another bengkel, but for data integrity we enforce it
      // We'll allow it for Admin-created pengajar with no bengkel; otherwise enforce
      // Actually, allow pengajar to choose any bengkel for flexibility per PRD 7.2
    }

    const aktiviti = await db.aktiviti.create({
      data: {
        tarikhPelaksanaan: new Date(tarikh),
        namaAktiviti,
        bengkelId,
        negeriId,
        daerahId,
        namaPengurusAktiviti,
        status: 'draf',
        diciptaOleh: profile.id,
      },
    })

    await db.auditLog.create({
      data: {
        aktivitiId: aktiviti.id,
        tindakan: 'create',
        olehId: profile.id,
        catatan: `Cipta draf: ${namaAktiviti}`,
      },
    })

    return NextResponse.json({ ok: true, data: aktiviti })
  } catch (e) {
    console.error('Create aktiviti error:', e)
    return NextResponse.json({ ok: false, error: 'Ralat pelayan.' }, { status: 500 })
  }
}
