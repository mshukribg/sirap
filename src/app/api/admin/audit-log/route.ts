/**
 * GET /api/admin/audit-log
 * Admin-only audit log viewer (PRD FR-7.3).
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  if (profile.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Hanya Admin.' }, { status: 403 })
  }

  const url = req.nextUrl
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(10, parseInt(url.searchParams.get('pageSize') ?? '25', 10) || 25))
  const tindakan = url.searchParams.get('tindakan') || undefined
  const olehId = url.searchParams.get('olehId') || undefined
  const aktivitiId = url.searchParams.get('aktivitiId') || undefined

  const where: any = {}
  if (tindakan) where.tindakan = tindakan
  if (olehId) where.olehId = olehId
  if (aktivitiId) where.aktivitiId = aktivitiId

  const [total, rows] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      include: {
        oleh: { select: { id: true, fullName: true, role: true, email: true } },
        aktiviti: { select: { id: true, namaAktiviti: true, status: true } },
      },
      orderBy: { diciptaPada: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({
    ok: true,
    data: rows,
    pagination: {
      page, pageSize, total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  })
}
