#!/usr/bin/env node
/**
 * fetch-games.js — Curatorie PREMIUM de jocuri din GameMonetize
 * ------------------------------------------------------------------
 * Trage jocuri de pe TOATE categoriile (category=2..18), filtreaza
 * gunoaiele si aplica un ALGORITM DE CALITATE (stil CrazyGames/Yandex):
 * jocurile cele mai bune ajung primele pe homepage si in fiecare categorie.
 *
 * Rulare:   node fetch-games.js
 * Optiuni:  node fetch-games.js --pages=3 --per=200
 *
 * Cum se calculeaza calitatea (fara ca feed-ul sa aiba eticheta "premium"):
 *  1. ORDINEA FEED-ului: GameMonetize livreaza jocurile deja ordonate dupa
 *     performanta (cele mai bune/populare primele). Pastram pozitia ca scor.
 *  2. APARITII MULTIPLE: un joc care apare in mai multe categorii / pagini
 *     e mai "puternic" -> bonus.
 *  3. CATEGORII PROFITABILE: bonus pentru categoriile cu CPM/retentie buna.
 *  4. FILTRU GUNOI: fara thumbnail valid, titlu suspect sau dimensiuni lipsa.
 *  Scorul final -> sorteaza homepage-ul si fiecare categorie; top = featured.
 *
 * Mai tarziu, evenimentul `play_game` din Google Analytics iti arata ce
 * jocuri sunt jucate REAL pe site-ul tau (semnal mult mai bun decat orice
 * eticheta a furnizorului) — atunci putem booosta acele jocuri.
 */

const fs = require("fs");
const path = require("path");

const arg = (k, def) => {
  const a = process.argv.find(s => s.startsWith(`--${k}=`));
  return a ? a.split("=")[1] : def;
};
const PER_PAGE = parseInt(arg("per", "200"), 10);   // max 200 la feed
const PAGES = parseInt(arg("pages", "2"), 10);       // cate pagini per categorie
const MAX_GAMES = parseInt(arg("max", "1000"), 10);  // cate jocuri pastram in final

// Categoriile GameMonetize: category=1 = All Games (le luam pe toate prin 2..18).
// Folosim si All Games (1) ca sa prindem ordinea globala de performanta.
const CATEGORY_IDS = Array.from({ length: 18 }, (_, i) => i + 1); // 1..18

// Categorii cu CPM + retentie bune -> primesc bonus de scor.
const PRIORITY_CATEGORIES = new Set([
  "Racing", "Action", "Sports", "Puzzle", "Shooting", "Arcade",
  "Adventure", "Girls", "Hypercasual", "Multiplayer", "3D", "Clicker",
  "IO", ".io", "io", "2 Player", "Cooking", "Stickman"
]);

function slugify(str) {
  return String(str).toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
function cleanText(str) {
  return String(str || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Filtru gunoi: titluri suspecte / spam / placeholdere
const BAD_TITLE = /(test|sample|demo|undefined|null|untitled|xxx|порно)/i;
function isJunk(g) {
  const title = cleanText(g.title);
  if (!title || title.length < 2) return true;
  if (BAD_TITLE.test(title)) return true;
  if (!g.url || !/^https?:\/\//.test(g.url)) return true;
  if (!g.thumb || !/^https?:\/\//.test(g.thumb)) return true;
  return false;
}

async function fetchPage(catId, page) {
  const url = `https://gamemonetize.com/feed.php?format=0&category=${catId}&num=${PER_PAGE}&page=${page}`;
  const res = await fetch(url, { headers: { "User-Agent": "PlayArcadeX/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

(async () => {
  console.log(`Premium fetch: ${CATEGORY_IDS.length} categorii x ${PAGES} pagini x ${PER_PAGE} jocuri...`);

  // map slug -> joc agregat (cu scor de calitate)
  const bySlug = new Map();

  for (const catId of CATEGORY_IDS) {
    for (let page = 1; page <= PAGES; page++) {
      let games;
      try {
        games = await fetchPage(catId, page);
      } catch (e) {
        console.warn(`  cat ${catId} p${page}: ${e.message}`);
        continue;
      }
      if (!games.length) break; // categorie/pagina goala -> trecem mai departe

      games.forEach((g, idx) => {
        if (isJunk(g)) return;
        const title = cleanText(g.title);
        const slug = slugify(title);
        if (!slug) return;

        // Scor de pozitie: cu cat mai sus in feed, cu atat mai bun.
        // page 1 idx 0 -> ~200; scade pe masura ce coboram.
        const positionScore = Math.max(0, (PER_PAGE - idx)) + (PAGES - page) * PER_PAGE;
        const W = Number(g.width) || 0, H = Number(g.height) || 0;
        const orientation = W && H
          ? (W >= H * 1.15 ? "landscape" : (H >= W * 1.15 ? "portrait" : "adaptive"))
          : "adaptive";

        if (bySlug.has(slug)) {
          // joc deja vazut in alta categorie/pagina -> cumulam scor (apare des = bun)
          const ex = bySlug.get(slug);
          ex.score += positionScore;
          ex.appearances += 1;
        } else {
          const category = cleanText(g.category) || "Arcade";
          let score = positionScore;
          if (PRIORITY_CATEGORIES.has(category)) score += 120; // bonus categorie buna
          bySlug.set(slug, {
            id: String(g.id),
            title, slug,
            description: cleanText(g.description).slice(0, 480),
            instructions: cleanText(g.instructions).slice(0, 300),
            url: g.url,
            category,
            tags: cleanText(g.tags).split(",").map(t => t.trim()).filter(Boolean).slice(0, 8),
            thumb: g.thumb,
            width: String(g.width || 960),
            height: String(g.height || 600),
            orientation,
            score,
            appearances: 1,
            featured: false
          });
        }
      });
      console.log(`  cat ${catId} p${page}: total unic acum ${bySlug.size}`);
    }
  }

  let games = [...bySlug.values()];

  // Bonus pentru jocuri care apar in mai multe categorii (cross-category = popular)
  games.forEach(g => { g.score += (g.appearances - 1) * 80; });

  // SORTARE GLOBALA dupa calitate (scor descrescator)
  games.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  // Pastram doar top MAX_GAMES
  games = games.slice(0, MAX_GAMES);

  // feedRank = pozitia in clasamentul de calitate (0 = cel mai bun)
  games.forEach((g, i) => { g.feedRank = i; });

  // Primele 12 (cele mai bune din tot site-ul) = Featured pe homepage
  games.slice(0, 12).forEach(g => { g.featured = true; });

  // curatam campurile interne de scor inainte de salvare (le pastram doar pe cele utile)
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
  console.log(`\nSaved ${out.length} premium games -> ${outPath}`);
  console.log("Categorii:", Object.entries(cats).sort((a,b)=>b[1]-a[1])
    .map(([c,n]) => `${c}(${n})`).join(", "));
  console.log("\nAcum ruleaza: node build.js");
})();
