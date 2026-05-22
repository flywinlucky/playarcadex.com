#!/usr/bin/env python3
"""Generate sitemap.xml from the local PlayArcadeX game catalog."""

from __future__ import annotations

import html
import re
from datetime import date
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "assets" / "js" / "games-data.js"
SITEMAP_FILE = ROOT / "sitemap.xml"
SITE_URL = "https://playarcadex.com"

CATEGORIES = [
    "action",
    "racing",
    "puzzle",
    "sports",
    "casual",
    "adventure",
    "shooter",
    "strategy",
    "io",
    "multiplayer",
]


def catalog_ids() -> list[str]:
    content = DATA_FILE.read_text(encoding="utf-8")
    ids: list[str] = []
    seen: set[str] = set()

    for match in re.finditer(r'\bid:\s*"([^"]+)"', content):
        game_id = match.group(1).strip()
        if not game_id or game_id in seen:
            continue
        seen.add(game_id)
        ids.append(game_id)

    return ids


def url_entry(location: str, lastmod: str, priority: str, changefreq: str = "weekly") -> str:
    return (
        "    <url>\n"
        f"        <loc>{html.escape(location, quote=True)}</loc>\n"
        f"        <lastmod>{lastmod}</lastmod>\n"
        f"        <changefreq>{changefreq}</changefreq>\n"
        f"        <priority>{priority}</priority>\n"
        "    </url>"
    )


def main() -> None:
    today = date.today().isoformat()
    entries = [url_entry(f"{SITE_URL}/", today, "1.0", "daily")]

    for category in CATEGORIES:
        entries.append(url_entry(f"{SITE_URL}/?category={quote(category)}", today, "0.8"))

    for game_id in catalog_ids():
        entries.append(url_entry(f"{SITE_URL}/game.html?id={quote(game_id)}", today, "0.7"))

    sitemap = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )
    SITEMAP_FILE.write_text(sitemap, encoding="utf-8")
    print(f"Wrote {SITEMAP_FILE} with {len(entries)} URLs")


if __name__ == "__main__":
    main()
