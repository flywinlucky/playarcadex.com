#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
 PlayArcadeX — Generator surse jocuri (GameMonetize feed parser)
=============================================================================
Ia feed-urile GameMonetize (PC si Mobile), le parseaza, curata, dedupliceaza,
le sorteaza pe categorii / publisher si le salveaza in format compatibil cu
games.json al site-ului tau.

CUM SE FOLOSESTE
----------------
1. Pune linkurile tale in lista FEEDS de mai jos (deja sunt cele 2 exemple).
   - PC games:     https://gamemonetize.com/feed.php?format=0&page=1
   - Mobile games: https://gamemonetize.com/feed.php?format=0&platform=1&page=1
   Poti adauga oricate pagini (page=1, page=2, ...) sau alte linkuri.

2. Ruleaza:
       python3 generate_sources.py

   Sau cu optiuni:
       python3 generate_sources.py --pages 5        # trage paginile 1..5 din fiecare feed
       python3 generate_sources.py --out ./surse     # alt folder de iesire

3. Rezultatul (in folderul 'sources/' implicit):
       sources/pc_games.json        — toate jocurile PC, formatate
       sources/mobile_games.json    — toate jocurile Mobile, formatate
       sources/all_games.json       — ambele combinate, deduplicat
       sources/by_category.json     — grupate pe categorie
       sources/by_publisher.json    — grupate pe publisher (daca exista in feed)
       sources/report.txt           — raport: cate jocuri, pe categorii, etc.

   Apoi dai aceste fisiere lui Claude / le integrezi in data/games.json.

DEPENDENTE
----------
Doar 'requests'. Instaleaza cu:
       pip install requests
