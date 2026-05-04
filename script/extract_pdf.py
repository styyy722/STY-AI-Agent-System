#!/usr/bin/env python3
"""
Extract text content from .pdf files for the STY Agent.
Uses pdfplumber for accurate text + table extraction.
Usage: python3 extract_pdf.py <filepath> [max_pages]
"""

import sys
import pdfplumber

MAX_PAGES = int(sys.argv[2]) if len(sys.argv) > 2 else 30

def extract(filepath):
    output = []

    with pdfplumber.open(filepath) as pdf:
        total_pages = len(pdf.pages)
        pages_to_read = min(total_pages, MAX_PAGES)

        output.append(f"PDF: {filepath}")
        output.append(f"Pages: {total_pages} total, reading first {pages_to_read}")
        output.append("")

        for i, page in enumerate(pdf.pages[:pages_to_read]):
            output.append(f"## Page {i + 1}")

            # Extract tables first (common in financial docs)
            tables = page.extract_tables()
            if tables:
                for t_idx, table in enumerate(tables):
                    output.append(f"[Table {t_idx + 1}]")
                    for row in table:
                        cells = [str(cell).strip() if cell else "" for cell in row]
                        output.append("\t".join(cells))
                    output.append("")

            # Extract remaining text
            text = page.extract_text()
            if text and text.strip():
                output.append(text.strip())

            output.append("")  # blank line between pages

        if total_pages > MAX_PAGES:
            output.append(f"[Truncated: showing first {MAX_PAGES} of {total_pages} pages]")

    return "\n".join(output)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: extract_pdf.py <filepath>", file=sys.stderr)
        sys.exit(1)
    try:
        print(extract(sys.argv[1]))
    except Exception as e:
        print(f"Error reading PDF file: {e}", file=sys.stderr)
        sys.exit(1)
