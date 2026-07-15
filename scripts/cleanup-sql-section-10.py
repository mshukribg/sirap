"""
Clean up section 10 of the Supabase SQL:
- Remove all INSERT INTO auth.users statements
- Keep only INSERT INTO profiles (which now includes password_hash)
- Keep the DELETE FROM auth.users cleanup (safe to keep even if no inserts)
- Add DELETE FROM profiles cleanup for idempotency
"""
import re

sql_path = '/home/z/my-project/download/supabase_setup.sql'
with open(sql_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find section 10 start (the header) and section 11 start
section_10_start = content.find('-- 10. SEED — Supabase Auth users + profiles')
section_11_start = content.find('-- 11. SEED — aktiviti')

if section_10_start == -1 or section_11_start == -1:
    print('ERROR: Could not find section boundaries')
    exit(1)

# Find the section 10 header line (the line with the ===)
# Look backwards from section_10_start to find the === line
header_start = content.rfind('-- =============================================================', 0, section_10_start)

# Find the section 11 header line
section_11_header_start = content.rfind('-- =============================================================', 0, section_11_start)

print(f'Section 10 spans: {header_start} to {section_11_header_start}')
print(f'Section 10 length: {section_11_header_start - header_start} chars')

section_10 = content[header_start:section_11_header_start]

# Extract the profile INSERTs from section 10
# Each profile INSERT looks like:
# -- Profile entry
# INSERT INTO profiles (id, email, full_name, role, password_hash, bengkel_id, active, created_at, updated_at)
# VALUES (
#   '...',
#   ...
#   now()
# );
profile_inserts = re.findall(
    r"-- Profile entry\nINSERT INTO profiles \(.*?\);",
    section_10,
    re.DOTALL
)
print(f'Found {len(profile_inserts)} profile INSERTs')

# Build the new section 10
new_section_10 = '''-- =============================================================
-- 10. SEED — Profiles (with scrypt password hashes)
-- =============================================================

-- Clean up existing profiles (idempotent — safe to re-run)
DELETE FROM profiles WHERE email IN (
  'admin@adtec-kt.edu.my',
  'ahmad.fauzi@adtec-kt.edu.my',
  'siti.aisyah@adtec-kt.edu.my',
  'rizal.hakim@adtec-kt.edu.my',
  'noraini.yusof@adtec-kt.edu.my',
  'zulkifli.omar@adtec-kt.edu.my',
  'rosli.ibrahim@adtec-kt.edu.my'
);

-- Dummy passwords (PRD §14.1) — these are scrypt-hashed and stored in
-- the password_hash column. The login API uses these hashes to verify.
--   admin@adtec-kt.edu.my           / Admin@2026
--   ahmad.fauzi@adtec-kt.edu.my     / Pengajar@123
--   siti.aisyah@adtec-kt.edu.my     / Pengajar@123
--   rizal.hakim@adtec-kt.edu.my     / Pengajar@123
--   noraini.yusof@adtec-kt.edu.my   / Penyelaras@123
--   zulkifli.omar@adtec-kt.edu.my   / Penyelaras@123
--   rosli.ibrahim@adtec-kt.edu.my   / PPengarah@123

'''

for p in profile_inserts:
    new_section_10 += p + '\n\n'

# Replace section 10 in the content
new_content = content[:header_start] + new_section_10 + content[section_11_header_start:]

with open(sql_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f'\nNew section 10 length: {len(new_section_10)} chars')
print(f'New file size: {len(new_content)} chars')
print('Removed all INSERT INTO auth.users statements')
print('Kept only INSERT INTO profiles (with password_hash)')
