/**
 * GET /api/health
 * Health check endpoint — used to verify database connectivity.
 * Returns: { ok, db: 'connected' | error message, env: { ... } }
 *
 * Useful for debugging Vercel deployment issues.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const diagnostics: any = {
    ok: true,
    timestamp: new Date().toISOString(),
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlScheme: process.env.DATABASE_URL?.split('://')[0] ?? 'unset',
      nodeEnv: process.env.NODE_ENV,
    },
    db: 'pending',
  }

  try {
    // Try a simple query
    const userCount = await db.profile.count()
    const aktivitiCount = await db.aktiviti.count()
    const bengkelCount = await db.bengkel.count()
    diagnostics.db = 'connected'
    diagnostics.counts = {
      profiles: userCount,
      aktiviti: aktivitiCount,
      bengkel: bengkelCount,
    }
  } catch (e: any) {
    diagnostics.ok = false
    diagnostics.db = 'error'
    diagnostics.error = e?.message ?? String(e)
    // Show more details for debugging
    if (e?.code) diagnostics.errorCode = e.code
    return NextResponse.json(diagnostics, { status: 500 })
  }

  return NextResponse.json(diagnostics)
}
