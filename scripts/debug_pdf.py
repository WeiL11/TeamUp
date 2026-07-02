#!/usr/bin/env python3
"""
Debug script: show what pdfplumber actually extracts from a PDF.
Usage: python scripts/debug_pdf.py /path/to/schedule.pdf
"""
import sys
import re
import pdfplumber

TIME_PATTERN = re.compile(
    r'\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)'
    r'(?:\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))?'
)

def main():
    if len(sys.argv) < 2:
        print("Usage: python debug_pdf.py <path-to-pdf>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    print(f"Reading: {pdf_path}\n")

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            print(f"{'='*60}")
            print(f"PAGE {page_num}")
            print(f"{'='*60}")

            # --- Table extraction ---
            tables = page.extract_tables()
            print(f"\n[Tables found: {len(tables)}]")
            for t_idx, table in enumerate(tables):
                print(f"\n  Table {t_idx+1} ({len(table)} rows x {len(table[0]) if table else 0} cols):")
                for r_idx, row in enumerate(table):
                    for c_idx, cell in enumerate(row):
                        if cell and cell.strip():
                            print(f"    [{r_idx}][{c_idx}] = {repr(cell.strip()[:60])}")
                            if "volleyball" in str(cell).lower():
                                print(f"         ^^^ VOLLEYBALL FOUND HERE")
                                if r_idx > 0 and c_idx < len(table[r_idx-1]):
                                    above = table[r_idx-1][c_idx]
                                    print(f"         CELL ABOVE [{r_idx-1}][{c_idx}] = {repr(str(above)[:60])}")
                                    times = TIME_PATTERN.findall(str(above or ""))
                                    print(f"         Times in cell above: {times}")
                                header = table[0][c_idx] if c_idx < len(table[0]) else None
                                print(f"         COL HEADER [0][{c_idx}] = {repr(str(header)[:60])}")

            # --- Plain text extraction ---
            text = page.extract_text() or ""
            lines = text.split("\n")
            vball_lines = [(i, l) for i, l in enumerate(lines) if "volleyball" in l.lower()]
            if vball_lines:
                print(f"\n[Plain text - volleyball lines]")
                for i, line in vball_lines:
                    print(f"  Line {i}: {repr(line[:100])}")
                    if i > 0:
                        print(f"  Line above: {repr(lines[i-1][:100])}")

            # --- Word coordinates (first 5 words near "volleyball") ---
            words = page.extract_words()
            vball_words = [w for w in words if "volleyball" in w["text"].lower()]
            if vball_words:
                print(f"\n[Word coordinates - volleyball words]")
                for vw in vball_words:
                    print(f"  '{vw['text']}' at x0={vw['x0']:.1f} top={vw['top']:.1f} x1={vw['x1']:.1f} bottom={vw['bottom']:.1f}")
                    vx = (vw['x0'] + vw['x1']) / 2
                    vy = vw['top']
                    # Words just above (same column, smaller top)
                    nearby_above = [
                        w for w in words
                        if w['top'] < vy
                        and abs((w['x0'] + w['x1']) / 2 - vx) < 60
                        and vy - w['bottom'] < 30  # within 30px above
                    ]
                    for w in nearby_above:
                        print(f"    ABOVE: '{w['text']}' top={w['top']:.1f}")

if __name__ == "__main__":
    main()
