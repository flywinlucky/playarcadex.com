#!/usr/bin/env node
/**
 * check-thumbs.js — verifica daca miniaturile de la GameMonetize chiar raspund.
 *
 * DE CE EXISTA: pe 5 aug 2026 site-ul a parut "blocat" — cardurile ramaneau goale
 * si pagina se incarca la infinit. Cauza NU era in cod: GameMonetize scosese
 * dimensiunile mici de thumbnail (230x230, 200x200, 256x256...), iar acele URL-uri
 * raspundeau cu 302 -> html5.gamemonetize.com/404.html (pagina HTML, no-cache).
 * Fiecare card facea doua cereri, dintre care una moarta. Nimic din build nu s-a
 * schimbat — furnizorul s-a schimbat sub noi.
 *
 * Ruleaza asta cand imaginile arata ciudat, sau periodic:
 *   node tools/check-thumbs.js
 *   node tools/check-thumbs.js 100      (verifica 100 de jocuri random)
 *
 * Iese cu cod 1 daca gaseste probleme, ca sa-l poti pune si intr-un workflow.
 */

const fs = require("fs");
const path = require("path");

const SAMPLE = Number(process.argv[2] || 25);
const GAMES = path.join(__dirname, "..", "data", "games.json");

function head(url) {
  return fetch(url, { method: "GET", redirect: "manual" })
    .then(res => ({
      status: res.status,
      type: res.headers.get("content-type") || "",
      location: res.headers.get("location") || "",
      len: Number(res.headers.get("content-length") || 0)
    }))
    .catch(e => ({ status: 0, type: "", location: "", len: 0, error: e.message }));
}

(async () => {
  const games = JSON.parse(fs.readFileSync(GAMES, "utf8"));
  const pick = [...games].sort(() => Math.random() - 0.5).slice(0, SAMPLE);

  console.log(`Verific ${pick.length} miniaturi din ${games.length} jocuri...\n`);

  const bad = [];
  for (const g of pick) {
    const r = await head(g.thumb);
    const ok = r.status === 200 && r.type.startsWith("image/");
    if (!ok) {
      bad.push({ slug: g.slug, url: g.thumb, ...r });
      console.log(`  ✖ ${g.slug}\n     ${g.thumb}\n     status=${r.status} type=${r.type || "-"}${r.location ? " -> " + r.location : ""}`);
    }
  }

  console.log(`\n${pick.length - bad.length}/${pick.length} OK.`);

  if (bad.length) {
    console.log(`\n⚠  ${bad.length} miniaturi nu raspund cu o imagine.`);
    console.log(`   Daca URL-urile de mai sus au o dimensiune rescrisa (ex. 230x230),`);
    console.log(`   verifica ce dimensiuni mai serveste furnizorul — vezi smallThumb() in build.js.`);
    console.log(`   Daca URL-urile sunt cele originale din feed, ruleaza din nou fetch-games.js.`);
    process.exit(1);
  }

  // A doua verificare: dimensiunile alternative chiar exista? (util cand vrei
  // sa reintroduci o varianta mica pentru economie de trafic)
  const probe = pick[0];
  const sizes = ["512x384", "512x512", "256x256", "230x230", "200x200", "320x180"];
  console.log(`\nDimensiuni disponibile pe ${probe.slug}:`);
  for (const s of sizes) {
    const url = String(probe.thumb).replace(/512x384/i, s);
    const r = await head(url);
    const ok = r.status === 200 && r.type.startsWith("image/");
    console.log(`  ${ok ? "✔" : "✖"} ${s.padEnd(9)} status=${r.status} ${ok ? `${Math.round(r.len / 1024)}KB` : r.location || ""}`);
  }
  console.log(`\nDoar dimensiunile marcate ✔ pot fi folosite in smallThumb().`);
})();
