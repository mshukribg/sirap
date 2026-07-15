/**
 * Execute the Supabase SQL migration script directly via pg client.
 * Connects to Supabase Postgres, runs the full migration in order,
 * and reports per-section results.
 */
import { Client } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_DB_URL = 'postgresql://postgres:wshukri3%4077@db.bcmwnhvzwpgrljvsvjdq.supabase.co:5432/postgres'
// Note: '@' must be URL-encoded as %40 in connection string

const SQL_FILE = '/home/z/my-project/download/supabase_setup.sql'

async function main() {
  console.log('Connecting to Supabase database...')
  console.log(`URL: postgresql://postgres:***@db.bcmwnhvzwpgrljvsvjdq.supabase.co:5432/postgres`)

  // Force IPv4 — Supabase pooler/IPv6 routing sometimes fails
  const dns = require('dns')
  dns.setDefaultResultOrder('ipv4first')

  // Resolve to IPv4 explicitly
  const host = 'db.bcmwnhvzwpgrljvsvjdq.supabase.co'
  const { addresses } = await dns.promises.lookup(host, { family: 4 })
  console.log(`Resolved ${host} → IPv4: ${addresses}`)

  const client = new Client({
    host: addresses,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'wshukri3@77',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    query_timeout: 120000,
  })

  try {
    await client.connect()
    console.log('✓ Connected to Supabase Postgres\n')

    // Read SQL file
    const sql = fs.readFileSync(SQL_FILE, 'utf8')
    console.log(`Read SQL file: ${Math.round(sql.length / 1024)} KB`)

    // Split SQL into statements by looking for lines ending with ';'
    // But preserve function/trigger bodies (which have semicolons inside)
    // Strategy: split on ';\n' but be careful with $$ blocks
    const statements: string[] = []
    let current = ''
    let inDollarBlock = false
    
    for (const line of sql.split('\n')) {
      current += line + '\n'
      
      // Track $$ dollar-quoted blocks
      const dollarCount = (line.match(/\$\$/g) || []).length
      if (dollarCount % 2 === 1) {
        inDollarBlock = !inDollarBlock
      }
      
      // If line ends with ';' and we're not in a dollar block, end statement
      if (!inDollarBlock && line.trim().endsWith(';')) {
        const stmt = current.trim()
        if (stmt && !stmt.startsWith('--')) {
          statements.push(stmt)
        }
        current = ''
      }
    }
    
    console.log(`Parsed ${statements.length} SQL statements\n`)

    // Execute each statement
    let success = 0
    let failed = 0
    const errors: string[] = []
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      const preview = stmt.split('\n')[0].slice(0, 80)
      try {
        await client.query(stmt)
        success++
        if (stmt.startsWith('CREATE TABLE') || stmt.startsWith('CREATE TYPE') || stmt.startsWith('CREATE POLICY') || stmt.startsWith('CREATE TRIGGER') || stmt.startsWith('CREATE OR REPLACE FUNCTION') || stmt.startsWith('ALTER TABLE') || stmt.startsWith('DROP TABLE') || stmt.startsWith('DROP TYPE')) {
          console.log(`  ✓ [${i+1}/${statements.length}] ${preview}...`)
        }
      } catch (err: any) {
        failed++
        const msg = `  ✗ [${i+1}/${statements.length}] ${preview}... → ${err.message}`
        errors.push(msg)
        // Don't print all errors inline, just count; we'll show at end
        // But print CREATE failures inline for visibility
        if (stmt.startsWith('CREATE') || stmt.startsWith('DROP')) {
          console.log(msg)
        }
      }
    }

    console.log(`\n=== EXECUTION SUMMARY ===`)
    console.log(`Successful: ${success}/${statements.length}`)
    console.log(`Failed: ${failed}/${statements.length}`)
    
    if (errors.length > 0 && errors.length <= 30) {
      console.log(`\nErrors (first 30):`)
      errors.slice(0, 30).forEach(e => console.log(e))
    } else if (errors.length > 30) {
      console.log(`\nShowing first 10 of ${errors.length} errors:`)
      errors.slice(0, 10).forEach(e => console.log(e))
    }

    // -------------------------------------------------------------------
    // VERIFICATION
    // -------------------------------------------------------------------
    console.log(`\n=== VERIFICATION — Row counts ===`)
    const tables = ['bengkel', 'negeri', 'daerah', 'profiles', 'aktiviti', 'audit_log', 'notifications']
    for (const t of tables) {
      try {
        const r = await client.query(`SELECT count(*) AS c FROM ${t}`)
        console.log(`  ${t}: ${r.rows[0].c} rows`)
      } catch (e: any) {
        console.log(`  ${t}: ERROR — ${e.message}`)
      }
    }

    // Verify auth.users count
    try {
      const r = await client.query('SELECT count(*) AS c FROM auth.users')
      console.log(`  auth.users: ${r.rows[0].c} rows`)
    } catch (e: any) {
      console.log(`  auth.users: ERROR — ${e.message}`)
    }

    // Verify RLS enabled
    console.log(`\n=== RLS Status ===`)
    try {
      const r = await client.query(`
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN ('bengkel','negeri','daerah','profiles','aktiviti','audit_log','notifications')
        ORDER BY tablename
      `)
      for (const row of r.rows) {
        console.log(`  ${row.tablename}: RLS ${row.rowsecurity ? 'ENABLED ✓' : 'DISABLED ✗'}`)
      }
    } catch (e: any) {
      console.log(`  ERROR — ${e.message}`)
    }

    // Verify policies count
    try {
      const r = await client.query(`
        SELECT tablename, count(*) AS policy_count 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        GROUP BY tablename 
        ORDER BY tablename
      `)
      console.log(`\n=== RLS Policies ===`)
      for (const row of r.rows) {
        console.log(`  ${row.tablename}: ${row.policy_count} policies`)
      }
    } catch (e: any) {
      console.log(`  ERROR — ${e.message}`)
    }

    // Verify enum types
    console.log(`\n=== Enum Types ===`)
    try {
      const r = await client.query(`
        SELECT t.typname, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS values
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname IN ('user_role','aktiviti_status')
        GROUP BY t.typname
      `)
      for (const row of r.rows) {
        console.log(`  ${row.typname}: ${row.values}`)
      }
    } catch (e: any) {
      console.log(`  ERROR — ${e.message}`)
    }

    // Verify a sample aktiviti with joins
    console.log(`\n=== Sample aktiviti (first 3 with joins) ===`)
    try {
      const r = await client.query(`
        SELECT a.nama_aktiviti, a.tarikh_pelaksanaan, a.status,
               b.nama_bengkel, n.nama_negeri, d.nama_daerah,
               p.full_name AS pencipta
        FROM aktiviti a
        LEFT JOIN bengkel b ON b.id = a.bengkel_id
        LEFT JOIN negeri n ON n.id = a.negeri_id
        LEFT JOIN daerah d ON d.id = a.daerah_id
        LEFT JOIN profiles p ON p.id = a.dicipta_oleh
        ORDER BY a.created_at
        LIMIT 3
      `)
      for (const row of r.rows) {
        console.log(`  • ${row.nama_aktiviti} (${row.tarikh_pelaksanaan}) — ${row.status}`)
        console.log(`    Bengkel: ${row.nama_bengkel} | Negeri: ${row.nama_negeri} / ${row.nama_daerah}`)
        console.log(`    Pencipta: ${row.pencipta}`)
      }
    } catch (e: any) {
      console.log(`  ERROR — ${e.message}`)
    }

    // Verify a sample auth user
    console.log(`\n=== Auth Users ===`)
    try {
      const r = await client.query(`
        SELECT u.email, p.role, p.full_name, p.active
        FROM auth.users u
        JOIN profiles p ON p.id = u.id
        ORDER BY p.role, u.email
      `)
      for (const row of r.rows) {
        console.log(`  • ${row.email} — ${row.role} | ${row.full_name} | active=${row.active}`)
      }
    } catch (e: any) {
      console.log(`  ERROR — ${e.message}`)
    }

    console.log('\n✅ Migration completed.')
  } catch (err: any) {
    console.error('\n❌ FATAL ERROR:', err.message)
    if (err.stack) console.error(err.stack)
    process.exit(1)
  } finally {
    await client.end().catch(() => {})
  }
}

main().catch(e => { console.error(e); process.exit(1) })
