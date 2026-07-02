#!/usr/bin/env python3
"""
Nashville Metro Parks Volleyball Schedule Scraper
Fetches all community center PDFs from the aggregated page and extracts volleyball info.
"""

import os
import re
import subprocess
import pdfplumber
from datetime import datetime
from html.parser import HTMLParser
from urllib.parse import urljoin

PAGE_URL = "https://www.nashville.gov/departments/parks/community-centers-and-recreation"
BASE_URL = "https://www.nashville.gov"
CURL_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36"

# Map keywords in PDF filename → center name
CENTER_MAP = [
    ("bellevue",    "Bellevue",      "Regional"),
    ("coleman",     "Coleman",       "Regional"),
    ("eastsummer",  "East Park",     "Regional"),
    ("east",        "East Park",     "Regional"),
    ("hadley",      "Hadley",        "Regional"),
    ("hartman",     "Hartman",       "Regional"),
    ("madison",     "Madison",       "Regional"),
    ("mccabe",      "McCabe",        "Regional"),
    ("hickory",     "Old Hickory",   "Regional"),
    ("sevier",      "Sevier",        "Regional"),
    ("smith",       "Smith Springs", "Regional"),
    ("southeast",   "Southeast",     "Regional"),
    ("antioch",     "Antioch",       "Neighborhood"),
    ("cleveland",   "Cleveland",     "Neighborhood"),
    ("easley",      "Easley",        "Neighborhood"),
    ("elizabeth",   "Elizabeth",     "Neighborhood"),
    ("hermitage",   "Hermitage",     "Neighborhood"),
    ("hfall",       "Hermitage",     "Neighborhood"),
    ("hspring",     "Hermitage",     "Neighborhood"),
    ("kirkpatrick", "Kirkpatrick",   "Neighborhood"),
    ("looby",       "Looby",         "Neighborhood"),
    ("mcf",         "McFerrin",      "Neighborhood"),
    ("morgan",      "Morgan",        "Neighborhood"),
    ("napier",      "Napier",        "Neighborhood"),
    ("paradise",    "Paradise Ridge","Neighborhood"),
    ("ridgesummer", "Paradise Ridge","Neighborhood"),
    ("parkwood",    "Parkwood",      "Neighborhood"),
    ("shelby",      "Shelby",        "Neighborhood"),
]

DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
DAY_PATTERN = re.compile(
    r'\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday'
    r'|Mon|Tue|Tues|Wed|Thu|Thur|Thurs|Fri|Sat|Sun)\b', re.IGNORECASE
)
TIME_PATTERN = re.compile(
    r'\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)'
    r'(?:\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))?'
)
DAY_NORM = {
    "mon": "Monday", "tue": "Tuesday", "tues": "Tuesday",
    "wed": "Wednesday", "thu": "Thursday", "thur": "Thursday", "thurs": "Thursday",
    "fri": "Friday", "sat": "Saturday", "sun": "Sunday",
}


def curl_get(url, out_path):
    result = subprocess.run(
        ["curl", "-s", "-L", "-o", out_path, "-w", "%{http_code}",
         "-H", f"User-Agent: {CURL_UA}", url],
        capture_output=True, text=True
    )
    return result.stdout.strip(), result.returncode


def extract_pdf_links(html):
    links = re.findall(r'href="(/sites/default/files/[^"]*\.pdf)[^"]*"', html)
    return list(dict.fromkeys(links))  # deduplicate, preserve order


def match_center(filename):
    fname = filename.lower().split("/")[-1]
    for keyword, name, ctype in CENTER_MAP:
        if keyword in fname:
            return name, ctype
    return None, None


def extract_volleyball(pdf_path):
    hits = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                # Table rows
                for table in page.extract_tables():
                    for row in table:
                        row_text = " | ".join(str(c) for c in row if c)
                        if "volleyball" in row_text.lower():
                            hits.append(row_text.strip())
                # Plain text
                text = page.extract_text() or ""
                lines = text.split("\n")
                for i, line in enumerate(lines):
                    if "volleyball" in line.lower():
                        ctx = " ".join(
                            l.strip() for l in lines[max(0, i-1):i+2] if l.strip()
                        )
                        hits.append(ctx)
    except Exception as e:
        return [], str(e)
    return list(dict.fromkeys(hits)), None


def parse_day_time(text):
    days = []
    for m in DAY_PATTERN.finditer(text):
        w = m.group(1)
        norm = DAY_NORM.get(w.lower(), w.capitalize())
        if norm not in days:
            days.append(norm)
    times = TIME_PATTERN.findall(text)
    return days, times


