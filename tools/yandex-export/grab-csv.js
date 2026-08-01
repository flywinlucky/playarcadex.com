/**
 * Yandex Games Console — descarcare CSV in masa
 * =============================================
 * Apasa automat TOATE butoanele "Download graph data in .csv" din consola
 * Yandex Games, trecand si prin tab-urile de metrici.
 *
 * CUM SE FOLOSESTE
 *  1. Deschide pagina de metrici a jocului tau, ex:
 *       https://games.yandex.ru/console/application/547145#metrics/game
 *  2. Alege perioada dorita (Period) si filtrele — scriptul descarca EXACT
 *     ce e afisat pe ecran.
 *  3. F12 -> tab-ul "Console" -> lipeste tot fisierul asta -> Enter.
 *  4. Chrome va cere o data permisiunea "Allow multiple downloads" -> Allow.
 *
 * Fisierele ajung in folderul tau de Downloads. Dupa aceea, ruleaza
 * `node merge-csv.js` (din acelasi folder) ca sa le unesti intr-un singur
 * fisier usor de dat unui AI spre analiza.
 *
 * NOTA: scriptul nu trimite nimic nicaieri. Ruleaza local, in sesiunea ta,
 * si doar apasa butoane care oricum exista in pagina.
 */
(async function grabAllCsv() {
  "use strict";

  const SLEEP_AFTER_CLICK = 700;   // ms intre descarcari (nu supraincarcam)
  const SLEEP_AFTER_TAB   = 2500;  // ms de asteptare dupa schimbarea tabului

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Butonul de download: cautam dupa title (EN + RU), cu rezerva pe aria-label.
  const BTN_SELECTORS = [
    'button[title="Download graph data in .csv"]',
    'button[title*="csv" i]',
    'button[aria-label*="csv" i]',
  ];

  function findDownloadButtons() {
    const seen = new Set();
    const out = [];
    for (const sel of BTN_SELECTORS) {
      for (const b of document.querySelectorAll(sel)) {
        if (!seen.has(b) && b.offsetParent !== null) { seen.add(b); out.push(b); }
      }
      if (out.length) break; // primul selector care da rezultate e cel bun
    }
    return out;
  }

  // Tab-urile de metrici (Product / Monetization / Performance)
  function findMetricTabs() {
    const tabs = [...document.querySelectorAll('.tabs__tab, [role="tab"]')];
    return tabs.filter(t => t.offsetParent !== null && t.textContent.trim());
  }

  async function grabCurrentView(label) {
    // lasam graficele sa se randeze complet
    await sleep(600);
    const btns = findDownloadButtons();
    if (!btns.length) {
      console.warn(`  [${label}] niciun buton de download gasit`);
      return 0;
    }
    console.log(`  [${label}] ${btns.length} grafice de descarcat...`);
    let ok = 0;
    for (let i = 0; i < btns.length; i++) {
      try {
        btns[i].scrollIntoView({ block: "center" });
        btns[i].click();
        ok++;
        console.log(`     ${i + 1}/${btns.length} ✓`);
      } catch (e) {
        console.warn(`     ${i + 1}/${btns.length} ✗`, e.message);
      }
      await sleep(SLEEP_AFTER_CLICK);
    }
    return ok;
  }

  console.log("%c=== Yandex Games — export CSV ===", "font-weight:bold;font-size:14px");
  console.log("Daca Chrome cere 'Allow multiple downloads' -> apasa Allow.\n");

  const tabs = findMetricTabs();
  let total = 0;

  if (tabs.length > 1) {
    console.log(`Am gasit ${tabs.length} taburi de metrici. Trec prin fiecare.\n`);
    for (const tab of tabs) {
      const name = tab.textContent.trim().slice(0, 40);
      console.log(`> Tab: ${name}`);
      try { tab.click(); } catch (e) {}
      await sleep(SLEEP_AFTER_TAB);
      total += await grabCurrentView(name);
    }
  } else {
    total += await grabCurrentView("pagina curenta");
  }

  console.log(`\n%c✔ Gata: ${total} fisiere CSV descarcate.`, "color:#4caf50;font-weight:bold");
  console.log("Verifica folderul Downloads, apoi ruleaza: node merge-csv.js");
  if (!total) {
    console.log("%cNimic descarcat?", "color:#ff9800;font-weight:bold");
    console.log("Verifica: esti pe pagina de metrici? Graficele sunt randate?");
    console.log("Butoanele de download apar la hover pe grafic, in coltul dreapta-sus.");
  }
})();
