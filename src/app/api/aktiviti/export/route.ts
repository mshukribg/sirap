/**
 * GET /api/aktiviti/export
 * Exports disahkan activities as CSV (PRD FR-5.4).
 * Allowed for: Penolong Pengarah, Penyelaras, Admin (Pengajar exports their own disahkan).
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'

export const runtime = 'nodejs'

function csvEscape(s: any): string {
  if (s === null || s === undefined) return ''
  const str = String(s)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(req: NextRequest) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })

  const url = req.nextUrl
  const format = url.searchParams.get('format') === 'excel' ? 'excel' : 'csv'
  const canSeeAll = ['penolong_pengarah', 'penyelaras', 'admin'].includes(profile.role)

  const where: any = { status: 'disahkan' }
  if (!canSeeAll) where.diciptaOleh = profile.id
  if (url.searchParams.get('negeriId')) where.negeriId = url.searchParams.get('negeriId')!
  if (url.searchParams.get('daerahId')) where.daerahId = url.searchParams.get('daerahId')!
  if (url.searchParams.get('bengkelId')) where.bengkelId = url.searchParams.get('bengkelId')!
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  if (from || to) {
    where.tarikhPelaksanaan = {}
    if (from) where.tarikhPelaksanaan.gte = new Date(from)
    if (to) where.tarikhPelaksanaan.lte = new Date(to)
  }

  const records = await db.aktiviti.findMany({
    where,
    include: { bengkel: true, negeri: true, daerah: true, pencipta: true, pengesah: true },
    orderBy: { tarikhPelaksanaan: 'desc' },
  })

  const headers = [
    'Bil', 'Tarikh Pelaksanaan', 'Nama Aktiviti', 'Bengkel', 'Daerah', 'Negeri',
    'Pengurus Aktiviti', 'Pencipta', 'Disahkan Oleh', 'Tarikh Disahkan',
  ]
  const rows = records.map((r, i) => [
    i + 1,
    r.tarikhPelaksanaan.toISOString().slice(0, 10),
    r.namaAktiviti,
    r.bengkel.namaBengkel,
    r.daerah.namaDaerah,
    r.negeri.namaNegeri,
    r.namaPengurusAktiviti,
    r.pencipta.fullName,
    r.pengesah?.fullName ?? '',
    r.disahkanPada ? r.disahkanPada.toISOString().slice(0, 10) : '',
  ])

  const csv = [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\r\n')

  const filename = `aktiviti_disahkan_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'csv' : 'csv'}`
  // For "excel" we use BOM so Excel opens UTF-8 properly
  const bom = '\uFEFF'
  const body = format === 'excel' ? bom + csv : csv

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': `text/csv; charset=utf-8`,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
