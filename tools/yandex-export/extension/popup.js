/* Orchestrare: trece prin sectiunile de metrici, captureaza CSV-urile IN MEMORIE
   (fara sa lase browserul sa salveze zeci de fisiere) si scoate UN SINGUR
   raport HTML cu grafice. Totul local — nimic nu pleaca din browser. */

const logEl = document.getElementById("log");
const runBtn = document.getElementById("run");
const secList = document.getElementById("sections");

/* Sectiunile din consola Yandex Games. Ruta e pe hash, deci SPA-ul
   re-randeaza fara reload complet. */
const SECTIONS = [
  { hash: "#metrics/game", label: "Product metrics" },
  { hash: "#metrics/adv", label: "Monetization metrics" },
  { hash: "#metrics/performance", label: "Performance metrics" }
];

function log(msg, cls) {
  const d = document.createElement("div");
  if (cls) d.className = cls;
  d.textContent = msg;
  logEl.appendChild(d);
  logEl.scrollTop = logEl.scrollHeight;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ================= rulat IN PAGINA (MAIN world) =================
   Butonul de download creeaza un Blob si il descarca printr-un <a download>.
   Interceptam createObjectURL + a.click() ca sa luam continutul CSV in loc
   sa se salveze fisierul. La final restauram tot ce am modificat. */
async function captureCsvInPage() {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const blobs = new Map();
  const grabbed = [];

  const origCreate = URL.createObjectURL;
  const origRevoke = URL.revokeObjectURL;
  const origClick = HTMLAnchorElement.prototype.click;

  URL.createObjectURL = function (obj) {
    const u = origCreate.call(URL, obj);
    try { blobs.set(u, obj); } catch (e) {}
    return u;
  };
  // amanam revocarea, altfel blob-ul dispare inainte sa-l citim
  URL.revokeObjectURL = function () {};
  HTMLAnchorElement.prototype.click = function () {
    try {
      if (this.hasAttribute("download") && blobs.has(this.href)) {
        grabbed.push({ name: this.getAttribute("download") || "raport.csv", url: this.href });
        return; // suprimam descarcarea reala
      }
    } catch (e) {}
    return origClick.apply(this, arguments);
  };

  try {
    await sleep(900);
    const btns = [...document.querySelectorAll(
      'button[title="Download graph data in .csv"],button[title*="csv" i],button[aria-label*="csv" i]'
    )].filter(b => b.offsetParent !== null);

    for (const b of btns) {
      try { b.scrollIntoView({ block: "center" }); b.click(); } catch (e) {}
      await sleep(320);
    }
    await sleep(700);

    const files = [];
    for (const g of grabbed) {
      const blob = blobs.get(g.url);
      if (!blob) continue;
      let csv = "";
      try { csv = await blob.text(); } catch (e) {}
      if (csv) files.push({ name: g.name, csv });
    }
    return { buttons: btns.length, files, intercepted: grabbed.length };
  } finally {
    URL.createObjectURL = origCreate;
    URL.revokeObjectURL = origRevoke;
    HTMLAnchorElement.prototype.click = origClick;
    for (const u of blobs.keys()) { try { origRevoke.call(URL, u); } catch (e) {} }
  }
}

/* citeste perioada afisata (pentru antetul raportului) */
function readPeriodInPage() {
  const el = [...document.querySelectorAll("input,button,span,div")]
    .find(e => /\d{2}\.\d{2}\.\d{4}\s*[—–-]\s*\d{2}\.\d{2}\.\d{4}/.test(e.value || e.textContent || ""));
  if (!el) return "";
  const m = (el.value || el.textContent).match(/\d{2}\.\d{2}\.\d{4}\s*[—–-]\s*\d{2}\.\d{2}\.\d{4}/);
  return m ? m[0] : "";
}

function setHashInPage(hash) { if (location.hash !== hash) location.hash = hash; }

async function runInTab(tabId, func, args) {
  const res = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",          // ne trebuie contextul paginii ca sa interceptam Blob-urile
    func,
    args: args || []
  });
  return res && res[0] ? res[0].result : null;
}

