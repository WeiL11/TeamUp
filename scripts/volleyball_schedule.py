#!/usr/bin/env python3
"""
Nashville Metro Parks Volleyball Schedule Scraper
Scrapes each community center's schedule PDF and extracts volleyball info.
"""

import os
import re
import requests
import pdfplumber
from bs4 import BeautifulSoup
from datetime import datetime

CENTERS = [
    # Regional
    {"name": "Bellevue",     "type": "Regional",     "slug": "bellevue-community-center"},
    {"name": "Coleman",      "type": "Regional",     "slug": "coleman-community-center"},
    {"name": "East Park",    "type": "Regional",     "slug": "east-park-community-center"},
    {"name": "Hadley",       "type": "Regional",     "slug": "hadley-park-community-center"},
    {"name": "Hartman",      "type": "Regional",     "slug": "hartman-community-center"},
    {"name": "Madison",      "type": "Regional",     "slug": "madison-community-center"},
    {"name": "McCabe",       "type": "Regional",     "slug": "mccabe-community-center"},
    {"name": "Old Hickory",  "type": "Regional",     "slug": "old-hickory-community-center"},
    {"name": "Sevier",       "type": "Regional",     "slug": "sevier-park-community-center"},
    {"name": "Smith Springs","type": "Regional",     "slug": "smith-springs-community-center"},
    {"name": "Southeast",    "type": "Regional",     "slug": "southeast-community-center"},
    # Neighborhood
    {"name": "Antioch",      "type": "Neighborhood", "slug": "antioch-community-center"},
    {"name": "Cleveland",    "type": "Neighborhood", "slug": "cleveland-park-community-center"},
    {"name": "Easley",       "type": "Neighborhood", "slug": "easley-community-center"},
    {"name": "Elizabeth",    "type": "Neighborhood", "slug": "elizabeth-community-center"},
    {"name": "Hermitage",    "type": "Neighborhood", "slug": "hermitage-community-center"},
    {"name": "Kirkpatrick",  "type": "Neighborhood", "slug": "kirkpatrick-community-center"},
    {"name": "Looby",        "type": "Neighborhood", "slug": "looby-community-center"},
    {"name": "McFerrin",     "type": "Neighborhood", "slug": "mcferrin-community-center"},
    {"name": "Morgan",       "type": "Neighborhood", "slug": "morgan-park-community-center"},
    {"name": "Napier",       "type": "Neighborhood", "slug": "napier-community-center"},
    {"name": "Paradise Ridge","type": "Neighborhood","slug": "paradise-ridge-community-center"},
    {"name": "Parkwood",     "type": "Neighborhood", "slug": "parkwood-community-center"},
    {"name": "Shelby",       "type": "Neighborhood", "slug": "shelby-park-community-center"},
]

BASE_URL = "https://www.nashville.gov/departments/parks/community-centers"

DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
DAY_ALIASES = {
    "mon": "Monday", "tue": "Tuesday", "tues": "Tuesday",
    "wed": "Wednesday", "thu": "Thursday", "thur": "Thursday", "thurs": "Thursday",
    "fri": "Friday", "sat": "Saturday", "sun": "Sunday",
}

TIME_PATTERN = re.compile(
    r'\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)'
    r'(?:\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))?'
)


