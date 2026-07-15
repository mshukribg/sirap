// Extract all data from local SQLite database and generate a complete
// PostgreSQL migration script for Supabase.
//
// This script:
// 1. Reads all reference data, profiles, aktiviti, audit_log, notifications
// 2. Generates PostgreSQL DDL (tables, enums, RLS policies)
// 3. Generates INSERT statements with the actual seed data
// 4. Outputs a single .sql file ready to run in Supabase SQL Editor
//
// IMPORTANT: For Supabase Auth integration, we use auth.users() helper.
// We create auth users first, then profiles linking to them.

import { db } from '../src/lib/db'
import * as fs from 'fs'
import * as path from 'path'

// Stable UUIDs for reference data (so foreign keys work consistently)
// We'll use deterministic UUIDs based on names
import * as crypto from 'crypto'
function uuidFromName(name: string): string {
  // Simple deterministic UUID v4-like from string hash
  const hash = crypto.createHash('md5').update(name).digest('hex')
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16), // version 4
    '8' + hash.slice(17, 20), // variant
    hash.slice(20, 32),
  ].join('-')
}

// Escape SQL string literals
function sqlStr(s: string | null | undefined): string {
  if (s === null || s === undefined) return 'NULL'
  return "'" + String(s).replace(/'/g, "''") + "'"
}

function sqlDate(d: Date | string | null | undefined): string {
  if (!d) return 'NULL'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return 'NULL'
  return `'${date.toISOString()}'`
}

function sqlDateOnly(d: Date | string | null | undefined): string {
  if (!d) return 'NULL'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return 'NULL'
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `'${yyyy}-${mm}-${dd}'`
}

async function main() {
  console.log('Fetching data from local SQLite...')

  // Fetch all data
  const bengkelList = await db.bengkel.findMany({ orderBy: { namaBengkel: 'asc' } })
  const negeriList = await db.negeri.findMany({ orderBy: { namaNegeri: 'asc' } })
  const daerahList = await db.daerah.findMany({ include: { negeri: true }, orderBy: { namaDaerah: 'asc' } })
  const profiles = await db.profile.findMany({ include: { bengkel: true }, orderBy: { createdAt: 'asc' } })
  const aktivitiList = await db.aktiviti.findMany({
    include: { bengkel: true, negeri: true, daerah: true, pencipta: true, penyemak: true, pengesah: true },
    orderBy: { createdAt: 'asc' },
  })
  const auditLogs = await db.auditLog.findMany({ include: { aktiviti: true, oleh: true }, orderBy: { diciptaPada: 'asc' } })
  const notifications = await db.notification.findMany({ orderBy: { createdAt: 'asc' } })

  console.log(`Found: ${bengkelList.length} bengkel, ${negeriList.length} negeri, ${daerahList.length} daerah`)
  console.log(`       ${profiles.length} profiles, ${aktivitiList.length} aktiviti, ${auditLogs.length} audit logs`)
  console.log(`       ${notifications.length} notifications`)

  // Build stable UUID maps
  const bengkelUuidMap = new Map<string, string>()
  bengkelList.forEach(b => bengkelUuidMap.set(b.id, uuidFromName('bengkel:' + b.namaBengkel)))

  const negeriUuidMap = new Map<string, string>()
  negeriList.forEach(n => negeriUuidMap.set(n.id, uuidFromName('negeri:' + n.namaNegeri)))

  const daerahUuidMap = new Map<string, string>()
  daerahList.forEach(d => daerahUuidMap.set(d.id, uuidFromName('daerah:' + d.namaDaerah + ':' + d.negeri?.namaNegeri)))

  // For profiles, use the actual email-based UUIDs (stable)
  const profileUuidMap = new Map<string, string>()
  profiles.forEach(p => profileUuidMap.set(p.id, uuidFromName('profile:' + p.email)))

  // For aktiviti, generate stable UUIDs based on id
  const aktivitiUuidMap = new Map<string, string>()
  aktivitiList.forEach(a => aktivitiUuidMap.set(a.id, uuidFromName('aktiviti:' + a.id)))

  // -----------------------------------------------------------------------
  // BUILD SQL
  // -----------------------------------------------------------------------
  const sql: string[] = []
  const section = (title: string) => sql.push(`\n-- =============================================================\n-- ${title}\n-- =============================================================\n`)

  sql.push(`-- =============================================================
-- SISTEM REKOD AKTIVITI PELAJAR ADTEC KT
-- Supabase PostgreSQL Migration Script
-- Generated from local SQLite database with full seed data
-- =============================================================
--
-- Project: https://bcmwnhvzwpgrljvsvjdq.supabase.co
-- Target: Supabase SQL Editor (run all at once)
--
-- This script is IDEMPOTENT — safe to re-run (uses DROP IF EXISTS / ON CONFLICT).
-- It will:
--   1. Create ENUM types
--   2. Create all tables with proper foreign keys
--   3. Enable Row Level Security (RLS) with role-based policies
--   4. Create Supabase Auth users (admin, pengajar, penyelaras, penolong_pengarah)
--   5. Link profiles to auth.users
--   6. Insert all reference data (bengkel, negeri, daerah)
--   7. Insert 51 aktiviti records across all 5 statuses
--   8. Insert audit_log entries and notifications
--
-- IMPORTANT: After running this, the system is ready. Dummy passwords
-- match the PRD section 14.1.
--`)

  // -----------------------------------------------------------------------
  // 0. CLEANUP (idempotent)
  // -----------------------------------------------------------------------
  section('0. CLEANUP — Drop existing objects (idempotent)')
  sql.push(`
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS aktiviti CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS daerah CASCADE;
DROP TABLE IF EXISTS negeri CASCADE;
DROP TABLE IF EXISTS bengkel CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS aktiviti_status CASCADE;
`)

  // -----------------------------------------------------------------------
  // 1. ENUM TYPES
  // -----------------------------------------------------------------------
  section('1. ENUM TYPES')
  sql.push(`
CREATE TYPE user_role AS ENUM
  ('pengajar','penyelaras','penolong_pengarah','admin');

CREATE TYPE aktiviti_status AS ENUM
  ('draf','menunggu_semakan','menunggu_pengesahan','disahkan','ditolak');
`)

  // -----------------------------------------------------------------------
  // 2. REFERENCE TABLES
  // -----------------------------------------------------------------------
  section('2. REFERENCE TABLES — bengkel, negeri, daerah')
  sql.push(`
CREATE TABLE bengkel (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_bengkel text NOT NULL UNIQUE,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE negeri (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_negeri text NOT NULL UNIQUE,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE daerah (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_daerah text NOT NULL,
  negeri_id   uuid NOT NULL REFERENCES negeri(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (nama_daerah, negeri_id)
);
`)

  // -----------------------------------------------------------------------
  // 3. PROFILES TABLE (linked to auth.users)
  // -----------------------------------------------------------------------
  section('3. PROFILES — linked to auth.users')
  sql.push(`
CREATE TABLE profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL UNIQUE,
  full_name     text NOT NULL,
  role          user_role NOT NULL,
  bengkel_id    uuid REFERENCES bengkel(id),
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_bengkel ON profiles(bengkel_id);
`)

  // -----------------------------------------------------------------------
  // 4. AKTIVITI TABLE (main transactional)
  // -----------------------------------------------------------------------
  section('4. AKTIVITI — main transactional table')
  sql.push(`
CREATE TABLE aktiviti (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarikh_pelaksanaan        date NOT NULL,
  nama_aktiviti             text NOT NULL,
  bengkel_id                uuid NOT NULL REFERENCES bengkel(id),
  negeri_id                 uuid NOT NULL REFERENCES negeri(id),
  daerah_id                 uuid NOT NULL REFERENCES daerah(id),
  nama_pengurus_aktiviti    text NOT NULL,
  status                    aktiviti_status NOT NULL DEFAULT 'draf',
  catatan_penolakan         text,
  dicipta_oleh              uuid NOT NULL REFERENCES profiles(id),
  disemak_oleh              uuid REFERENCES profiles(id),
  disahkan_oleh             uuid REFERENCES profiles(id),
  dihantar_semakan_pada     timestamptz,
  dihantar_pengesahan_pada  timestamptz,
  disahkan_pada             timestamptz,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

CREATE INDEX idx_aktiviti_status ON aktiviti(status);
CREATE INDEX idx_aktiviti_dicipta ON aktiviti(dicipta_oleh);
CREATE INDEX idx_aktiviti_tarikh ON aktiviti(tarikh_pelaksanaan);
CREATE INDEX idx_aktiviti_negeri ON aktiviti(negeri_id);
CREATE INDEX idx_aktiviti_daerah ON aktiviti(daerah_id);
CREATE INDEX idx_aktiviti_bengkel ON aktiviti(bengkel_id);
`)

  // -----------------------------------------------------------------------
  // 5. AUDIT LOG
  // -----------------------------------------------------------------------
  section('5. AUDIT LOG — append-only')
  sql.push(`
CREATE TABLE audit_log (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  aktiviti_id  uuid NOT NULL REFERENCES aktiviti(id) ON DELETE CASCADE,
  tindakan     text NOT NULL,
  oleh_id      uuid NOT NULL REFERENCES profiles(id),
  catatan      text,
  dicipta_pada timestamptz DEFAULT now()
);

CREATE INDEX idx_auditlog_aktiviti ON audit_log(aktiviti_id);
CREATE INDEX idx_auditlog_oleh ON audit_log(oleh_id);
`)

  // -----------------------------------------------------------------------
  // 6. NOTIFICATIONS
  // -----------------------------------------------------------------------
  section('6. NOTIFICATIONS — in-app')
  sql.push(`
CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       text NOT NULL,
  message     text NOT NULL,
  type        text NOT NULL DEFAULT 'system',
  read        boolean NOT NULL DEFAULT false,
  aktiviti_id uuid REFERENCES aktiviti(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_profile_unread ON notifications(profile_id, read);
`)

  // -----------------------------------------------------------------------
  // 7. REFERENCE DATA INSERTS
  // -----------------------------------------------------------------------
  section('7. SEED — bengkel')
  bengkelList.forEach(b => {
    sql.push(`INSERT INTO bengkel (id, nama_bengkel, created_at) VALUES (${sqlStr(bengkelUuidMap.get(b.id)!)}, ${sqlStr(b.namaBengkel)}, ${sqlDate(b.createdAt)});`)
  })

  section('8. SEED — negeri (16 Malaysian states)')
  negeriList.forEach(n => {
    sql.push(`INSERT INTO negeri (id, nama_negeri, created_at) VALUES (${sqlStr(negeriUuidMap.get(n.id)!)}, ${sqlStr(n.namaNegeri)}, ${sqlDate(n.createdAt)});`)
  })

  section('9. SEED — daerah')
  daerahList.forEach(d => {
    sql.push(`INSERT INTO daerah (id, nama_daerah, negeri_id, created_at) VALUES (${sqlStr(daerahUuidMap.get(d.id)!)}, ${sqlStr(d.namaDaerah)}, ${sqlStr(negeriUuidMap.get(d.negeriId)!)}, ${sqlDate(d.createdAt)});`)
  })

  // -----------------------------------------------------------------------
  // 10. CREATE SUPABASE AUTH USERS + PROFILES
  // -----------------------------------------------------------------------
  section('10. SEED — Supabase Auth users + profiles')
  sql.push(`
-- Create auth.users entries using the admin API-compatible function
-- NOTE: This uses auth.users directly. Passwords are hashed by Supabase.
-- Dummy passwords (PRD §14.1):
--   admin@adtec-kt.edu.my           / Admin@2026
--   ahmad.fauzi@adtec-kt.edu.my     / Pengajar@123
--   siti.aisyah@adtec-kt.edu.my     / Pengajar@123
--   rizal.hakim@adtec-kt.edu.my     / Pengajar@123
--   noraini.yusof@adtec-kt.edu.my   / Penyelaras@123
--   zulkifli.omar@adtec-kt.edu.my   / Penyelaras@123
--   rosli.ibrahim@adtec-kt.edu.my   / PPengarah@123

-- We need to insert into auth.users with encrypted_password.
-- This requires the supabase_admin role which is available in SQL Editor.
`)

  // Password hashes (we'll use Supabase's built-in bcrypt via crypt() function)
  // Actually, the simplest way is to use the auth.users table with encrypted_password
  // The password will be auto-hashed by Supabase Auth trigger

  profiles.forEach(p => {
    const profileId = profileUuidMap.get(p.id)!
    const bengkelId = p.bengkelId ? sqlStr(bengkelUuidMap.get(p.bengkelId)!) : 'NULL'
    let dummyPassword = 'Admin@2026'
    if (p.role === 'pengajar') dummyPassword = 'Pengajar@123'
    else if (p.role === 'penyelaras') dummyPassword = 'Penyelaras@123'
    else if (p.role === 'penolong_pengarah') dummyPassword = 'PPengarah@123'

    sql.push(`
-- Auth user: ${p.email}
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  ${sqlStr(profileId)},
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  ${sqlStr(p.email)},
  crypt(${sqlStr(dummyPassword)}, gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  ${sqlDate(p.createdAt)},
  now(),
  NULL,
  '', '', '', ''
) ON CONFLICT (email) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  updated_at = now();

-- Profile entry
INSERT INTO profiles (id, email, full_name, role, bengkel_id, active, created_at, updated_at)
VALUES (
  ${sqlStr(profileId)},
  ${sqlStr(p.email)},
  ${sqlStr(p.fullName)},
  ${sqlStr(p.role)},
  ${bengkelId},
  ${p.active ? 'true' : 'false'},
  ${sqlDate(p.createdAt)},
  now()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  bengkel_id = EXCLUDED.bengkel_id,
  active = EXCLUDED.active,
  updated_at = now();`)
  })

  // -----------------------------------------------------------------------
  // 11. AKTIVITI INSERTS
  // -----------------------------------------------------------------------
  section('11. SEED — aktiviti (51 records across all statuses)')
  aktivitiList.forEach(a => {
    sql.push(
      `INSERT INTO aktiviti (id, tarikh_pelaksanaan, nama_aktiviti, bengkel_id, negeri_id, daerah_id, nama_pengurus_aktiviti, status, catatan_penolakan, dicipta_oleh, disemak_oleh, disahkan_oleh, dihantar_semakan_pada, dihantar_pengesahan_pada, disahkan_pada, created_at, updated_at) VALUES (${sqlStr(aktivitiUuidMap.get(a.id)!)}, ${sqlDateOnly(a.tarikhPelaksanaan)}, ${sqlStr(a.namaAktiviti)}, ${sqlStr(bengkelUuidMap.get(a.bengkelId)!)}, ${sqlStr(negeriUuidMap.get(a.negeriId)!)}, ${sqlStr(daerahUuidMap.get(a.daerahId)!)}, ${sqlStr(a.namaPengurusAktiviti)}, ${sqlStr(a.status)}, ${sqlStr(a.catatanPenolakan)}, ${sqlStr(profileUuidMap.get(a.diciptaOleh)!)}, ${a.disemakOleh ? sqlStr(profileUuidMap.get(a.disemakOleh)!) : 'NULL'}, ${a.disahkanOleh ? sqlStr(profileUuidMap.get(a.disahkanOleh)!) : 'NULL'}, ${sqlDate(a.dihantarSemakanPada)}, ${sqlDate(a.dihantarPengesahanPada)}, ${sqlDate(a.disahkanPada)}, ${sqlDate(a.createdAt)}, ${sqlDate(a.updatedAt)});`
    )
  })

  // -----------------------------------------------------------------------
  // 12. AUDIT LOG INSERTS
  // -----------------------------------------------------------------------
  section('12. SEED — audit_log (' + auditLogs.length + ' entries)')
  auditLogs.forEach(al => {
    sql.push(
      `INSERT INTO audit_log (aktiviti_id, tindakan, oleh_id, catatan, dicipta_pada) VALUES (${sqlStr(aktivitiUuidMap.get(al.aktivitiId)!)}, ${sqlStr(al.tindakan)}, ${sqlStr(profileUuidMap.get(al.olehId)!)}, ${sqlStr(al.catatan)}, ${sqlDate(al.diciptaPada)});`
    )
  })

  // -----------------------------------------------------------------------
  // 13. NOTIFICATIONS INSERTS
  // -----------------------------------------------------------------------
  section('13. SEED — notifications')
  notifications.forEach(n => {
    sql.push(
      `INSERT INTO notifications (id, profile_id, title, message, type, read, aktiviti_id, created_at) VALUES (${sqlStr(uuidFromName('notif:' + n.id))}, ${sqlStr(profileUuidMap.get(n.profileId)!)}, ${sqlStr(n.title)}, ${sqlStr(n.message)}, ${sqlStr(n.type)}, ${n.read ? 'true' : 'false'}, ${n.aktivitiId ? sqlStr(aktivitiUuidMap.get(n.aktivitiId)!) : 'NULL'}, ${sqlDate(n.createdAt)});`
    )
  })

  // -----------------------------------------------------------------------
  // 14. ENABLE RLS
  // -----------------------------------------------------------------------
  section('14. ENABLE ROW LEVEL SECURITY (RLS)')
  sql.push(`
ALTER TABLE bengkel ENABLE ROW LEVEL SECURITY;
ALTER TABLE negeri ENABLE ROW LEVEL SECURITY;
ALTER TABLE daerah ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE aktiviti ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
`)

  // -----------------------------------------------------------------------
  // 15. RLS POLICIES
  // -----------------------------------------------------------------------
  section('15. RLS POLICIES — role-based access control')
  sql.push(`
-- Helper function: get current user role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ========== BENGKEL (reference, readable by all authenticated) ==========
CREATE POLICY "bengkel_select_authenticated"
  ON bengkel FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "bengkel_modify_admin"
  ON bengkel FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ========== NEGERI (reference, readable by all authenticated) ==========
CREATE POLICY "negeri_select_authenticated"
  ON negeri FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "negeri_modify_admin"
  ON negeri FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ========== DAERAH (reference, readable by all authenticated) ==========
CREATE POLICY "daerah_select_authenticated"
  ON daerah FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "daerah_modify_admin"
  ON daerah FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ========== PROFILES ==========
-- Each user can see their own profile
-- Penyelaras/PP/Admin can see all profiles (for assignments)
CREATE POLICY "profiles_select_self_or_staff"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.current_user_role() IN ('penyelaras','penolong_pengarah','admin')
  );

-- Users can update their own profile (limited fields — handled by app)
CREATE POLICY "profiles_update_self"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Only admin can insert/delete profiles
CREATE POLICY "profiles_insert_admin"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "profiles_delete_admin"
  ON profiles FOR DELETE
  TO authenticated
  USING (public.current_user_role() = 'admin');

-- ========== AKTIVITI ==========
-- SELECT: Pengajar sees own; Penyelaras sees menunggu_semakan + disahkan;
--         PP sees menunggu_pengesahan + disahkan; Admin sees all
CREATE POLICY "aktiviti_select_role_based"
  ON aktiviti FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
    OR dicipta_oleh = auth.uid()
    OR (
      public.current_user_role() = 'penyelaras'
      AND status IN ('menunggu_semakan','menunggu_pengesahan','disahkan','ditolak')
    )
    OR (
      public.current_user_role() = 'penolong_pengarah'
      AND status IN ('menunggu_pengesahan','disahkan')
    )
  );

-- INSERT: Pengajar creates own drafts; Admin can create any
CREATE POLICY "aktiviti_insert_pengajar_or_admin"
  ON aktiviti FOR INSERT
  TO authenticated
  WITH CHECK (
    dicipta_oleh = auth.uid()
    AND status = 'draf'
    AND public.current_user_role() IN ('pengajar','admin')
  );

-- UPDATE: depends on role + status
-- Pengajar: only own drafts
-- Penyelaras: only menunggu_semakan
-- PP: only menunggu_pengesahan
-- Admin: all
CREATE POLICY "aktiviti_update_role_based"
  ON aktiviti FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
    OR (dicipta_oleh = auth.uid() AND status = 'draf')
    OR (public.current_user_role() = 'penyelaras' AND status = 'menunggu_semakan')
    OR (public.current_user_role() = 'penolong_pengarah' AND status = 'menunggu_pengesahan')
  )
  WITH CHECK (
    public.current_user_role() = 'admin'
    OR (dicipta_oleh = auth.uid() AND status IN ('draf','menunggu_semakan'))
    OR (public.current_user_role() = 'penyelaras' AND status IN ('menunggu_semakan','menunggu_pengesahan','draf'))
    OR (public.current_user_role() = 'penolong_pengarah' AND status IN ('menunggu_pengesahan','disahkan','draf'))
  );

-- DELETE: only own drafts (Pengajar) or admin
CREATE POLICY "aktiviti_delete_role_based"
  ON aktiviti FOR DELETE
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
    OR (dicipta_oleh = auth.uid() AND status = 'draf')
  );

-- ========== AUDIT LOG ==========
-- All authenticated can read (for transparency); only system/app can insert
CREATE POLICY "auditlog_select_authenticated"
  ON audit_log FOR SELECT
  TO authenticated
  USING (true);

-- INSERT allowed for all authenticated (the app writes audit logs)
CREATE POLICY "auditlog_insert_authenticated"
  ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No UPDATE or DELETE (append-only) — by omitting policies

-- ========== NOTIFICATIONS ==========
-- Users see only their own notifications
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "notifications_insert_authenticated"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "notifications_delete_own"
  ON notifications FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());
`)

  // -----------------------------------------------------------------------
  // 16. TRIGGERS for updated_at
  // -----------------------------------------------------------------------
  section('16. TRIGGERS — auto-update updated_at')
  sql.push(`
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_aktiviti_updated_at
  BEFORE UPDATE ON aktiviti
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
`)

  // -----------------------------------------------------------------------
  // 17. VERIFICATION
  // -----------------------------------------------------------------------
  section('17. VERIFICATION — counts')
  sql.push(`
SELECT 'bengkel' AS table_name, count(*) AS count FROM bengkel
UNION ALL SELECT 'negeri', count(*) FROM negeri
UNION ALL SELECT 'daerah', count(*) FROM daerah
UNION ALL SELECT 'profiles', count(*) FROM profiles
UNION ALL SELECT 'aktiviti', count(*) FROM aktiviti
UNION ALL SELECT 'audit_log', count(*) FROM audit_log
UNION ALL SELECT 'notifications', count(*) FROM notifications
UNION ALL SELECT 'auth_users', count(*) FROM auth.users;
`)

  // -----------------------------------------------------------------------
  // Write to file
  // -----------------------------------------------------------------------
  const outPath = '/home/z/my-project/download/supabase_setup.sql'
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, sql.join('\n'))
  console.log(`\nSQL migration written to: ${outPath}`)
  console.log(`Total size: ${Math.round(fs.statSync(outPath).size / 1024)} KB`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => process.exit(0))
