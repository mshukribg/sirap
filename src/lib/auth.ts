/**
 * Auth utilities — password hashing (scrypt), session tokens, RBAC helpers.
 * No external dependencies; uses Node built-in crypto.
 */
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { db } from './db'

// Cookie names
export const SESSION_COOKIE = 'adtec_session'

// Session lifetime: 7 days
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const computed = scryptSync(password, salt, 64).toString('hex')
  try {
    return timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'))
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export async function createSession(profileId: string): Promise<string> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await db.session.create({ data: { token, profileId, expiresAt } })
  return token
}

export async function getSessionProfile() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await db.session.findUnique({
    where: { token },
    include: { profile: { include: { bengkel: true } } },
  })

  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  if (!session.profile.active) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  return session.profile
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => {})
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

// ---------------------------------------------------------------------------
// RBAC helpers
// ---------------------------------------------------------------------------

export type Role = 'pengajar' | 'penyelaras' | 'penolong_pengarah' | 'admin'

export function roleLabels(role: string): string {
  switch (role) {
    case 'pengajar':           return 'Pengajar'
    case 'penyelaras':         return 'Penyelaras'
    case 'penolong_pengarah':  return 'Penolong Pengarah'
    case 'admin':              return 'Admin'
    default:                   return role
  }
}

export function hasRole(profile: { role: string } | null, ...roles: Role[]): profile is { role: string } & { id: string } {
  if (!profile) return false
  return roles.includes(profile.role as Role)
}

// ---------------------------------------------------------------------------
// Validation helpers (input sanitization — basic XSS/injection defence)
// ---------------------------------------------------------------------------

export function sanitizeText(s: string, max = 500): string {
  if (typeof s !== 'string') return ''
  return s.trim().slice(0, max)
}

export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254
}

export function isValidPassword(s: string): boolean {
  // Min 8 chars, at least 1 letter & 1 number
  return typeof s === 'string' && s.length >= 8 && s.length <= 128 && /[A-Za-z]/.test(s) && /[0-9]/.test(s)
}
