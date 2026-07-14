/**
 * GET    /api/admin/users/[id]   — get user
 * PUT    /api/admin/users/[id]   — update user (fullName, role, bengkel, active, optional password)
 * DELETE /api/admin/users/[id]   — deactivate user (soft delete — admin only)
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile, hashPassword, sanitizeText, isValidEmail, isValidPassword, roleLabels } from '@/lib/auth'

export const runtime = 'nodejs'

const VALID_ROLES = ['pengajar', 'penyelaras', 'penolong_pengarah', 'admin']

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  if (profile.role !== 'admin') return NextResponse.json({ ok: false, error: 'Hanya Admin.' }, { status: 403 })
  const { id } = await ctx.params

  const p = await db.profile.findUnique({ where: { id }, include: { bengkel: true } })
  if (!p) return NextResponse.json({ ok: false, error: 'Pengguna tidak dijumpai.' }, { status: 404 })
  return NextResponse.json({
    ok: true,
    data: {
      id: p.id, email: p.email, fullName: p.fullName, role: p.role,
      roleLabel: roleLabels(p.role), active: p.active,
      bengkel: p.bengkel ? { id: p.bengkel.id, namaBengkel: p.bengkel.namaBengkel } : null,
      createdAt: p.createdAt,
    },
  })
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  if (profile.role !== 'admin') return NextResponse.json({ ok: false, error: 'Hanya Admin.' }, { status: 403 })
  const { id } = await ctx.params

  const target = await db.profile.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ ok: false, error: 'Pengguna tidak dijumpai.' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const data: any = {}

  if (body.fullName !== undefined) {
    data.fullName = sanitizeText(String(body.fullName), 200)
    if (!data.fullName) return NextResponse.json({ ok: false, error: 'Nama penuh diperlukan.' }, { status: 400 })
  }
  if (body.email !== undefined) {
    data.email = sanitizeText(String(body.email).toLowerCase(), 254)
    if (!isValidEmail(data.email)) return NextResponse.json({ ok: false, error: 'E-mel tidak sah.' }, { status: 400 })
    const dup = await db.profile.findUnique({ where: { email: data.email } })
    if (dup && dup.id !== id) return NextResponse.json({ ok: false, error: 'E-mel telah digunakan.' }, { status: 409 })
  }
  if (body.role !== undefined) {
    const r = sanitizeText(String(body.role), 30)
    if (!VALID_ROLES.includes(r)) return NextResponse.json({ ok: false, error: 'Peranan tidak sah.' }, { status: 400 })
    data.role = r
    if (r !== 'pengajar') data.bengkelId = null
  }
  if (body.bengkelId !== undefined) {
    if (body.bengkelId === null || body.bengkelId === '') {
      data.bengkelId = null
    } else {
      const bId = sanitizeText(String(body.bengkelId), 50)
      const b = await db.bengkel.findUnique({ where: { id: bId } })
      if (!b) return NextResponse.json({ ok: false, error: 'Bengkel tidak sah.' }, { status: 400 })
      data.bengkelId = bId
    }
  }
  if (body.active !== undefined) {
    data.active = Boolean(body.active)
  }
  if (body.password !== undefined && body.password !== '') {
    const pwd = String(body.password)
    if (!isValidPassword(pwd)) return NextResponse.json({ ok: false, error: 'Kata laluan mesti 8+ aksara dengan huruf & nombor.' }, { status: 400 })
    data.passwordHash = hashPassword(pwd)
  }

  const updated = await db.profile.update({ where: { id }, data, include: { bengkel: true } })

  return NextResponse.json({
    ok: true,
    data: {
      id: updated.id, email: updated.email, fullName: updated.fullName, role: updated.role,
      roleLabel: roleLabels(updated.role), active: updated.active,
      bengkel: updated.bengkel ? { id: updated.bengkel.id, namaBengkel: updated.bengkel.namaBengkel } : null,
      createdAt: updated.createdAt,
    },
  })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ ok: false, error: 'Tidak dibenarkan.' }, { status: 401 })
  if (profile.role !== 'admin') return NextResponse.json({ ok: false, error: 'Hanya Admin.' }, { status: 403 })
  const { id } = await ctx.params

  if (id === profile.id) {
    return NextResponse.json({ ok: false, error: 'Anda tidak boleh memadam akaun sendiri.' }, { status: 400 })
  }

  // Soft-delete: deactivate & invalidate sessions
  await db.profile.update({ where: { id }, data: { active: false } })
  await db.session.deleteMany({ where: { profileId: id } })

  return NextResponse.json({ ok: true })
}