(Daca nu vrei requests, scriptul cade automat pe urllib din standard library.)
=============================================================================
"""

import json
import re
import os
import sys
import time
import argparse
import unicodedata
from html import unescape

# requests e optional — daca lipseste, folosim urllib (standard library)
try:
    import requests
    HAVE_REQUESTS = True
except ImportError:
    HAVE_REQUESTS = False
    import urllib.request

# =============================================================================
# CONFIGURARE — pune aici linkurile tale
# =============================================================================
FEEDS = [
    {
        "name": "pc",
        "label": "PC games",
        "url": "https://gamemonetize.com/feed.php?format=0&page={page}",
    },
    {
        "name": "mobile",
        "label": "Mobile games",
        "url": "https://gamemonetize.com/feed.php?format=0&platform=1&page={page}",
    },
]

USER_AGENT = "PlayArcadeX-SourceGen/1.0 (+https://playarcadex.com)"

# Categorii pe care le consideram "prioritare" (primesc un mic bonus la sortare)
PRIORITY_CATEGORIES = {
    "Racing", "Action", "Sports", "Puzzle", "Puzzles", "Shooting", "Arcade",
    "Adventure", "Girls", "Hypercasual", "Multiplayer", "3D", "Clicker",
    "IO", ".IO", "io", "2 Player", "Cooking", "Boys", "Fighting",
}

# Titluri "gunoi" pe care le sarim
BAD_TITLE = re.compile(r"(^test$|sample|^demo$|undefined|null|untitled)", re.I)


# =============================================================================
# UTILITARE
# =============================================================================
def slugify(s):
    """Transforma un titlu in slug URL-friendly (la fel ca pe site)."""
    s = unicodedata.normalize("NFKD", str(s))
    s = s.encode("ascii", "ignore").decode("ascii")
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s[:80]


def clean_text(s):
    """Curata HTML, entitati, spatii multiple."""
    s = unescape(str(s or ""))
    s = re.sub(r"<[^>]*>", " ", s)        # scoate tag-uri HTML
    s = s.replace("&mdash;", "—").replace("&rsquo;", "'").replace("&amp;", "&")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def orientation_of(w, h):
    """Determina orientarea din dimensiuni."""
    try:
        w = float(w); h = float(h)
    except (TypeError, ValueError):
        return "adaptive"
    if not w or not h:
        return "adaptive"
    if w >= h * 1.15:
        return "landscape"
    if h >= w * 1.15:
        return "portrait"
    return "adaptive"


def is_junk(g):
    """True daca jocul e invalid / de sarit."""
    title = clean_text(g.get("title"))
    if not title or len(title) < 2 or BAD_TITLE.search(title):
        return True
    url = g.get("url", "")
    thumb = g.get("thumb", "")
    if not url or not str(url).startswith("http"):
        return True
    if not thumb or not str(thumb).startswith("http"):
        return True
    return False


def fetch_url(url, timeout=30):
    """Descarca un URL si returneaza textul. Foloseste requests sau urllib."""
    if HAVE_REQUESTS:
        r = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=timeout)
        r.raise_for_status()
        return r.text
    else:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8", errors="replace")


def parse_feed_json(text):
    """
    Feed-ul GameMonetize cu format=0 returneaza JSON (lista de jocuri).
    Daca vine alt format, incercam sa-l reparam.
    """
    text = text.strip()
    if not text:
        return []
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        # uneori feed-ul are caractere ciudate la inceput; cautam primul '['
        start = text.find("[")
        end = text.rfind("]")
        if start != -1 and end != -1:
            data = json.loads(text[start:end + 1])
        else:
            return []
    if isinstance(data, dict):
        # unele feeduri impacheteaza in {"games": [...]}
        data = data.get("games") or data.get("data") or []
    return data if isinstance(data, list) else []


# =============================================================================
# NORMALIZARE — transforma un joc brut in formatul site-ului
# =============================================================================
def normalize_game(raw, platform):
    """Transforma un joc brut din feed in formatul games.json al site-ului."""
    title = clean_text(raw.get("title"))
    slug = slugify(title)
    if not slug:
        return None

    tags_raw = clean_text(raw.get("tags"))
    tags = [t.strip() for t in tags_raw.split(",") if t.strip()][:8]

    w = raw.get("width", "")
    h = raw.get("height", "")

    return {
        "id": str(raw.get("id", "")),
        "title": title,
        "slug": slug,
        "description": clean_text(raw.get("description"))[:480],
        "instructions": clean_text(raw.get("instructions"))[:300],
        "url": raw.get("url", ""),
        "category": clean_text(raw.get("category")) or "Arcade",
        "tags": tags,
        "thumb": raw.get("thumb", ""),
        "width": str(w or "800"),
        "height": str(h or "600"),
        "orientation": orientation_of(w, h),
        "platform": platform,        # "pc" sau "mobile" — util pentru filtrare
        "publisher": clean_text(raw.get("publisher") or raw.get("company") or ""),
    }


# =============================================================================
# SCORARE pentru sortare (cele bune primele)
# =============================================================================
def score_game(g, feed_index):
    """Scor simplu: pozitia in feed + bonus pentru categorii prioritare."""
    score = max(0, 1000 - feed_index)
    if g["category"] in PRIORITY_CATEGORIES:
        score += 60
    # jocurile cu descriere mai bogata = probabil mai calitative
    if len(g["description"]) > 150:
        score += 10
    return score


# =============================================================================
# MAIN
# =============================================================================
def main():
    ap = argparse.ArgumentParser(description="Generator surse jocuri GameMonetize (PC + Mobile)")
    ap.add_argument("--pages", type=int, default=1,
                    help="Cate pagini sa traga din fiecare feed (default 1)")
    ap.add_argument("--out", default="sources",
                    help="Folder de iesire (default ./sources)")
    ap.add_argument("--delay", type=float, default=0.5,
                    help="Pauza intre requesturi in secunde (default 0.5)")
    args = ap.parse_args()

    # Folosim cale ABSOLUTA langa script (nu directorul curent), ca sa evitam
    # problemele de permisiuni pe Windows (Desktop/OneDrive/antivirus).
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_dir = args.out
    if not os.path.isabs(out_dir):
        out_dir = os.path.join(script_dir, out_dir)

    # Incercam sa cream folderul; daca e blocat, cadem pe alternative.
    candidates = [
        out_dir,
        os.path.join(os.path.expanduser("~"), "playarcadex_sources"),  # folderul home al userului
        os.path.join(os.environ.get("TEMP", "/tmp"), "playarcadex_sources"),  # temp ca ultim resort
    ]
    chosen = None
    last_err = None
    for cand in candidates:
        try:
            os.makedirs(cand, exist_ok=True)
            # test real de scriere (makedirs poate reusi dar scrierea sa fie blocata)
            test_file = os.path.join(cand, ".write_test")
            with open(test_file, "w") as tf:
                tf.write("ok")
            os.remove(test_file)
            chosen = cand
            break
        except Exception as e:
            last_err = e
            continue

    if not chosen:
        print("\nEROARE: nu pot scrie in niciun folder.")
        print(f"Ultima eroare: {last_err}")
        print("\nSolutii:")
        print("  1. Muta folderul 'tools' in afara Desktop/OneDrive")
        print("     (ex. direct in C:\\playarcadex\\tools)")
        print("  2. Click-dreapta pe RULEAZA-Windows.bat -> 'Run as administrator'")
        print("  3. Verifica daca antivirusul blocheaza scrierea")
        raise PermissionError(f"Nu pot crea folder de iesire. Ultima eroare: {last_err}")

    args.out = chosen
    print(f"Folder de iesire: {chosen}\n")

    by_platform = {"pc": [], "mobile": []}
    seen_slugs = {"pc": set(), "mobile": set()}

    print(f"Backend HTTP: {'requests' if HAVE_REQUESTS else 'urllib (standard library)'}")
    print(f"Pagini per feed: {args.pages}\n")

    for feed in FEEDS:
        platform = feed["name"]
        print(f"=== {feed['label']} ({platform}) ===")
        feed_counter = 0

        for page in range(1, args.pages + 1):
            url = feed["url"].format(page=page)
            try:
                text = fetch_url(url)
            except Exception as e:
                print(f"  pagina {page}: EROARE — {e}")
                continue

            games = parse_feed_json(text)
            if not games:
                print(f"  pagina {page}: 0 jocuri (probabil ultima pagina), opresc")
                break

            added = 0
            for raw in games:
                if is_junk(raw):
                    continue
                g = normalize_game(raw, platform)
                if not g:
                    continue
                if g["slug"] in seen_slugs[platform]:
                    continue  # duplicat in aceeasi platforma
                seen_slugs[platform].add(g["slug"])
                g["_score"] = score_game(g, feed_counter)
                feed_counter += 1
                by_platform[platform].append(g)
                added += 1

            print(f"  pagina {page}: +{added} jocuri (total {platform}: {len(by_platform[platform])})")
            time.sleep(args.delay)

        print()

    # ----- Sortare pe scor (cele bune primele) + feedRank/featured -----
    def finalize(games_list):
        games_list.sort(key=lambda x: x.get("_score", 0), reverse=True)
        out = []
        for i, g in enumerate(games_list):
            g2 = {k: v for k, v in g.items() if not k.startswith("_")}
            g2["feedRank"] = i
            g2["featured"] = i < 12
            out.append(g2)
        return out

    pc_games = finalize(by_platform["pc"])
    mobile_games = finalize(by_platform["mobile"])

    # ----- All combined (deduplicat global, PC are prioritate) -----
    combined = {}
    for g in pc_games + mobile_games:
        if g["slug"] not in combined:
            combined[g["slug"]] = g
    all_games = list(combined.values())
    for i, g in enumerate(all_games):
        g["feedRank"] = i

    # ----- Grupare pe categorie -----
    by_category = {}
    for g in all_games:
        by_category.setdefault(g["category"], []).append(g)

    # ----- Grupare pe publisher -----
    by_publisher = {}
    for g in all_games:
        pub = g.get("publisher") or "(unknown)"
        by_publisher.setdefault(pub, []).append(g)

    # ----- Scriere fisiere -----
    def write(name, data):
        path = os.path.join(args.out, name)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return path

    write("pc_games.json", pc_games)
    write("mobile_games.json", mobile_games)
    write("all_games.json", all_games)
    write("by_category.json", by_category)
    write("by_publisher.json", by_publisher)

    # ----- Raport -----
    lines = []
    lines.append("=" * 50)
    lines.append("RAPORT — Generator surse PlayArcadeX")
    lines.append("=" * 50)
    lines.append(f"PC games:      {len(pc_games)}")
    lines.append(f"Mobile games:  {len(mobile_games)}")
    lines.append(f"Total unic:    {len(all_games)}")
    lines.append("")
    lines.append("Pe categorii:")
    for cat, items in sorted(by_category.items(), key=lambda x: -len(x[1])):
        lines.append(f"  {cat:20s} {len(items)}")
    lines.append("")
    lines.append("Pe publisher (top 15):")
    pubs = sorted(by_publisher.items(), key=lambda x: -len(x[1]))[:15]
    for pub, items in pubs:
        lines.append(f"  {pub[:30]:30s} {len(items)}")
    report = "\n".join(lines)
    with open(os.path.join(args.out, "report.txt"), "w", encoding="utf-8") as f:
        f.write(report)

    print(report)
    print(f"\n✔ Gata! Fisiere salvate in: {os.path.abspath(args.out)}/")
    print("  - pc_games.json, mobile_games.json, all_games.json")
    print("  - by_category.json, by_publisher.json, report.txt")
    print("\nTrimite aceste fisiere lui Claude pentru integrare in data/games.json,")
    print("sau foloseste-le direct cu admin panel (tab Import).")


def _pause_exit(code=0):
    """Tine consola deschisa pana apesi Enter (ca fereastra sa nu se inchida brusc)."""
    try:
        input("\n--- Apasa ENTER pentru a inchide ---")
    except (EOFError, KeyboardInterrupt):
        pass
    sys.exit(code)


if __name__ == "__main__":
    try:
        main()
        _pause_exit(0)
    except KeyboardInterrupt:
        print("\n\n[Oprit de utilizator (Ctrl+C)]")
        _pause_exit(1)
    except Exception as e:
        import traceback
        print("\n" + "=" * 50)
        print("EROARE — scriptul s-a oprit. Detalii mai jos:")
        print("=" * 50)
        traceback.print_exc()
        print("\nSugestii:")
        print("  - Verifica conexiunea la internet")
        print("  - Verifica ca linkurile din FEEDS sunt corecte")
        print("  - Daca apare eroare la 'requests', ruleaza: pip install requests")
        _pause_exit(1)
