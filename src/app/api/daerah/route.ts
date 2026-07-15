/**
 * GET /api/daerah?negeriId=...
 * Returns daerah list (optionally filtered by negeri)
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })

  const negeriId = req.nextUrl.searchParams.get('negeriId') || undefined
  const data = await db.daerah.findMany({
    where: negeriId ? { negeriId } : undefined,
    include: { negeri: true },
    orderBy: [{ negeri: { namaNegeri: 'asc' } }, { namaDaerah: 'asc' }],
  })
  return NextResponse.json({ ok: true, data })
}
