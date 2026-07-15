/**
 * GET /api/statistik
 *
 * Computes statistics on disahkan activities only.
 *
 * Query params:
 *   period   = 'daily' | 'weekly' | 'monthly' | 'yearly'  (default: 'monthly')
 *   negeriId = string  (optional filter)
 *   daerahId = string  (optional filter)
 *   bengkelId= string  (optional filter)
 *
 * Returns:
 *  - summary: { total, thisMonth, lastMonth, percentChange, thisYear, topNegeri, topDaerah }
 *  - trend:   [{ label, count }, ...]   (e.g. last 30 days / 12 weeks / 12 months / N years)
 *  - byNegeri:[{ negeri, count }, ...]
 *  - byDaerah:[{ daerah, negeri, count }, ...]
 *  - byBengkel:[{ bengkel, count }, ...]
 *  - byStatus:[{ status, count }, ...]   (all activities, useful for queues)
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'

export const runtime = 'nodejs'

function startOfDay(d: Date) { d.setHours(0, 0, 0, 0); return d }
function startOfWeek(d: Date) { const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); d.setHours(0, 0, 0, 0); return d }
function startOfMonth(d: Date) { d.setDate(1); d.setHours(0, 0, 0, 0); return d }
function startOfYear(d: Date) { d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return d }

function fmtDate(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export async function GET(req: NextRequest) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })

  // PP, Penyelaras, Admin can see full stats; Pengajar only sees their own
  const canSeeAll = ['penolong_pengarah', 'penyelaras', 'admin'].includes(profile.role)

  const url = req.nextUrl
  const period = (url.searchParams.get('period') ?? 'monthly') as 'daily' | 'weekly' | 'monthly' | 'yearly'
  const negeriId = url.searchParams.get('negeriId') || undefined
  const daerahId = url.searchParams.get('daerahId') || undefined
  const bengkelId = url.searchParams.get('bengkelId') || undefined

  // Build where
  const baseWhere: any = { status: 'disahkan' }
  if (!canSeeAll) baseWhere.diciptaOleh = profile.id
  if (negeriId) baseWhere.negeriId = negeriId
  if (daerahId) baseWhere.daerahId = daerahId
  if (bengkelId) baseWhere.bengkelId = bengkelId

  // ---- Trend by period ----
  const now = new Date()
  const trend: { label: string; count: number }[] = []

  // Compute list of period start dates
  const periodStarts: { start: Date; label: string }[] = []
  if (period === 'daily') {
    for (let i = 29; i >= 0; i--) {
      const d = startOfDay(new Date(now))
      d.setDate(d.getDate() - i)
      periodStarts.push({ start: d, label: fmtDate(d) })
    }
  } else if (period === 'weekly') {
    for (let i = 11; i >= 0; i--) {
      const d = startOfWeek(new Date(now))
      d.setDate(d.getDate() - i * 7)
      const end = new Date(d); end.setDate(end.getDate() + 6)
      periodStarts.push({ start: d, label: `${fmtDate(d)} - ${fmtDate(end)}` })
    }
  } else if (period === 'monthly') {
    for (let i = 11; i >= 0; i--) {
      const d = startOfMonth(new Date(now))
      d.setMonth(d.getMonth() - i)
      const monthName = d.toLocaleDateString('ms-MY', { month: 'short', year: 'numeric' })
      periodStarts.push({ start: d, label: monthName })
    }
  } else { // yearly
    // Determine earliest year from data
    const earliest = await db.aktiviti.aggregate({ _min: { tarikhPelaksanaan: true }, where: baseWhere })
    const minY = earliest._min.tarikhPelaksanaan ? new Date(earliest._min.tarikhPelaksanaan).getFullYear() : now.getFullYear()
    const maxY = now.getFullYear()
    for (let y = minY; y <= maxY; y++) {
      const d = startOfYear(new Date(y, 0, 1))
      periodStarts.push({ start: d, label: String(y) })
    }
  }

  for (let i = 0; i < periodStarts.length; i++) {
    const start = periodStarts[i].start
    const end = i + 1 < periodStarts.length ? periodStarts[i + 1].start : new Date(now.getTime() + 1)
    const count = await db.aktiviti.count({
      where: { ...baseWhere, tarikhPelaksanaan: { gte: start, lt: end } },
    })
    trend.push({ label: periodStarts[i].label, count })
  }

  // ---- Summary cards ----
  const total = await db.aktiviti.count({ where: baseWhere })

  const thisMonthStart = startOfMonth(new Date(now))
  const lastMonthStart = startOfMonth(new Date(now)); lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)
  const thisMonthEnd = new Date(now.getTime() + 1)
  const thisMonthCount = await db.aktiviti.count({
    where: { ...baseWhere, tarikhPelaksanaan: { gte: thisMonthStart, lt: thisMonthEnd } },
  })
  const lastMonthEnd = thisMonthStart
  const lastMonthCount = await db.aktiviti.count({
    where: { ...baseWhere, tarikhPelaksanaan: { gte: lastMonthStart, lt: lastMonthEnd } },
  })
  const percentChange = lastMonthCount === 0
    ? (thisMonthCount > 0 ? 100 : 0)
    : Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)

  const thisYearStart = startOfYear(new Date(now))
  const thisYearCount = await db.aktiviti.count({
    where: { ...baseWhere, tarikhPelaksanaan: { gte: thisYearStart } },
  })

  // Top negeri & top daerah (this year)
  const byNegeriRows = await db.aktiviti.groupBy({
    by: ['negeriId'],
    where: { ...baseWhere, tarikhPelaksanaan: { gte: thisYearStart } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  })
  const negeriIds = byNegeriRows.map(r => r.negeriId)
  const negeriRecords = await db.negeri.findMany({ where: { id: { in: negeriIds } } })
  const byNegeri = byNegeriRows.map(r => ({
    negeri: negeriRecords.find(n => n.id === r.negeriId)?.namaNegeri ?? '—',
    count: r._count.id,
  }))

  const byDaerahRows = await db.aktiviti.groupBy({
    by: ['daerahId'],
    where: { ...baseWhere, tarikhPelaksanaan: { gte: thisYearStart } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  })
  const daerahIds = byDaerahRows.map(r => r.daerahId)
  const daerahRecords = await db.daerah.findMany({ where: { id: { in: daerahIds } }, include: { negeri: true } })
  const byDaerah = byDaerahRows.map(r => {
    const d = daerahRecords.find(x => x.id === r.daerahId)
    return { daerah: d?.namaDaerah ?? '—', negeri: d?.negeri.namaNegeri ?? '—', count: r._count.id }
  })

  const byBengkelRows = await db.aktiviti.groupBy({
    by: ['bengkelId'],
    where: baseWhere,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  })
  const bengkelIds = byBengkelRows.map(r => r.bengkelId)
  const bengkelRecords = await db.bengkel.findMany({ where: { id: { in: bengkelIds } } })
  const byBengkel = byBengkelRows.map(r => ({
    bengkel: bengkelRecords.find(b => b.id === r.bengkelId)?.namaBengkel ?? '—',
    count: r._count.id,
  }))

  // By status (for queue widgets)
  const statusWhere: any = {}
  if (!canSeeAll) statusWhere.diciptaOleh = profile.id
  if (negeriId) statusWhere.negeriId = negeriId
  if (daerahId) statusWhere.daerahId = daerahId
  if (bengkelId) statusWhere.bengkelId = bengkelId
  const byStatusRows = await db.aktiviti.groupBy({
    by: ['status'],
    where: statusWhere,
    _count: { id: true },
  })
  const STATUS_LABELS: Record<string, string> = {
    draf: 'Draf',
    menunggu_semakan: 'Menunggu Semakan',
    menunggu_pengesahan: 'Menunggu Pengesahan',
    disahkan: 'Disahkan',
    ditolak: 'Ditolak',
  }
  const byStatus = byStatusRows.map(r => ({
    status: r.status,
    label: STATUS_LABELS[r.status] ?? r.status,
    count: r._count.id,
  }))

  return NextResponse.json({
    ok: true,
    summary: {
      total,
      thisMonth: thisMonthCount,
      lastMonth: lastMonthCount,
      percentChange,
      thisYear: thisYearCount,
      topNegeri: byNegeri.slice(0, 3),
      topDaerah: byDaerah.slice(0, 3),
    },
    trend,
    byNegeri,
    byDaerah,
    byBengkel,
    byStatus,
  })
}
