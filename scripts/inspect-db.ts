// Quick DB inspection
import { db } from '../src/lib/db'

async function main() {
  const counts = {
    bengkel: await db.bengkel.count(),
    negeri: await db.negeri.count(),
    daerah: await db.daerah.count(),
    profiles: await db.profile.count(),
    aktiviti: await db.aktiviti.count(),
    auditLog: await db.auditLog.count(),
    notifications: await db.notification.count(),
    sessions: await db.session.count(),
  }
  console.log('=== DB COUNTS ===')
  console.log(counts)

  console.log('\n=== PROFILES ===')
  const profiles = await db.profile.findMany({ select: { email: true, fullName: true, role: true, active: true, bengkel: { select: { namaBengkel: true } } } })
  for (const p of profiles) console.log(`- ${p.email} | ${p.role} | ${p.fullName} | bengkel=${p.bengkel?.namaBengkel ?? '-'}`)

  console.log('\n=== AKTIVITI BY STATUS ===')
  const grouped = await db.aktiviti.groupBy({ by: ['status'], _count: true })
  for (const g of grouped) console.log(`- ${g.status}: ${g._count}`)

  console.log('\n=== BENGKEL ===')
  const bengkels = await db.bengkel.findMany()
  for (const b of bengkels) console.log(`- ${b.namaBengkel}`)

  console.log('\n=== NEGERI + DAERAH ===')
  const negeri = await db.negeri.findMany({ include: { daerah: true } })
  for (const n of negeri) {
    console.log(`- ${n.namaNegeri} (${n.daerah.length} daerah)`)
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => process.exit(0))
