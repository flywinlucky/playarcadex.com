#!/usr/bin/env python3
"""Import games from GameDistribution GraphQL into assets/js/games-data.js."""

from __future__ import annotations

import json
import re
import time
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

API_URL = "https://gd-website-api.gamedistribution.com/graphql"
DATA_FILE = Path("assets/js/games-data.js")

PER_PAGE = 45
MAX_PAGES_PER_FILTER = 14
TARGET_PER_CATEGORY = 55
MAX_STALE_PAGES = 6

RETRY_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = 1.2
RETRYABLE_HTTP_CODES = {429, 500, 502, 503, 504}

QUERY = """
query GetGamesSearched(
  $id: String! = ""
  $perPage: Int! = 45
  $page: Int! = 0
  $search: String! = ""
  $UIfilter: UIFilterInput! = {}
  $filters: GameSearchFiltersFlat! = {}
) {
  gamesSearched(
    input: {
      collectionObjectId: $id
      hitsPerPage: $perPage
      page: $page
      search: $search
      UIfilter: $UIfilter
      filters: $filters
    }
  ) {
    nbPages
    hits {
      objectID
      title
      sortScore
      slugs {
        name
      }
    }
  }
}
""".strip()

CATEGORY_FILTERS = {
    "action": [
        {"UIfilter": {"genres": ["Agility"]}},
        {"UIfilter": {"genres": ["Battle"]}},
        {"search": "action"},
    ],
    "racing": [
        {"UIfilter": {"genres": ["Racing & Driving"]}},
        {"search": "racing"},
    ],
    "puzzle": [
        {"UIfilter": {"genres": ["Puzzle"]}},
        {"UIfilter": {"genres": ["Match-3"]}},
        {"UIfilter": {"genres": ["Mahjong & Connect"]}},
        {"UIfilter": {"genres": ["Jigsaw"]}},
        {"UIfilter": {"genres": ["Bubble Shooter"]}},
        {"UIfilter": {"genres": ["Merge"]}},
    ],
    "sports": [
        {"UIfilter": {"genres": ["Sports"]}},
        {"UIfilter": {"genres": ["Football"]}},
        {"UIfilter": {"genres": ["Basketball"]}},
        {"search": "sports"},
    ],
    "casual": [
        {"UIfilter": {"genres": ["Casual"]}},
        {"UIfilter": {"genres": ["Care"]}},
        {"UIfilter": {"genres": ["Cooking"]}},
        {"UIfilter": {"genres": ["Dress-up"]}},
        {"search": "casual"},
    ],
    "adventure": [
        {"UIfilter": {"genres": ["Adventure"]}},
        {"search": "adventure"},
    ],
    "shooter": [
        {"UIfilter": {"genres": ["Shooter"]}},
        {"search": "shooter"},
    ],
    "strategy": [
        {"UIfilter": {"genres": ["Strategy"]}},
        {"UIfilter": {"genres": ["Boardgames"]}},
        {"search": "strategy"},
    ],
    "io": [
        {"UIfilter": {"genres": [".IO"]}},
        {"search": "io"},
    ],
    "multiplayer": [
        {"UIfilter": {"players": ["Multiplayer"]}},
        {"UIfilter": {"players": ["Co-op"]}},
        {"search": "multiplayer"},
    ],
}


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    normalized = normalized.lower()
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    return normalized or "game"


def escape_js(value: str) -> str:
    return json.dumps(value, ensure_ascii=True)


def format_plays(value: int) -> str:
    if value >= 1_000_000:
        scaled = value / 1_000_000
        compact = f"{scaled:.1f}".rstrip("0").rstrip(".")
        return f"{compact}M"
    if value >= 1_000:
        return f"{int(round(value / 1000.0))}K"
    return str(value)


def build_description(title: str, category: str) -> str:
    return f"Play {title} online for free. A fast-loading {category} pick from the GameDistribution catalog."


def build_game_entry(hit: dict, category: str, used_ids: set[str]) -> dict | None:
    object_id = (hit.get("objectID") or "").strip()
    title = (hit.get("title") or "").strip()
    if not object_id or not title:
        return None

    slugs = hit.get("slugs") or []
    slug_candidates = [str(item.get("name", "")).strip() for item in slugs if isinstance(item, dict)]
    slug = next((s for s in slug_candidates if s), "")
    if not slug:
        slug = slugify(title)

    game_id = slugify(slug)
    if game_id in used_ids:
        game_id = f"{game_id}-{object_id[:6]}"

    seed_source = re.sub(r"[^0-9a-fA-F]", "", object_id)[:8] or "0"
    seed = int(seed_source, 16)
    plays_num = 75_000 + (seed % 1_950_000)
    rating = round(4.1 + ((seed >> 5) % 9) * 0.1, 1)

    return {
        "id": game_id,
        "title": title,
        "category": category,
        "iframeUrl": f"https://html5.gamedistribution.com/{object_id}/",
        "thumbnail": f"https://images.gamedistribution.com/{object_id}-512x512.jpeg",
        "description": build_description(title, category),
        "plays": format_plays(plays_num),
        "rating": rating,
        "imageHash": object_id,
    }


def resolve_filter_config(filter_config: dict) -> tuple[dict, str]:
    if "UIfilter" in filter_config or "search" in filter_config:
        return filter_config.get("UIfilter", {}), str(filter_config.get("search") or "")
    return filter_config, ""


