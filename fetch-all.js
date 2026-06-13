#!/usr/bin/env node
/**
 * fetch-all.js — Catalog COMPLET GameMonetize + pastreaza calitatea premium
 * ---------------------------------------------------------------------------
 * Trage TOT catalogul din feed.php (pagina cu pagina), il combina cu baza
 * premium existenta (data/games.json) si le sorteaza dupa CALITATE + categorii.
 *
 * Regula de aur: jocurile PREMIUM (cele deja in games.json din listele de top)
 * isi pastreaza scorul mare -> raman Featured pe homepage si primele in fiecare
 * categorie. Restul catalogului umple volumul, dar dedesubt.
 *
 * Rulare:
 *   node fetch-all.js                 # 1000 jocuri totale (default)
 *   node fetch-all.js --pages=20      # cate pagini din feed.php (x100 fiecare)
 *   node fetch-all.js --max=2000      # cate jocuri pastram in final
 *
 * IMPORTANT: ruleaza LOCAL sau in GitHub Actions (au acces la gamemonetize.com).
 */

const fs = require("fs");
const path = require("path");

const arg = (k, d) => {
  const a = process.argv.find(s => s.startsWith(`--${k}=`));
  return a ? a.split("=")[1] : d;
};
const PAGES = parseInt(arg("pages", "15"), 10);    // 15 x 100 = ~1500 din feed
const PER = 100;
const MAX_GAMES = parseInt(arg("max", "1500"), 10);

const PRIORITY_CATEGORIES = new Set([
  "Racing", "Action", "Sports", "Puzzle", "Puzzles", "Shooting", "Arcade",
  "Adventure", "Girls", "Hypercasual", "Multiplayer", "3D", "Clicker",
  "IO", ".io", ".IO", "io", "2 Player", "Cooking", "Stickman", "Boys", "Fighting"
]);

const slugify = s => String(s).toLowerCase().normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "").slice(0, 80);
const clean = s => String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const BAD_TITLE = /(^test$|sample|^demo$|undefined|null|untitled)/i;
function isJunk(g) {
  const t = clean(g.title);
  if (!t || t.length < 2 || BAD_TITLE.test(t)) return true;
  if (!g.url || !/^https?:\/\//.test(g.url)) return true;
  if (!g.thumb || !/^https?:\/\//.test(g.thumb)) return true;
  return false;
}
function orient(g) {
  const W = Number(g.width) || 0, H = Number(g.height) || 0;
  return W && H ? (W >= H * 1.15 ? "landscape" : (H >= W * 1.15 ? "portrait" : "adaptive")) : "adaptive";
}

const bySlug = new Map();

// 1) Pastram baza PREMIUM existenta cu scor mare (asa ramane in top)
const dataPath = path.join(__dirname, "data", "games.json");
let premiumCount = 0;
if (fs.existsSync(dataPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    existing.forEach((g, i) => {
      // scor premium descrescator dupa pozitia lor curenta (cei mai buni primii)
      const premiumScore = 100000 - (g.feedRank ?? i);
      bySlug.set(g.slug, {
        ...g,
        score: premiumScore,
        isPremium: true
      });
    });
    premiumCount = existing.length;
    console.log(`Baza premium pastrata: ${premiumCount} jocuri (raman in top)`);
  } catch (e) {
    console.warn("Nu am putut citi games.json existent:", e.message);
  }
}

async function fetchPage(page) {
  const url = `https://gamemonetize.com/feed.php?format=0&num=${PER}&page=${page}`;
  const res = await fetch(url, { headers: { "User-Agent": "PlayArcadeX/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

(async () => {
  console.log(`Trag tot catalogul: ${PAGES} pagini x ${PER} jocuri din feed.php...`);
  let added = 0;
  for (let page = 1; page <= PAGES; page++) {
    let games;
    try { games = await fetchPage(page); }
    catch (e) { console.warn(`  p${page}: ${e.message}`); continue; }
    if (!games.length) { console.log(`  p${page}: gol, opresc`); break; }

    games.forEach((g, idx) => {
      if (isJunk(g)) return;
      const title = clean(g.title);
      const slug = slugify(title);
      if (!slug) return;

      if (bySlug.has(slug)) {
        // joc deja in baza (premium sau vazut deja) -> mic bonus de prezenta
        bySlug.get(slug).score += 5;
        return;
      }
      // joc NOU din catalogul general -> scor mic (sub premium)
      const category = clean(g.category) || "Arcade";
      let score = Math.max(0, PER - idx) + (PAGES - page) * PER; // pozitie in feed
      if (PRIORITY_CATEGORIES.has(category)) score += 60;
      bySlug.set(slug, {
        id: String(g.id), title, slug,
        description: clean(g.description).slice(0, 480),
        instructions: clean(g.instructions).slice(0, 300),
        url: g.url, category,
        tags: clean(g.tags).split(",").map(t => t.trim()).filter(Boolean).slice(0, 8),
        thumb: g.thumb,
        width: String(g.width || 960), height: String(g.height || 600),
        orientation: orient(g),
        score, isPremium: false, featured: false
      });
      added++;
    });
    console.log(`  p${page}: total unic ${bySlug.size} (+${added} noi din catalog)`);
  }

  let games = [...bySlug.values()];
  // sortare: premium intai (scor urias), apoi catalogul dupa scorul lui
  games.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  games = games.slice(0, MAX_GAMES);
  games.forEach((g, i) => { g.feedRank = i; });
  games.slice(0, 12).forEach(g => { g.featured = true; });

  const out = games.map(g => ({
    id: g.id, title: g.title, slug: g.slug,
    description: g.description, instructions: g.instructions,
    url: g.url, category: g.category, tags: g.tags,
    thumb: g.thumb, width: g.width, height: g.height,
    orientation: g.orientation, feedRank: g.feedRank, featured: g.featured
  }));

  fs.writeFileSync(dataPath, JSON.stringify(out, null, 2));

  const cats = {};
  out.forEach(g => { cats[g.category] = (cats[g.category] || 0) + 1; });
  console.log(`\nSaved ${out.length} jocuri (${premiumCount} premium in top + restul catalog) -> data/games.json`);
  console.log("Top 8:", out.slice(0, 8).map(g => g.title).join(" | "));
  console.log("\nCategorii:", Object.entries(cats).sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `${c}(${n})`).join(", "));
  console.log("\nAcum ruleaza: node build.js");
})();
