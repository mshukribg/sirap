/**
 * Try connecting via Supabase Session Pooler (IPv4) — try multiple regions
 * until we find the one hosting this project.
 */
import { Client } from 'pg'

const REGIONS = [
  'ap-southeast-1',  // Singapore (most likely for Malaysia project)
  'ap-northeast-1',  // Tokyo
  'ap-south-1',      // Mumbai
  'ap-east-1',       // Hong Kong
  'us-west-1',
  'us-east-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'eu-west-2',
  'sa-east-1',
]

const PROJECT_REF = 'bcmwnhvzwpgrljvsvjdq'
const PASSWORD = 'wshukri3@77'

async function tryConnect(region: string): Promise<boolean> {
  const host = `aws-0-${region}.pooler.supabase.com`
  const user = `postgres.${PROJECT_REF}`
  console.log(`Trying ${host}...`)
  const client = new Client({
    host,
    port: 5432,  // Session pooler (port 5432), transaction pooler is 6543
    database: 'postgres',
    user,
    password: PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
    query_timeout: 15000,
  })
  try {
    await client.connect()
    const r = await client.query('SELECT current_database() AS db, current_user AS user, version() AS v')
    console.log(`  ✓ CONNECTED on ${region}!`)
    console.log(`    DB: ${r.rows[0].db}`)
    console.log(`    User: ${r.rows[0].user}`)
    console.log(`    Version: ${r.rows[0].v.split(',').slice(0,2).join(',')}`)
    await client.end()
    return true
  } catch (e: any) {
    console.log(`  ✗ ${region}: ${e.message.split('\n')[0]}`)
    try { await client.end() } catch {}
    return false
  }
}

async function main() {
  for (const region of REGIONS) {
    if (await tryConnect(region)) {
      console.log(`\n✅ Found region: ${region}`)
      console.log(`Pooler host: aws-0-${region}.pooler.supabase.com:5432`)
      console.log(`User: postgres.${PROJECT_REF}`)
      return
    }
  }
  console.log('\n❌ Could not connect to any pooler region')
}

main().catch(e => { console.error(e); process.exit(1) })
