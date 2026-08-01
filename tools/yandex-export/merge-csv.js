#!/usr/bin/env node
/**
 * Uneste CSV-urile descarcate din Yandex Games Console intr-un singur fisier,
 * ca sa poti da un singur document unui AI spre analiza.
 *
 * FOLOSIRE
 *   node merge-csv.js                        # ia din Downloads, ultimele 24h
 *   node merge-csv.js --dir "C:/alt/folder"  # alt folder sursa
 *   node merge-csv.js --hours 72             # fisiere din ultimele 72h
 *   node merge-csv.js --out raport.md        # alt fisier de iesire
 *   node merge-csv.js --all                  # toate CSV-urile, fara filtru de timp
 *
 * Iesire implicita: yandex-raport.md, langa scriptul asta.
 * Formatul e Markdown: fiecare fisier devine o sectiune cu titlu + tabel,
 * deci se citeste usor si de om, si de AI.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");

// ---------- argumente ----------
const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf("--" + name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : def;
};
const SRC = arg("dir", path.join(os.homedir(), "Downloads"));
const HOURS = argv.includes("--all") ? Infinity : Number(arg("hours", 24));
const OUT = path.resolve(arg("out", path.join(__dirname, "yandex-raport.md")));
const MAX_ROWS = Number(arg("max-rows", 400)); // trunchiem tabelele uriase

if (!fs.existsSync(SRC)) {
  console.error(`Folderul sursa nu exista: ${SRC}`);
  process.exit(1);
}

// ---------- alegem fisierele ----------
const cutoff = Date.now() - HOURS * 3600 * 1000;
const files = fs.readdirSync(SRC)
  .filter(f => f.toLowerCase().endsWith(".csv"))
  .map(f => ({ f, p: path.join(SRC, f), t: fs.statSync(path.join(SRC, f)).mtimeMs }))
  .filter(x => x.t >= cutoff)
  .sort((a, b) => a.t - b.t);

if (!files.length) {
  console.error(`Niciun CSV in ultimele ${HOURS}h in ${SRC}`);
  console.error(`Incearca: node merge-csv.js --all   sau   --hours 168`);
  process.exit(1);
}

// ---------- CSV -> tabel markdown ----------
function parseCSV(txt) {
  const rows = []; let cur = [], val = "", q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) {
      if (c === '"' && txt[i + 1] === '"') { val += '"'; i++; }
      else if (c === '"') q = false;
      else val += c;
    }
    else if (c === '"') q = true;
    else if (c === "," || c === ";") { cur.push(val); val = ""; }
    else if (c === "\n") { cur.push(val); rows.push(cur); cur = []; val = ""; }
    else if (c !== "\r") val += c;
  }
  if (val || cur.length) { cur.push(val); rows.push(cur); }
  return rows.filter(r => r.some(c => String(c).trim()));
}

const esc = s => String(s).replace(/\|/g, "\\|").trim();

let out = `# Yandex Games — export metrici\n\n`;
out += `Generat: ${new Date().toISOString().slice(0, 16).replace("T", " ")}\n`;
out += `Sursa: ${SRC}\n`;
out += `Fisiere incluse: ${files.length}\n\n---\n\n`;

let totalRows = 0;
for (const { f, p } of files) {
  const rows = parseCSV(fs.readFileSync(p, "utf8"));
  if (!rows.length) continue;
  const title = f.replace(/\.csv$/i, "").replace(/[_-]+/g, " ");
  out += `## ${title}\n\n`;
  if (rows.length === 1) { out += `_(gol)_\n\n`; continue; }

  const head = rows[0];
  const body = rows.slice(1);
  totalRows += body.length;

  out += `| ${head.map(esc).join(" | ")} |\n`;
  out += `|${head.map(() => "---").join("|")}|\n`;
  const shown = body.slice(0, MAX_ROWS);
  for (const r of shown) out += `| ${head.map((_, i) => esc(r[i] ?? "")).join(" | ")} |\n`;
  if (body.length > shown.length) {
    out += `\n_... si inca ${body.length - shown.length} randuri (trunchiat)_\n`;
  }
  out += `\n`;
}

fs.writeFileSync(OUT, out, "utf8");
console.log(`✔ ${files.length} fisiere, ${totalRows} randuri -> ${OUT}`);
console.log(`\nFisiere incluse:`);
files.forEach(x => console.log(`  - ${x.f}`));
console.log(`\nAcum poti da ${path.basename(OUT)} unui AI spre analiza.`);
