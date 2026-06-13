#!/usr/bin/env node
/**
 * merge-premium.js — Contopeste listele PREMIUM exportate manual din
 * GameMonetize RSS/JSON Builder intr-o singura baza de calitate.
 *
 * Pune fisierele .txt (JSON) intr-un folder si ruleaza:
 *   node merge-premium.js ./premium-feeds
 *
 * Fiecare lista are o "greutate" (cat de premium e). Un joc care apare in
 * mai multe liste primeste scor cumulat -> cele mai bune ajung primele
 * pe homepage si in fiecare categorie (stil CrazyGames/Yandex).
 *
 * NOTA: acesta e fluxul MANUAL (extragi tu listele cand vrei sa improspatezi
 * catalogul premium). Pentru update automat zilnic exista fetch-games.js.
 */

const fs = require("fs");
const path = require("path");

// Mapare fisier -> greutate (scor de baza). Ajusteaza dupa preferinte.
// Editor's Picks + Exclusive = cele mai curate; Most Popular/Best/Hot = volum mare bun.
const LIST_WEIGHTS = [
  { match: /editor/i,        label: "Editor's Picks", weight: 300 },
  { match: /exclusive/i,     label: "Exclusive",      weight: 260 },
  { match: /best/i,          label: "Best Games",     weight: 220 },
  { match: /hot/i,           label: "Hot Games",      weight: 200 },
  { match: /most.?popular/i, label: "Most Popular",   weight: 180 },
  { match: /no.?branding/i,  label: "No Branding",    weight: 120 },
];

const PRIORITY_CATEGORIES = new Set([
  "Racing", "Action", "Sports", "Puzzle", "Shooting", "Arcade",
  "Adventure", "Girls", "Hypercasual", "Multiplayer", "3D", "Clicker",
  "IO", ".io", "io", "2 Player", "Cooking", "Stickman"
]);

const slugify = s => String(s).toLowerCase().normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "").slice(0, 80);
const clean = s => String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const BAD_TITLE = /(^test$|sample|demo|undefined|null|untitled)/i;
function isJunk(g) {
  const t = clean(g.title);
  if (!t || t.length < 2 || BAD_TITLE.test(t)) return true;
  if (!g.url || !/^https?:\/\//.test(g.url)) return true;
  if (!g.thumb || !/^https?:\/\//.test(g.thumb)) return true;
  return false;
}
function weightForFile(name) {
  for (const w of LIST_WEIGHTS) if (w.match.test(name)) return w;
  return { label: name, weight: 100 };
}

const dir = process.argv[2] || ".";
const files = fs.readdirSync(dir).filter(f => /\.(txt|json)$/i.test(f));
if (!files.length) { console.error("Niciun fisier .txt/.json in", dir); process.exit(1); }

const bySlug = new Map();

for (const file of files) {
  const { label, weight } = weightForFile(file);
  let arr;
  try {
    arr = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  } catch (e) { console.warn(`  skip ${file}: JSON invalid`); continue; }
  if (!Array.isArray(arr)) continue;

  let added = 0;
  arr.forEach((g, idx) => {
    if (isJunk(g)) return;
    const title = clean(g.title);
    const slug = slugify(title);
    if (!slug) return;

    // bonus de pozitie in lista (sus = mai bun)
    const posBonus = Math.max(0, arr.length - idx);

    if (bySlug.has(slug)) {
      const ex = bySlug.get(slug);
      ex.score += weight + posBonus;
      ex.lists.add(label);
    } else {
      const W = Number(g.width) || 0, H = Number(g.height) || 0;
      const category = clean(g.category) || "Arcade";
      let score = weight + posBonus;
      if (PRIORITY_CATEGORIES.has(category)) score += 120;
      bySlug.set(slug, {
        id: String(g.id),
        title, slug,
        description: clean(g.description).slice(0, 480),
        instructions: clean(g.instructions).slice(0, 300),
        url: g.url,
        category,
        tags: clean(g.tags).split(",").map(t => t.trim()).filter(Boolean).slice(0, 8),
        thumb: g.thumb,
        width: String(g.width || 960),
        height: String(g.height || 600),
        orientation: W && H ? (W >= H * 1.15 ? "landscape" : (H >= W * 1.15 ? "portrait" : "adaptive")) : "adaptive",
        score,
        lists: new Set([label]),
        featured: false
      });
      added++;
    }
  });
  console.log(`  ${file} (${label}, w=${weight}): ${arr.length} jocuri, +${added} noi`);
}

let games = [...bySlug.values()];

// bonus mare pentru jocuri care apar in MAI MULTE liste premium (calitate confirmata)
games.forEach(g => { g.score += (g.lists.size - 1) * 150; });

// sortare globala dupa calitate
games.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
games.forEach((g, i) => { g.feedRank = i; });
games.slice(0, 12).forEach(g => { g.featured = true; });

const out = games.map(g => ({
  id: g.id, title: g.title, slug: g.slug,
  description: g.description, instructions: g.instructions,
  url: g.url, category: g.category, tags: g.tags,
  thumb: g.thumb, width: g.width, height: g.height,
  orientation: g.orientation, feedRank: g.feedRank, featured: g.featured
}));

const outPath = path.join(__dirname, "data", "games.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

const cats = {};
out.forEach(g => { cats[g.category] = (cats[g.category] || 0) + 1; });
console.log(`\nSaved ${out.length} premium games -> data/games.json`);
console.log("Top 8 (cele mai premium):");
out.slice(0, 8).forEach((g, i) => console.log(`  ${i + 1}. ${g.title} [${g.category}]`));
console.log("\nCategorii:", Object.entries(cats).sort((a, b) => b[1] - a[1])
  .map(([c, n]) => `${c}(${n})`).join(", "));
console.log("\nAcum ruleaza: node build.js");
