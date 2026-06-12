#!/usr/bin/env node
/**
 * fetch-games.js — Descarcă jocurile din feed-ul oficial GameMonetize
 * și le salvează normalizate în data/games.json
 *
 * Rulează:  node fetch-games.js
 * Opțiuni:  node fetch-games.js --pages=5 --category=All
 *
 * Feed docs: https://gamemonetize.com/rssfeedgenerator
 * format=0 => JSON
 */

const fs = require("fs");
const path = require("path");

const PAGES = parseInt((process.argv.find(a => a.startsWith("--pages=")) || "--pages=4").split("=")[1], 10);
const PER_PAGE = 100; // max permis de feed

// Categoriile pe care le considerăm "profitabile" / populare (CPM + retenție bună).
// Poți edita lista după preferințe.
const PRIORITY_CATEGORIES = new Set([
  "Racing", "Action", "Sports", "Puzzle", "Shooting",
  "Arcade", "Adventure", "Girls", "Hypercasual", "Multiplayer", "3D", "2D", "Clicker", "io"
]);

function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function cleanText(str) {
  return String(str || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPage(page) {
  const url = `https://gamemonetize.com/feed.php?format=0&num=${PER_PAGE}&page=${page}`;
  const res = await fetch(url, { headers: { "User-Agent": "PlayArcadeX/1.0" } });
  if (!res.ok) throw new Error(`Feed HTTP ${res.status} (page ${page})`);
  return res.json();
}

(async () => {
  console.log(`Fetching ${PAGES} pages x ${PER_PAGE} games from GameMonetize...`);
  const all = [];
  for (let p = 1; p <= PAGES; p++) {
    try {
      const games = await fetchPage(p);
      if (!Array.isArray(games) || games.length === 0) break;
      all.push(...games);
      console.log(`  page ${p}: +${games.length}`);
    } catch (e) {
      console.warn(`  page ${p} failed: ${e.message}`);
    }
  }

  const seen = new Set();
  const normalized = [];

  for (const g of all) {
    const title = cleanText(g.title);
    if (!title || !g.url) continue;
    let slug = slugify(title);
    if (!slug) continue;
    if (seen.has(slug)) slug = `${slug}-${g.id}`.slice(0, 90);
    if (seen.has(slug)) continue;
    seen.add(slug);

    normalized.push({
      id: String(g.id),
      title,
      slug,
      description: cleanText(g.description).slice(0, 480),
      instructions: cleanText(g.instructions).slice(0, 300),
      url: g.url,                 // iframe embed URL
      category: cleanText(g.category) || "Arcade",
      tags: cleanText(g.tags).split(",").map(t => t.trim()).filter(Boolean).slice(0, 8),
      thumb: g.thumb,
      width: String(g.width || 960),
      height: String(g.height || 600),
      feedRank: normalized.length,
      featured: false
    });
  }

  // Sortare: categoriile prioritare primele, apoi alfabetic — și marcăm featured primele 12
  normalized.sort((a, b) => {
    const pa = PRIORITY_CATEGORIES.has(a.category) ? 0 : 1;
    const pb = PRIORITY_CATEGORIES.has(b.category) ? 0 : 1;
    return pa - pb || a.title.localeCompare(b.title);
  });
  normalized.slice(0, 12).forEach(g => (g.featured = true));

  const out = path.join(__dirname, "data", "games.json");
  fs.writeFileSync(out, JSON.stringify(normalized, null, 2));
  console.log(`\nSaved ${normalized.length} games -> ${out}`);
  console.log("Acum rulează: node build.js");
})();
