"""
Fix the Supabase SQL script to:
1. Add cleanup of auth.users (DELETE WHERE email IN our list)
2. Replace ON CONFLICT (email) with simple INSERT (safe because we DELETE first)
3. Replace ON CONFLICT (id) on profiles with simple INSERT (safe because we DROP CASCADE)
"""
import re

src = '/home/z/my-project/download/supabase_setup.sql'
with open(src, 'r', encoding='utf-8') as f:
    sql = f.read()

# 1. Replace all `ON CONFLICT (email) DO UPDATE SET ... ;` patterns
#    Pattern: `) ON CONFLICT (email) DO UPDATE SET\n  encrypted_password = EXCLUDED.encrypted_password,\n  updated_at = now();`
sql = re.sub(
    r'\) ON CONFLICT \(email\) DO UPDATE SET\s*\n\s*encrypted_password = EXCLUDED\.encrypted_password,\s*\n\s*updated_at = now\(\);',
    ');',
    sql
)

# 2. Replace `ON CONFLICT (id) DO UPDATE SET ... ;` for profiles
sql = re.sub(
    r'\) ON CONFLICT \(id\) DO UPDATE SET\s*\n\s*email = EXCLUDED\.email,\s*\n\s*full_name = EXCLUDED\.full_name,\s*\n\s*role = EXCLUDED\.role,\s*\n\s*bengkel_id = EXCLUDED\.bengkel_id,\s*\n\s*active = EXCLUDED\.active,\s*\n\s*updated_at = now\(\);',
    ');',
    sql
)

# 3. Add cleanup of auth.users BEFORE creating new auth users
# Find the section header "10. SEED — Supabase Auth users + profiles"
cleanup_auth = '''
-- Clean up any existing auth.users with our dummy emails (idempotent)
DELETE FROM auth.users WHERE email IN (
  'admin@adtec-kt.edu.my',
  'ahmad.fauzi@adtec-kt.edu.my',
  'siti.aisyah@adtec-kt.edu.my',
  'rizal.hakim@adtec-kt.edu.my',
  'noraini.yusof@adtec-kt.edu.my',
  'zulkifli.omar@adtec-kt.edu.my',
  'rosli.ibrahim@adtec-kt.edu.my'
);
'''

# Insert this cleanup right after the section 10 header
# Find the comment block for section 10
section_10_marker = "-- 10. SEED — Supabase Auth users + profiles"
section_10_end = sql.find(section_10_marker) + len(section_10_marker)
# Find end of the comment line (next newline)
next_newline = sql.find('\n', section_10_end)
# Insert after the next newline
insert_pos = next_newline + 1
sql = sql[:insert_pos] + cleanup_auth + sql[insert_pos:]

# Write back
with open(src, 'w', encoding='utf-8') as f:
    f.write(sql)

# Verify no more ON CONFLICT (email) or ON CONFLICT (id)
remaining_email = sql.count('ON CONFLICT (email)')
remaining_id = sql.count('ON CONFLICT (id)')
print(f'Remaining ON CONFLICT (email): {remaining_email}')
print(f'Remaining ON CONFLICT (id): {remaining_id}')
print(f'Auth users cleanup added: {"DELETE FROM auth.users" in sql}')
print(f'File size: {len(sql)} chars')
