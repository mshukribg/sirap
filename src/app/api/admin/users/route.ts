/**
 * GET  /api/admin/users   — list all users (Admin only)
 * POST /api/admin/users   — create user (Admin only)
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile, hashPassword, sanitizeText, isValidEmail, isValidPassword, roleLabels } from '@/lib/auth'

export const runtime = 'nodejs'

const VALID_ROLES = ['pengajar', 'penyelaras', 'penolong_pengarah', 'admin']

export async function GET(req: NextRequest) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  if (profile.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Hanya Admin dibenarkan.' }, { status: 403 })
  }

  const q = sanitizeText(req.nextUrl.searchParams.get('q') ?? '', 200)
  const role = req.nextUrl.searchParams.get('role') || undefined

  const where: any = {}
  if (q) where.OR = [{ fullName: { contains: q } }, { email: { contains: q } }]
  if (role && VALID_ROLES.includes(role)) where.role = role

  const data = await db.profile.findMany({
    where,
    include: { bengkel: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    ok: true,
    data: data.map(p => ({
      id: p.id, email: p.email, fullName: p.fullName, role: p.role,
      roleLabel: roleLabels(p.role), active: p.active,
      bengkel: p.bengkel ? { id: p.bengkel.id, namaBengkel: p.bengkel.namaBengkel } : null,
      createdAt: p.createdAt,
    })),
  })
}

export async function POST(req: NextRequest) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  if (profile.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Hanya Admin dibenarkan.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const fullName = sanitizeText(String(body?.fullName ?? ''), 200)
  const email = sanitizeText(String(body?.email ?? '').toLowerCase(), 254)
  const password = String(body?.password ?? '')
  const role = sanitizeText(String(body?.role ?? ''), 30)
  const bengkelId = body?.bengkelId ? sanitizeText(String(body.bengkelId), 50) : null

  if (!fullName) return NextResponse.json({ ok: false, error: 'Nama penuh diperlukan.' }, { status: 400 })
  if (!isValidEmail(email)) return NextResponse.json({ ok: false, error: 'E-mel tidak sah.' }, { status: 400 })
  if (!isValidPassword(password)) return NextResponse.json({ ok: false, error: 'Kata laluan mesti 8+ aksara dengan huruf & nombor.' }, { status: 400 })
  if (!VALID_ROLES.includes(role)) return NextResponse.json({ ok: false, error: 'Peranan tidak sah.' }, { status: 400 })

  const existing = await db.profile.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ ok: false, error: 'E-mel telah digunakan.' }, { status: 409 })

  if (bengkelId) {
    const b = await db.bengkel.findUnique({ where: { id: bengkelId } })
    if (!b) return NextResponse.json({ ok: false, error: 'Bengkel tidak sah.' }, { status: 400 })
  }
  if (role !== 'pengajar' && bengkelId) {
    return NextResponse.json({ ok: false, error: 'Hanya Pengajar dikaitkan dengan bengkel.' }, { status: 400 })
  }

  const created = await db.profile.create({
    data: { fullName, email, role, passwordHash: hashPassword(password), bengkelId },
    include: { bengkel: true },
  })

  return NextResponse.json({
    ok: true,
    data: {
      id: created.id, email: created.email, fullName: created.fullName, role: created.role,
      roleLabel: roleLabels(created.role), active: created.active,
      bengkel: created.bengkel ? { id: created.bengkel.id, namaBengkel: created.bengkel.namaBengkel } : null,
      createdAt: created.createdAt,
    },
  })
}