def fetch_page(page: int, ui_filter: dict, search_term: str) -> dict:
    payload = {
        "operationName": "GetGamesSearched",
        "query": QUERY,
        "variables": {
            "id": "",
            "perPage": PER_PAGE,
            "page": page,
            "search": search_term,
            "UIfilter": ui_filter,
            "filters": {},
        },
    }

    for attempt in range(1, RETRY_ATTEMPTS + 1):
        try:
            request = urllib.request.Request(
                API_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0",
                },
                method="POST",
            )

            with urllib.request.urlopen(request, timeout=30) as response:
                body = response.read().decode("utf-8")

            data = json.loads(body)
            if data.get("errors"):
                raise RuntimeError(f"GraphQL error: {data['errors'][0].get('message', 'unknown error')}")
            return data["data"]["gamesSearched"]
        except urllib.error.HTTPError as error:
            if error.code in RETRYABLE_HTTP_CODES and attempt < RETRY_ATTEMPTS:
                time.sleep(RETRY_BACKOFF_SECONDS * attempt)
                continue
            raise
        except urllib.error.URLError:
            if attempt < RETRY_ATTEMPTS:
                time.sleep(RETRY_BACKOFF_SECONDS * attempt)
                continue
            raise

    raise RuntimeError("Request retries exhausted")


def format_entries(entries: list[dict], newline: str) -> str:
    chunks: list[str] = []
    for entry in entries:
        chunk = newline.join(
            [
                "    {",
                f"        id: {escape_js(entry['id'])},",
                f"        title: {escape_js(entry['title'])},",
                f"        category: {escape_js(entry['category'])},",
                f"        iframeUrl: {escape_js(entry['iframeUrl'])},",
                f"        thumbnail: {escape_js(entry['thumbnail'])},",
                f"        description: {escape_js(entry['description'])},",
                f"        plays: {escape_js(entry['plays'])},",
                f"        rating: {entry['rating']:.1f},",
                f"        imageHash: {escape_js(entry['imageHash'])}",
                "    }",
            ]
        )
        chunks.append(chunk)
    return ("," + newline).join(chunks)


def append_entries_to_file(path: Path, entries: list[dict]) -> None:
    text = path.read_text(encoding="utf-8")
    newline = "\r\n" if "\r\n" in text else "\n"

    closing_match = re.search(r"\]\s*;\s*$", text)
    if not closing_match:
        raise RuntimeError("Could not locate closing array token in games-data.js")

    before = text[: closing_match.start()].rstrip()
    if before.endswith("}"):
        before = before + "," + newline
    elif before.endswith("},"):
        before = before + newline

    formatted = format_entries(entries, newline)
    new_text = before + formatted + newline + "];" + newline
    path.write_text(new_text, encoding="utf-8")


def main() -> int:
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"Data file not found: {DATA_FILE}")

    text = DATA_FILE.read_text(encoding="utf-8")
    existing_ids = set(re.findall(r'id:\s*"([^"]+)"', text))
    existing_hashes = set(re.findall(r'imageHash:\s*"([^"]+)"', text))

    print(f"Existing games: {len(existing_ids)}")

    new_entries: list[dict] = []
    used_ids = set(existing_ids)
    used_hashes = set(existing_hashes)
    counts: dict[str, int] = {category: 0 for category in CATEGORY_FILTERS}

    for category, filter_list in CATEGORY_FILTERS.items():
        for filter_config in filter_list:
            if counts[category] >= TARGET_PER_CATEGORY:
                break

            ui_filter, search_term = resolve_filter_config(filter_config)
            stale_pages = 0

            for page in range(MAX_PAGES_PER_FILTER):
                if counts[category] >= TARGET_PER_CATEGORY:
                    break

                try:
                    result = fetch_page(page=page, ui_filter=ui_filter, search_term=search_term)
                except urllib.error.HTTPError as error:
                    print(f"HTTP error for {category} filter={ui_filter} search='{search_term}' page {page}: {error}")
                    break
                except Exception as error:  # noqa: BLE001
                    print(f"Request error for {category} filter={ui_filter} search='{search_term}' page {page}: {error}")
                    break

                hits = result.get("hits") or []
                if not hits:
                    break

                page_added = 0

                for hit in hits:
                    if counts[category] >= TARGET_PER_CATEGORY:
                        break

                    object_id = str(hit.get("objectID") or "").strip()
                    if not object_id or object_id in used_hashes:
                        continue

                    entry = build_game_entry(hit, category, used_ids)
                    if not entry:
                        continue

                    new_entries.append(entry)
                    used_hashes.add(object_id)
                    used_ids.add(entry["id"])
                    counts[category] += 1
                    page_added += 1

                if page_added == 0:
                    stale_pages += 1
                else:
                    stale_pages = 0

                if stale_pages >= MAX_STALE_PAGES:
                    break

                nb_pages = int(result.get("nbPages") or 0)
                if nb_pages and page + 1 >= nb_pages:
                    break

                time.sleep(0.12)

        print(f"{category}: +{counts[category]}")

    if not new_entries:
        print("No new games imported.")
        return 0

    append_entries_to_file(DATA_FILE, new_entries)
    print(f"Imported {len(new_entries)} new games.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
