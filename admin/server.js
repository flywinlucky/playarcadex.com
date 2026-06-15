#!/usr/bin/env node
/**
 * admin/server.js — Panou de administrare LOCAL pentru PlayArcadeX
 * ----------------------------------------------------------------
 * Ruleaza:  npm run admin   (sau: node admin/server.js)
 * Apoi deschizi:  http://localhost:4321
 *
 * Ofera o interfata web (admin/index.html) + API care citeste si scrie
 * direct in data/games.json. Foloseste DOAR local, pe calculatorul tau.
 *
 * Functii:
 *  - listare/cautare/filtrare jocuri
 *  - editare titlu, descriere, categorie, orientare, featured
 *  - stergere jocuri
 *  - reordonare (muta sus/jos, seteaza pozitie)
 *  - import liste premium (JSON din RSS Builder) cu merge + dedupe
 *  - gestionare categorii (redenumire, contopire)
 *  - salvare -> scrie games.json; apoi rulezi `node build.js` + push
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = 4321;
const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data", "games.json");
const ADMIN_DIR = __dirname;

function readGames() {
  return JSON.parse(fs.readFileSync(DATA, "utf8"));
}
function writeGames(games) {
  // backup automat inainte de scriere
  const backupDir = path.join(ADMIN_DIR, "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  try {
    fs.copyFileSync(DATA, path.join(backupDir, `games-${stamp}.json`));
  } catch (e) {}
  // pastram doar ultimele 20 backupuri
  try {
    const files = fs.readdirSync(backupDir).filter(f => f.startsWith("games-")).sort();
    while (files.length > 20) fs.unlinkSync(path.join(backupDir, files.shift()));
  } catch (e) {}
  fs.writeFileSync(DATA, JSON.stringify(games, null, 2));
}

function slugify(s) {
  return String(s).toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 80);
}
function clean(s) {
  return String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function orient(w, h) {
  w = Number(w) || 0; h = Number(h) || 0;
  return w && h ? (w >= h * 1.15 ? "landscape" : (h >= w * 1.15 ? "portrait" : "adaptive")) : "adaptive";
}

function sendJSON(res, data, code = 200) {
  res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", c => { body += c; if (body.length > 50e6) req.destroy(); });
    req.on("end", () => { try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  try {
    // ---- API ----
    if (pathname === "/api/games" && req.method === "GET") {
      return sendJSON(res, readGames());
    }

    if (pathname === "/api/save" && req.method === "POST") {
      const body = await collectBody(req);
      if (!Array.isArray(body.games)) return sendJSON(res, { error: "games array required" }, 400);
      // re-numerotam feedRank dupa ordinea curenta + setam featured pe primele N marcate
      body.games.forEach((g, i) => { g.feedRank = i; });
      writeGames(body.games);
      return sendJSON(res, { ok: true, count: body.games.length });
    }

    if (pathname === "/api/import" && req.method === "POST") {
      // primeste { lists: [ { name, games:[...] }, ... ] } si le contopeste peste baza
      const body = await collectBody(req);
      const existing = readGames();
      const bySlug = new Map();
      existing.forEach((g, i) => bySlug.set(g.slug, { ...g, score: 100000 - (g.feedRank ?? i), _existing: true }));

      const WEIGHTS = { editor: 300, exclusive: 260, best: 220, hot: 200, popular: 180, branding: 120 };
      function weightFor(name) {
        const n = String(name).toLowerCase();
        for (const k in WEIGHTS) if (n.includes(k)) return WEIGHTS[k];
        return 100;
      }

      let addedTotal = 0;
      (body.lists || []).forEach(list => {
        const w = weightFor(list.name);
        (list.games || []).forEach((g, idx) => {
          const title = clean(g.title);
          if (!title || !g.url || !g.thumb) return;
          const slug = slugify(title);
          if (!slug) return;
          const posBonus = Math.max(0, (list.games.length - idx));
          if (bySlug.has(slug)) {
            const ex = bySlug.get(slug);
            ex.score = (ex.score || 0) + w + posBonus;
          } else {
            bySlug.set(slug, {
              id: String(g.id), title, slug,
              description: clean(g.description).slice(0, 480),
              instructions: clean(g.instructions).slice(0, 300),
              url: g.url, category: clean(g.category) || "Arcade",
              tags: clean(g.tags).split(",").map(t => t.trim()).filter(Boolean).slice(0, 8),
              thumb: g.thumb,
              width: String(g.width || 960), height: String(g.height || 600),
              orientation: orient(g.width, g.height),
              score: w + posBonus, featured: false, _existing: false
            });
            addedTotal++;
          }
        });
      });

      let merged = [...bySlug.values()].sort((a, b) => (b.score || 0) - (a.score || 0));
      merged.forEach((g, i) => { g.feedRank = i; delete g.score; delete g._existing; });
      // pastram featured existent; daca nimic featured, marcam primele 12
      if (!merged.some(g => g.featured)) merged.slice(0, 12).forEach(g => g.featured = true);

      writeGames(merged);
      return sendJSON(res, { ok: true, total: merged.length, added: addedTotal });
    }

    // ---- Fisiere statice din admin/ ----
    let file = pathname === "/" ? "/index.html" : pathname;
    const filePath = path.join(ADMIN_DIR, file.replace(/\.\./g, ""));
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
      res.writeHead(200, { "Content-Type": types[ext] || "text/plain" });
      return res.end(fs.readFileSync(filePath));
    }

    res.writeHead(404); res.end("Not found");
  } catch (e) {
    sendJSON(res, { error: String(e.message || e) }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`\n  PlayArcadeX Admin Panel`);
  console.log(`  ➜  Deschide:  http://localhost:${PORT}\n`);
  console.log(`  Date: ${DATA}`);
  console.log(`  Backupuri automate in: admin/backups/`);
  console.log(`  (Ctrl+C pentru oprire)\n`);
});
