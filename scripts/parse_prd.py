#!/usr/bin/env python3
"""Parse the JSON output of pdf.py extract.text into clean readable text."""
import json
import sys

with open('/home/z/my-project/tool-results/bash_1784024569618_1c667112e10f.txt', 'r') as f:
    data = json.load(f)

output_lines = []
for page in data['data']['pages']:
    output_lines.append(f"\n\n========== PAGE {page['page']} ==========\n")
    output_lines.append(page['text'])

with open('/home/z/my-project/scripts/prd_content.txt', 'w') as f:
    f.write(''.join(output_lines))

print(f"Extracted {data['data']['total_pages']} pages to prd_content.txt")
print(f"Total chars: {data['data']['total_chars']}")
