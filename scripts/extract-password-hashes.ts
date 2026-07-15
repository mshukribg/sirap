/**
 * Extract password hashes from local SQLite so we can include them
 * in the Supabase SQL migration. This way the existing login code
 * (which uses profile.passwordHash + scrypt verify) works unchanged
 * on both local SQLite and Supabase Postgres.
 */
import { db } from '../src/lib/db'
import * as fs from 'fs'

async function main() {
  const profiles = await db.profile.findMany({
    select: { email: true, passwordHash: true, role: true },
    orderBy: { createdAt: 'asc' },
  })
  
  console.log(`Found ${profiles.length} profiles with password hashes\n`)
  
  const output: string[] = []
  output.push('-- Password hashes (scrypt) for profiles table')
  output.push('-- These match the local SQLite database so the existing')
  output.push('-- login code (which uses verifyPassword + scrypt) works on Supabase too.')
  output.push('')
  
  for (const p of profiles) {
    // Escape any single quotes in hash (shouldn't be any but be safe)
    const escaped = p.passwordHash.replace(/'/g, "''")
    output.push(`-- ${p.email} (${p.role})`)
    output.push(`UPDATE profiles SET password_hash = '${escaped}' WHERE email = '${p.email}';`)
  }
  
  const outputPath = '/home/z/my-project/download/password_hashes.sql'
  fs.writeFileSync(outputPath, output.join('\n'))
  console.log(`Written to: ${outputPath}`)
  console.log('\nSample (first 3 lines):')
  console.log(output.slice(3, 6).join('\n'))
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => process.exit(0))