runBtn.addEventListener("click", async () => {
  runBtn.disabled = true;
  logEl.textContent = "";
  secList.textContent = "";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !/^https:\/\/games\.yandex\.ru\/console\//.test(tab.url || "")) {
      log("Deschide intai consola jocului pe games.yandex.ru", "warn");
      log("ex: games.yandex.ru/console/application/547145#metrics/game", "warn");
      runBtn.disabled = false;
      return;
    }

    const appId = (tab.url.match(/application\/(\d+)/) || [])[1] || "";
    log(`Aplicatie: ${appId || "necunoscuta"}`);

    let period = "";
    try { period = await runInTab(tab.id, readPeriodInPage); } catch (e) {}

    const all = [];
    for (const s of SECTIONS) {
      log(`> ${s.label}`);
      try {
        await runInTab(tab.id, setHashInPage, [s.hash]);
        await sleep(3000); // lasam SPA-ul sa randeze graficele
        const r = await runInTab(tab.id, captureCsvInPage);
        if (!r) { log("   (fara raspuns)", "warn"); continue; }
        if (!r.buttons) { log("   niciun grafic gasit", "warn"); continue; }
        if (!r.files.length) {
          log(`   ${r.buttons} grafice, dar 0 capturate`, "warn");
          continue;
        }
        r.files.forEach(f => all.push({ section: s.label, name: f.name, csv: f.csv }));
        log(`   ${r.files.length}/${r.buttons} capturate`, "ok");
      } catch (e) {
        log("   eroare: " + e.message, "warn");
      }
    }

    if (!all.length) {
      log("", null);
      log("Nu s-a capturat nimic.", "warn");
      log("Yandex si-a schimbat probabil interfata. Foloseste varianta cu", "warn");
      log("descarcare clasica (grab-csv.js) si apoi merge-csv.js.", "warn");
      runBtn.disabled = false;
      return;
    }

    log("");
    log(`Construiesc din ${all.length} seturi de date...`);

    const meta = {
      appId,
      period,
      generated: new Date().toISOString().slice(0, 16).replace("T", " ")
    };
    const stamp = new Date().toISOString().slice(0, 10);
    const base = `yandex-${appId || "app"}-${stamp}`;

    // toate fisierele merg in acelasi subfolder din Downloads, ca sa nu se
    // amestece cu restul descarcarilor
    const dir = base + "/";

    const save = async (content, filename, mime) => {
      const url = URL.createObjectURL(new Blob([content], { type: mime }));
      await chrome.downloads.download({ url, filename: dir + filename, saveAs: false });
    };

    let saved = 0;

    if (document.getElementById("optHtml").checked) {
      await save(YReport.buildReport(meta, all), `raport.html`, "text/html;charset=utf-8");
      log(`✔ raport.html — grafice si tabele`, "ok");
      saved++;
    }

    if (document.getElementById("optMd").checked) {
      await save(YReport.buildMarkdown(meta, all), `date-pentru-ai.md`, "text/markdown;charset=utf-8");
      log(`✔ date-pentru-ai.md — date complete`, "ok");
      saved++;
    }

    if (document.getElementById("optCsv").checked) {
      for (const d of all) {
        const safe = (d.name || "raport.csv").replace(/[\\/:*?"<>|]/g, "_");
        await save(d.csv, `csv/${safe}`, "text/csv;charset=utf-8");
        saved++;
      }
      log(`✔ csv/ — ${all.length} fisiere brute`, "ok");
    }

    if (!saved) {
      log("Nu ai bifat niciun format.", "warn");
    } else {
      log("");
      log(`Salvat in Downloads/${base}/`, "ok");
    }
    secList.textContent = all.map(d => "• " + d.name.replace(/\.csv$/i, "")).join("\n");
  } catch (e) {
    log("Eroare: " + e.message, "warn");
  }
  runBtn.disabled = false;
});
