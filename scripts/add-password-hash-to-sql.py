"""
Update profile INSERT statements to include password_hash column.
Uses simpler line-by-line parsing for reliability.
"""
import re

sql_path = '/home/z/my-project/download/supabase_setup.sql'
hashes_path = '/home/z/my-project/download/password_hashes.sql'

with open(sql_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
with open(hashes_path, 'r', encoding='utf-8') as f:
    hashes_content = f.read()

# Map of email → scrypt hash
email_to_hash = {}
for line in hashes_content.split('\n'):
    m = re.match(r"UPDATE profiles SET password_hash = '([^']+)' WHERE email = '([^']+)';", line)
    if m:
        email_to_hash[m.group(2)] = m.group(1)

print(f'Loaded {len(email_to_hash)} password hashes')

# Walk through lines; when we find "INSERT INTO profiles (id, email, ...", 
# modify the column list AND insert the hash value after the role line.
new_lines = []
i = 0
modified_count = 0
while i < len(lines):
    line = lines[i]
    
    # Check if this is the profile INSERT header
    if 'INSERT INTO profiles (id, email, full_name, role, bengkel_id, active, created_at, updated_at)' in line:
        # Replace column list
        new_line = line.replace(
            'INSERT INTO profiles (id, email, full_name, role, bengkel_id, active, created_at, updated_at)',
            'INSERT INTO profiles (id, email, full_name, role, password_hash, bengkel_id, active, created_at, updated_at)'
        )
        new_lines.append(new_line)
        i += 1
        
        # Now we expect VALUES ( on next line, then the values
        # Skip "VALUES (" line
        if i < len(lines) and 'VALUES (' in lines[i]:
            new_lines.append(lines[i])
            i += 1
        
        # Now we should see: id, email, full_name, role, bengkel_id, active, ...
        # We need to find the role line and insert password_hash after it
        # Role values: 'admin', 'pengajar', 'penyelaras', 'penolong_pengarah'
        # They appear as a line containing just "'role',\n"
        current_email = None
        while i < len(lines):
            cur = lines[i]
            # Detect email line: '  email@domain',
            email_match = re.match(r"^\s*'([^']+@[^']+)',\s*$", cur)
            if email_match:
                current_email = email_match.group(1)
            
            new_lines.append(cur)
            i += 1
            
            # Check if this line is the role line
            # Role values: 'admin', 'pengajar', 'penyelaras', 'penolong_pengarah'
            role_match = re.match(r"^\s*'(admin|pengajar|penyelaras|penolong_pengarah)',\s*$", cur)
            if role_match and current_email and current_email in email_to_hash:
                # Insert the password_hash line right after the role line
                hash_value = email_to_hash[current_email]
                # Match indentation of the role line
                indent_match = re.match(r'^(\s*)', cur)
                indent = indent_match.group(1) if indent_match else '  '
                new_lines.append(f"{indent}'{hash_value}',\n")
                modified_count += 1
                break
        
        continue
    
    new_lines.append(line)
    i += 1

print(f'Modified {modified_count} profile INSERTs')

with open(sql_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f'Written to {sql_path}')
print(f'File size: {sum(len(l) for l in new_lines)} chars')
