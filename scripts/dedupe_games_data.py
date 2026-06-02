#!/usr/bin/env python3
"""Deduplicate assets/js/games-data.js entries by id/hash."""

from __future__ import annotations

import re
from pathlib import Path

DATA_FILE = Path("assets/js/games-data.js")
ANCHOR = "window.PLAYARCADEX_GAMES_DATA = ["


def extract_objects(array_source: str) -> list[str]:
    objects: list[str] = []
    in_string = False
    escape = False
    depth = 0
    obj_start: int | None = None

    for idx, ch in enumerate(array_source):
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue

        if ch == '"':
            in_string = True
            continue

        if ch == "{":
            if depth == 0:
                obj_start = idx
            depth += 1
            continue

        if ch == "}":
            depth -= 1
            if depth == 0 and obj_start is not None:
                objects.append(array_source[obj_start : idx + 1].strip())
                obj_start = None

    return objects


def dedupe_objects(objects: list[str]) -> list[str]:
    seen_ids: set[str] = set()
    seen_hashes: set[str] = set()
    kept: list[str] = []

    for obj in objects:
        id_match = re.search(r'id:\s*"([^"]+)"', obj)
        hash_match = re.search(r'imageHash:\s*"([^"]+)"', obj)

        if not id_match:
            continue

        game_id = id_match.group(1).strip()
        game_hash = hash_match.group(1).strip() if hash_match else ""

        if game_id in seen_ids:
            continue
        if game_hash and game_hash in seen_hashes:
            continue

        seen_ids.add(game_id)
        if game_hash:
            seen_hashes.add(game_hash)
        kept.append(obj)

    return kept


def main() -> int:
    text = DATA_FILE.read_text(encoding="utf-8")

    start = text.find(ANCHOR)
    if start < 0:
        raise RuntimeError("Could not find data array anchor")

    start_bracket = text.find("[", start)
    end = text.rfind("];")
    if start_bracket < 0 or end < 0:
        raise RuntimeError("Could not find array boundaries")

    array_source = text[start_bracket + 1 : end]
    objects = extract_objects(array_source)
    kept = dedupe_objects(objects)

    newline = "\r\n" if "\r\n" in text else "\n"
    formatted: list[str] = []
    for obj in kept:
        lines = obj.splitlines()
        formatted.append(newline.join(f"    {line}" if line else line for line in lines))

    new_text = text[: start_bracket + 1] + newline + (("," + newline).join(formatted)) + newline + text[end:]
    DATA_FILE.write_text(new_text, encoding="utf-8")

    print(f"objects_before={len(objects)}")
    print(f"objects_after={len(kept)}")
    print(f"removed={len(objects) - len(kept)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
