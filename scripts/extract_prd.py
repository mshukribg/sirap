#!/usr/bin/env python3
"""Extract PRD text using pdfplumber directly."""
import pdfplumber

output = []
with pdfplumber.open("/home/z/my-project/upload/PRD_Sistem_Rekod_Aktiviti_ADTEC_KT-latest.pdf") as pdf:
    for i, page in enumerate(pdf.pages, 1):
        output.append(f"\n========== PAGE {i} ==========\n")
        text = page.extract_text() or ""
        output.append(text)

content = "".join(output)
with open("/home/z/my-project/upload/PRD_extracted.txt", "w", encoding="utf-8") as f:
    f.write(content)

print(f"Saved {len(content)} chars to PRD_extracted.txt")
