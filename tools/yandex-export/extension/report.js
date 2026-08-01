/* Constructorul raportului HTML.
   Primeste [{section, name, csv}] si intoarce un document HTML complet,
   auto-continut (fara librarii externe, graficele sunt SVG generat aici). */

(function (global) {
  "use strict";

  /* ---------- CSV ---------- */
  function parseCSV(txt) {
    const rows = [];
    let cur = [], val = "", q = false;
    for (let i = 0; i < txt.length; i++) {
      const c = txt[i];
      if (q) {
        if (c === '"' && txt[i + 1] === '"') { val += '"'; i++; }
        else if (c === '"') q = false;
        else val += c;
      } else if (c === '"') q = true;
      else if (c === "," || c === ";") { cur.push(val); val = ""; }
      else if (c === "\n") { cur.push(val); rows.push(cur); cur = []; val = ""; }
      else if (c !== "\r") val += c;
    }
    if (val || cur.length) { cur.push(val); rows.push(cur); }
    return rows.filter(r => r.some(c => String(c).trim() !== ""));
  }

  const esc = s => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const isDateLike = s => /^\d{4}-\d{2}-\d{2}/.test(s) || /^\d{2}[./-]\d{2}[./-]\d{2,4}/.test(s);
  function toNum(s) {
    if (s == null) return NaN;
    const t = String(s).replace(/\s| /g, "").replace(/%/g, "").replace(",", ".");
    const n = parseFloat(t);
    return isNaN(n) ? NaN : n;
  }
  const fmt = n => {
    if (!isFinite(n)) return "—";
    const a = Math.abs(n);
    if (a >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (a >= 1e3) return (n / 1e3).toFixed(1) + "k";
    if (a >= 100) return n.toFixed(0);
    return (Math.round(n * 100) / 100).toString();
  };

  const PALETTE = ["#6ea8ff", "#6ee7a0", "#ffb454", "#ff7a90", "#b98cff", "#4dd6d6"];

  /* ---------- grafic SVG (linie, multi-serie) ---------- */
  function lineChart(labels, series, opts) {
    const W = 760, H = 240, P = { t: 14, r: 14, b: 30, l: 48 };
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const all = series.flatMap(s => s.values.filter(isFinite));
    if (!all.length) return "";
    let min = Math.min(...all), max = Math.max(...all);
    if (min === max) { max = min + 1; }
    min = Math.min(min, 0);
    const n = labels.length;
    const x = i => P.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
    const y = v => P.t + ih - ((v - min) / (max - min)) * ih;

    let g = "";
    // grila + axa Y
    for (let k = 0; k <= 4; k++) {
      const v = min + ((max - min) * k) / 4, yy = y(v);
      g += `<line x1="${P.l}" y1="${yy.toFixed(1)}" x2="${W - P.r}" y2="${yy.toFixed(1)}" stroke="#2a2e45" stroke-width="1"/>`;
      g += `<text x="${P.l - 8}" y="${(yy + 4).toFixed(1)}" fill="#8990ab" font-size="11" text-anchor="end">${esc(fmt(v))}</text>`;
    }
    // etichete X (max 6)
    const step = Math.max(1, Math.ceil(n / 6));
    for (let i = 0; i < n; i += step) {
      g += `<text x="${x(i).toFixed(1)}" y="${H - 8}" fill="#8990ab" font-size="11" text-anchor="middle">${esc(String(labels[i]).slice(0, 10))}</text>`;
    }
    // serii
    series.forEach((s, si) => {
      const col = PALETTE[si % PALETTE.length];
      let d = "", started = false;
      s.values.forEach((v, i) => {
        if (!isFinite(v)) return;
        d += (started ? " L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1);
        started = true;
      });
      if (d) g += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    });

    const legend = series.map((s, si) =>
      `<span class="lg"><i style="background:${PALETTE[si % PALETTE.length]}"></i>${esc(s.name)}</span>`
    ).join("");

    return `<div class="chart-wrap">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(opts && opts.title || "chart")}">${g}</svg>
      <div class="legend">${legend}</div>
    </div>`;
  }

  /* ---------- grafic cu bare (pentru date categoriale: device, tara, etc.) ----------
     O linie care uneste "Desktop" cu "Mobile" ar sugera o continuitate care nu
     exista — pentru categorii folosim bare. */
  function barChart(labels, series, opts) {
    const s = series[0];
    if (!s) return "";
    const vals = s.values;
    const n = Math.min(labels.length, 14); // prea multe bare devin ilizibile
    const W = 760, H = 240, P = { t: 14, r: 14, b: 46, l: 48 };
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const fin = vals.slice(0, n).filter(isFinite);
    if (!fin.length) return "";
    const max = Math.max(...fin, 0) || 1;
    const bw = iw / n;
    const y = v => P.t + ih - (v / max) * ih;

    let g = "";
    for (let k = 0; k <= 4; k++) {
      const v = (max * k) / 4, yy = y(v);
      g += `<line x1="${P.l}" y1="${yy.toFixed(1)}" x2="${W - P.r}" y2="${yy.toFixed(1)}" stroke="#2a2e45" stroke-width="1"/>`;
      g += `<text x="${P.l - 8}" y="${(yy + 4).toFixed(1)}" fill="#8990ab" font-size="11" text-anchor="end">${esc(fmt(v))}</text>`;
    }
    for (let i = 0; i < n; i++) {
      const v = vals[i];
      if (!isFinite(v)) continue;
      const bx = P.l + i * bw + bw * 0.18, w = bw * 0.64;
      const by = y(v), bh = P.t + ih - by;
      g += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(0, bh).toFixed(1)}" fill="${PALETTE[0]}" rx="3"/>`;
      const lab = String(labels[i] || "").slice(0, 12);
      g += `<text x="${(bx + w / 2).toFixed(1)}" y="${H - 26}" fill="#8990ab" font-size="10" text-anchor="end" transform="rotate(-35 ${(bx + w / 2).toFixed(1)} ${H - 26})">${esc(lab)}</text>`;
    }
    const more = labels.length > n ? `<div class="muted">Primele ${n} din ${labels.length}</div>` : "";
    return `<div class="chart-wrap">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(opts && opts.title || "chart")}">${g}</svg>
      <div class="legend"><span class="lg"><i style="background:${PALETTE[0]}"></i>${esc(s.name)}</span></div>
      ${more}
    </div>`;
  }

  /* ---------- un dataset (CSV) -> sectiune HTML ---------- */
  function renderDataset(ds, idx) {
    const rows = parseCSV(ds.csv || "");
    const title = (ds.name || "raport").replace(/\.csv$/i, "").replace(/[_-]+/g, " ");
    if (rows.length < 2) {
      return `<section class="card"><h3>${esc(title)}</h3><p class="muted">Fara date.</p></section>`;
    }
    const head = rows[0], body = rows.slice(1);

    // coloane numerice
    const numCols = [];
    for (let c = 1; c < head.length; c++) {
      const vals = body.map(r => toNum(r[c]));
      if (vals.filter(isFinite).length >= Math.max(2, body.length * 0.5)) {
        numCols.push({ name: head[c] || ("col" + c), values: vals });
      }
    }

    const labels = body.map(r => r[0]);
    const timeSeries = body.length >= 3 && isDateLike(String(body[0][0] || ""));
    let chart = "";
    if (numCols.length) {
      // Serie temporala -> linie. Categorii (device, tara, query) -> bare.
      const draw = (lbls, ser, o) => timeSeries ? lineChart(lbls, ser, o) : barChart(lbls, ser, o);
      // seriile cu ordine de marime foarte diferita se citesc prost impreuna ->
      // desenam fiecare serie separat daca raportul dintre maxime e prea mare
      const maxes = numCols.map(s => Math.max(...s.values.filter(isFinite).map(Math.abs), 0));
      const big = Math.max(...maxes), small = Math.min(...maxes.filter(v => v > 0));
      const mixed = big > 0 && small > 0 && big / small > 50;
      if (!timeSeries || (mixed && numCols.length > 1)) {
        // la bare oricum desenam o serie pe grafic (altfel se suprapun)
        chart = numCols.map(s => `<div class="sub"><h4>${esc(s.name)}</h4>${draw(labels, [s], { title: s.name })}</div>`).join("");
      } else {
        chart = lineChart(labels, numCols, { title });
      }
    }

    // KPI-uri: total sau ultima valoare
    const kpis = numCols.slice(0, 4).map(s => {
      const fin = s.values.filter(isFinite);
      if (!fin.length) return "";
      const sum = fin.reduce((a, b) => a + b, 0);
      const avg = sum / fin.length;
      const looksRate = /%|ctr|rate|position|pozi|cpm|ecpm|rating/i.test(s.name);
      const val = looksRate ? avg : sum;
      return `<div class="kpi"><span class="kpi-l">${esc(s.name)}${looksRate ? " (medie)" : " (total)"}</span><b>${esc(fmt(val))}</b></div>`;
    }).join("");

    const MAXR = 60;
    const shown = body.slice(0, MAXR);
    const table = `<table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${
      shown.map(r => `<tr>${head.map((_, i) => `<td>${esc(r[i])}</td>`).join("")}</tr>`).join("")
    }</tbody></table>${body.length > shown.length ? `<p class="muted">… si inca ${body.length - shown.length} randuri (vezi CSV-ul brut de mai jos)</p>` : ""}`;

    return `<section class="card" id="ds${idx}">
      <h3>${esc(title)}</h3>
      <p class="muted src">${esc(ds.section || "")} · ${body.length} randuri${timeSeries ? " · serie temporala" : ""}</p>
      ${kpis ? `<div class="kpis">${kpis}</div>` : ""}
      ${chart}
      <details><summary>Tabel de date</summary><div class="tbl">${table}</div></details>
      <details><summary>CSV brut</summary><pre>${esc(ds.csv || "")}</pre></details>
    </section>`;
  }

  /* ---------- documentul complet ---------- */
  function buildReport(meta, datasets) {
    const bySection = {};
    datasets.forEach(d => { (bySection[d.section || "Altele"] ||= []).push(d); });

    let i = 0;
    const nav = [];
    const bodyHtml = Object.entries(bySection).map(([sec, list]) => {
      const items = list.map(d => {
        const html = renderDataset(d, i);
        nav.push(`<a href="#ds${i}">${esc((d.name || "").replace(/\.csv$/i, ""))}</a>`);
        i++;
        return html;
      }).join("\n");
      return `<h2 class="sec">${esc(sec)}</h2>\n${items}`;
    }).join("\n");

    const css = `
      *{box-sizing:border-box;margin:0;padding:0}
      body{background:#12131d;color:#e9ebf5;font:14px/1.55 -apple-system,"Segoe UI",Roboto,sans-serif;padding:28px 20px 60px}
      .wrap{max-width:900px;margin:0 auto}
      header{border-bottom:1px solid #262a40;padding-bottom:18px;margin-bottom:8px}
      h1{font-size:22px;font-weight:800;letter-spacing:-.02em}
      .meta{color:#8990ab;font-size:13px;margin-top:6px}
      .toc{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 26px}
      .toc a{color:#a8b0cc;background:#1c1f30;border:1px solid #262a40;padding:5px 10px;border-radius:999px;text-decoration:none;font-size:12px}
      .toc a:hover{background:#6842ff;color:#fff;border-color:#6842ff}
      h2.sec{font-size:16px;margin:30px 0 12px;color:#b9c0dd;text-transform:uppercase;letter-spacing:.08em;font-size:12px}
      .card{background:#171927;border:1px solid #242840;border-radius:14px;padding:18px;margin-bottom:16px}
      .card h3{font-size:16px;font-weight:700;margin-bottom:2px}
      .muted{color:#8990ab;font-size:12px}
      .src{margin-bottom:12px}
      .kpis{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0 16px}
      .kpi{background:#1e2133;border:1px solid #2a2e45;border-radius:10px;padding:9px 13px;min-width:130px}
      .kpi-l{display:block;font-size:11px;color:#8990ab;margin-bottom:2px}
      .kpi b{font-size:18px;font-weight:800}
      .chart-wrap{margin:6px 0 4px}
      .chart-wrap svg{width:100%;height:auto;display:block}
      .legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:6px}
      .lg{display:flex;align-items:center;gap:6px;font-size:12px;color:#a8b0cc}
      .lg i{width:11px;height:3px;border-radius:2px;display:inline-block}
      .sub{margin-top:14px}
      .sub h4{font-size:13px;color:#b9c0dd;margin-bottom:4px}
      details{margin-top:12px}
      summary{cursor:pointer;color:#a8b0cc;font-size:13px;padding:6px 0}
      summary:hover{color:#fff}
      .tbl{overflow-x:auto;margin-top:8px}
      table{border-collapse:collapse;width:100%;font-size:12px;min-width:380px}
      th,td{border-bottom:1px solid #242840;padding:6px 9px;text-align:left;white-space:nowrap}
      th{color:#8990ab;font-weight:600;position:sticky;top:0;background:#171927}
      pre{background:#0e0f18;border:1px solid #242840;border-radius:8px;padding:12px;overflow-x:auto;font-size:11px;color:#a8b0cc;max-height:320px;margin-top:8px}
      footer{margin-top:34px;color:#6f7694;font-size:12px;text-align:center}
    `;

    return `<!DOCTYPE html>
<html lang="ro"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Yandex Games — raport metrici${meta.appId ? " · app " + esc(meta.appId) : ""}</title>
<style>${css}</style></head>
<body><div class="wrap">
<header>
  <h1>Yandex Games — raport metrici</h1>
  <div class="meta">
    ${meta.appId ? `Aplicatie: <b>${esc(meta.appId)}</b> · ` : ""}
    Generat: ${esc(meta.generated)} ·
    ${datasets.length} seturi de date
    ${meta.period ? ` · Perioada: ${esc(meta.period)}` : ""}
  </div>
</header>
<nav class="toc">${nav.join("")}</nav>
${bodyHtml || '<p class="muted">Niciun set de date capturat.</p>'}
<footer>Generat local de extensia „Yandex Games — Metrics Report". Datele nu au parasit browserul.</footer>
</div></body></html>`;
  }

  /* ---------- pachet de date pentru analiza AI ----------
     Markdown cu datele COMPLETE (fara trunchiere), fiecare set intr-un bloc
     ```csv. Blocurile CSV sunt mai compacte decat tabelele markdown (fara
     padding), deci incap mai multe date in aceeasi fereastra de context,
     si raman lipsite de ambiguitate. */
  function buildMarkdown(meta, datasets) {
    let md = `# Yandex Games — export metrici\n\n`;
    md += `- Aplicatie: ${meta.appId || "necunoscuta"}\n`;
    if (meta.period) md += `- Perioada: ${meta.period}\n`;
    md += `- Generat: ${meta.generated}\n`;
    md += `- Seturi de date: ${datasets.length}\n\n`;

    // rezumat: ce contine fiecare set
    md += `## Cuprins\n\n`;
    datasets.forEach((d, i) => {
      const rows = parseCSV(d.csv || "");
      const cols = rows.length ? rows[0].join(", ") : "";
      md += `${i + 1}. **${(d.name || "").replace(/\.csv$/i, "")}** (${d.section || "?"}) — ${Math.max(0, rows.length - 1)} randuri · coloane: ${cols}\n`;
    });
    md += `\n---\n\n`;

    // datele complete
    datasets.forEach(d => {
      const rows = parseCSV(d.csv || "");
      const n = Math.max(0, rows.length - 1);
      md += `## ${(d.name || "raport").replace(/\.csv$/i, "")}\n\n`;
      md += `Sectiune: ${d.section || "?"} · ${n} randuri de date\n\n`;
      md += "```csv\n" + String(d.csv || "").trim() + "\n```\n\n";
    });

    md += `---\n\nNota: datele sunt exact cum le exporta consola Yandex Games, netransformate.\n`;
    return md;
  }

  global.YReport = { buildReport, buildMarkdown, parseCSV };
})(this);