def generate_markdown(results):
    now = datetime.now().strftime("%Y-%m-%d")
    lines = [
        "# Nashville Metro Parks — Indoor Volleyball Schedule",
        "",
        f"_Last updated: {now}_",
        "",
        "## Weekly Schedule",
        "",
    ]

    schedule = {d: [] for d in DAY_ORDER}
    has_entries = False

    for r in results:
        if r["status"] != "有":
            continue
        for v in r["volleyball"]:
            for day in v["days"]:
                if day in schedule:
                    time_str = ", ".join(v["times"]) if v["times"] else "Call center for time"
                    schedule[day].append(f"{r['name']} — {time_str}")
                    has_entries = True

    if has_entries:
        lines += ["| Day | Venue — Time |", "|-----|--------------|"]
        for day in DAY_ORDER:
            for entry in schedule[day]:
                lines.append(f"| {day} | {entry} |")
    else:
        lines.append("_No volleyball schedule entries found this month._")

    lines += ["", "## Status by Center", ""]
    lines += ["| Center | Type | Status | Raw Text Found |",
              "|--------|------|--------|----------------|"]

    for r in results:
        emoji = {"有": "✅", "沒有": "❌", "沒讀": "⚠️"}.get(r["status"], "?")
        if r["status"] == "有":
            note = " / ".join(v["text"][:80] for v in r["volleyball"])
        else:
            note = r.get("reason", "")
        lines.append(f"| {r['name']} | {r['type']} | {emoji} {r['status']} | {note} |")

    with open("volleyball-schedule.md", "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("Written: volleyball-schedule.md")


def main():
    print(f"Nashville Volleyball Schedule Scraper — {datetime.now().strftime('%Y-%m-%d')}\n")

    # Step 1+2: Fetch main page and extract PDF links
    print(f"Fetching: {PAGE_URL}")
    status, rc = curl_get(PAGE_URL, "/tmp/centers_page.html")
    print(f"HTTP {status}")
    if status != "200":
        print("ERROR: Could not fetch main page")
        return

    with open("/tmp/centers_page.html", encoding="utf-8", errors="ignore") as f:
        html = f.read()

    pdf_paths = extract_pdf_links(html)
    print(f"Found {len(pdf_paths)} PDF links\n")

    results_by_name = {}

    # Steps 3-5: Download each PDF and search for volleyball
    for path in pdf_paths:
        name, ctype = match_center(path)
        if not name:
            print(f"  SKIP (no center match): {path}")
            continue
        if name in results_by_name:
            continue  # already processed this center

        full_url = BASE_URL + path
        pdf_tmp = f"/tmp/{name.replace(' ', '_')}.pdf"

        print(f"[{name}] {path.split('/')[-1]}")
        status, _ = curl_get(full_url, pdf_tmp)
        if status != "200":
            print(f"  ✗ Download failed (HTTP {status})")
            results_by_name[name] = {"name": name, "type": ctype, "status": "沒讀",
                                      "reason": f"HTTP {status}", "volleyball": []}
            continue

        hits, err = extract_volleyball(pdf_tmp)
        try:
            os.remove(pdf_tmp)
        except OSError:
            pass

        if err:
            print(f"  ✗ Parse error: {err}")
            results_by_name[name] = {"name": name, "type": ctype, "status": "沒讀",
                                      "reason": err, "volleyball": []}
        elif hits:
            parsed = []
            for h in hits:
                days, times = parse_day_time(h)
                parsed.append({"text": h, "days": days, "times": times})
                print(f"  ✓ {h[:100]}")
            results_by_name[name] = {"name": name, "type": ctype, "status": "有",
                                      "volleyball": parsed}
        else:
            print(f"  — No volleyball")
            results_by_name[name] = {"name": name, "type": ctype, "status": "沒有",
                                      "reason": "", "volleyball": []}

    # Ensure all 24 centers appear in output
    all_centers = [
        ("Bellevue","Regional"),("Coleman","Regional"),("East Park","Regional"),
        ("Hadley","Regional"),("Hartman","Regional"),("Madison","Regional"),
        ("McCabe","Regional"),("Old Hickory","Regional"),("Sevier","Regional"),
        ("Smith Springs","Regional"),("Southeast","Regional"),
        ("Antioch","Neighborhood"),("Cleveland","Neighborhood"),("Easley","Neighborhood"),
        ("Elizabeth","Neighborhood"),("Hermitage","Neighborhood"),("Kirkpatrick","Neighborhood"),
        ("Looby","Neighborhood"),("McFerrin","Neighborhood"),("Morgan","Neighborhood"),
        ("Napier","Neighborhood"),("Paradise Ridge","Neighborhood"),("Parkwood","Neighborhood"),
        ("Shelby","Neighborhood"),
    ]
    results = []
    for name, ctype in all_centers:
        if name in results_by_name:
            results.append(results_by_name[name])
        else:
            results.append({"name": name, "type": ctype, "status": "沒讀",
                             "reason": "No PDF link found on page", "volleyball": []})

    generate_markdown(results)


if __name__ == "__main__":
    main()