def find_pdf_url(slug):
    page_url = f"{BASE_URL}/{slug}"
    try:
        resp = requests.get(page_url, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        return None, f"Page error: {e}"

    soup = BeautifulSoup(resp.text, 'html.parser')
    for link in soup.find_all('a', href=True):
        href = link['href']
        text = link.get_text(strip=True).lower()
        if '.pdf' in href.lower():
            if any(kw in href.lower() or kw in text for kw in ['schedule', 'activity', 'program']):
                if href.startswith('/'):
                    href = 'https://www.nashville.gov' + href
                return href, None

    return None, "No schedule PDF on page"


def download_pdf(url, path):
    try:
        resp = requests.get(url, timeout=60)
        resp.raise_for_status()
        with open(path, 'wb') as f:
            f.write(resp.content)
        return True, None
    except Exception as e:
        return False, str(e)


def normalize_day(word):
    w = word.lower().rstrip('.,;:')
    if w in [d.lower() for d in DAY_ORDER]:
        return w.capitalize()
    return DAY_ALIASES.get(w)


def extract_volleyball(pdf_path):
    hits = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                # Try table rows first
                for table in page.extract_tables():
                    for row in table:
                        row_text = ' | '.join(str(c) for c in row if c)
                        if 'volleyball' in row_text.lower():
                            hits.append(row_text.strip())

                # Also scan plain text lines
                text = page.extract_text() or ''
                lines = text.split('\n')
                for i, line in enumerate(lines):
                    if 'volleyball' in line.lower():
                        ctx = ' '.join(
                            l.strip() for l in lines[max(0, i-1):i+2] if l.strip()
                        )
                        hits.append(ctx)
    except Exception as e:
        return [], str(e)

    return list(dict.fromkeys(hits)), None  # deduplicate, preserve order


def parse_schedule(text):
    days, times = [], []
    for word in re.split(r'[\s,|/]+', text):
        day = normalize_day(word)
        if day and day not in days:
            days.append(day)
    times = TIME_PATTERN.findall(text)
    return days, times


def generate_markdown(results):
    now = datetime.now().strftime('%Y-%m-%d')
    lines = [
        "# Nashville Metro Parks — Indoor Volleyball Schedule",
        "",
        f"_Last updated: {now}_",
        "",
        "## Weekly Schedule",
        "",
    ]

    # Collect all confirmed entries with day/time
    schedule = {d: [] for d in DAY_ORDER}
    has_any = False

    for r in results:
        if r['status'] != '有':
            continue
        for v in r['volleyball']:
            for day in v['days']:
                times_str = ', '.join(v['times']) if v['times'] else 'Call center for time'
                schedule[day].append(f"{r['name']} — {times_str}")
                has_any = True

    if has_any:
        lines += ["| Day | Venue — Time |", "|-----|--------------|"]
        for day in DAY_ORDER:
            for entry in schedule[day]:
                lines.append(f"| {day} | {entry} |")
    else:
        lines.append("_No volleyball entries found this month._")

    lines += ["", "## Status by Center", ""]
    lines += ["| Center | Type | Status | Volleyball Lines Found |",
              "|--------|------|--------|------------------------|"]

    for r in results:
        emoji = {"有": "✅", "沒有": "❌", "沒讀": "⚠️"}.get(r['status'], "?")
        if r['status'] == '有':
            note = ' / '.join(v['text'][:60] for v in r['volleyball'])
        else:
            note = r.get('reason', '')
        lines.append(f"| {r['name']} | {r['type']} | {emoji} {r['status']} | {note} |")

    with open('volleyball-schedule.md', 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')

    print("Written: volleyball-schedule.md")


def main():
    print(f"Nashville Volleyball Schedule — {datetime.now().strftime('%Y-%m-%d')}\n")
    results = []

    for center in CENTERS:
        name, slug, ctype = center['name'], center['slug'], center['type']
        print(f"[{name}]")

        pdf_url, err = find_pdf_url(slug)
        if not pdf_url:
            print(f"  ✗ {err}")
            results.append({"name": name, "type": ctype, "status": "沒讀", "reason": err, "volleyball": []})
            continue
        print(f"  PDF: {pdf_url}")

        pdf_path = f"/tmp/{slug}.pdf"
        ok, err = download_pdf(pdf_url, pdf_path)
        if not ok:
            print(f"  ✗ Download failed: {err}")
            results.append({"name": name, "type": ctype, "status": "沒讀", "reason": f"Download: {err}", "volleyball": []})
            continue

        hits, err = extract_volleyball(pdf_path)
        try:
            os.remove(pdf_path)
        except OSError:
            pass

        if err:
            print(f"  ✗ Parse error: {err}")
            results.append({"name": name, "type": ctype, "status": "沒讀", "reason": err, "volleyball": []})
        elif hits:
            parsed = []
            for h in hits:
                days, times = parse_schedule(h)
                parsed.append({"text": h, "days": days, "times": times})
                print(f"  ✓ {h[:80]}")
            results.append({"name": name, "type": ctype, "status": "有", "volleyball": parsed})
        else:
            print(f"  — No volleyball")
            results.append({"name": name, "type": ctype, "status": "沒有", "reason": "", "volleyball": []})

    generate_markdown(results)


if __name__ == '__main__':
    main()
