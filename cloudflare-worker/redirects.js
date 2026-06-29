/**
 * PlayArcadeX — Redirect Worker (URL-uri vechi -> URL-uri noi)
 * ===========================================================
 * Rezolva "scurgerea" de trafic: vechea schema de URL (game.html?id=...,
 * /products/..., ?category=...) inca primeste afisari in Google si da 404.
 * Acest worker face redirect 301 catre paginile noi, curate. Google
 * consolideaza pe URL-urile noi si nu mai indexeaza fantomele vechi.
 *
 * CE FACE:
 *   /game.html?id=SLUG   -> 301  /game/SLUG/      (daca jocul exista)
 *   /game.html?id=SLUG   -> 301  /games/          (daca jocul nu mai exista)
 *   /game.html           -> 301  /games/
 *   /products/orice      -> 301  /                (nu au echivalent)
 *   /?category=X         -> 301  /category/Xslug/ (daca e categorie reala)
 *   orice altceva        -> trece nemodificat catre GitHub Pages
 *
 * IMPORTANT — workerul NU stochează slug-urile hardcodat. Citeste live
 * games.json de pe site si il tine in cache 1h, deci ramane mereu corect
 * chiar daca jocurile se rotesc.
 *
 * ───────────────────────────────────────────────────────────────────────
 * SETUP (o singura data):
 *  1. Domeniul playarcadex.com trebuie sa fie pe Cloudflare:
 *       dash.cloudflare.com -> Add site -> playarcadex.com -> urmezi pasii
 *       de schimbare nameservere la registrar. DNS-ul ramane spre GitHub
 *       Pages, doar ca proxiat prin Cloudflare (norisorul portocaliu ON).
 *  2. Workers & Pages -> Create Worker -> numeste-l "pax-redirects" -> Deploy.
 *  3. Edit code -> sterge tot -> lipeste acest fisier -> Deploy.
 *  4. In worker: Settings -> Triggers (Routes) -> Add route:
 *       Route:  playarcadex.com/*       Zone: playarcadex.com
 *     (optional si www.playarcadex.com/* daca folosesti www)
 *  Gata. Nu necesita KV, nu necesita binding.
 * ───────────────────────────────────────────────────────────────────────
 */

const SITE = "https://playarcadex.com";
const GAMES_JSON = SITE + "/games.json";
const CACHE_TTL = 3600; // secunde (1h) cat tinem lista de jocuri in cache

// slugify identic cu cel din build.js, ca sa potrivim categorii
function slugify(s) {
  return String(s).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Incarca {slugs:Set, cats:Set} din games.json, cu cache pe edge.
let _mem = null;          // cache in memoria workerului (rapid)
let _memAt = 0;
async function loadIndex() {
  const now = Date.now();
  if (_mem && (now - _memAt) < CACHE_TTL * 1000) return _mem;
  try {
    const res = await fetch(GAMES_JSON, { cf: { cacheTtl: CACHE_TTL, cacheEverything: true } });
    if (!res.ok) throw new Error("games.json " + res.status);
    const arr = await res.json();
    const slugs = new Set();
    const cats = new Set();
    for (const g of arr) {
      if (g && g.slug) slugs.add(String(g.slug).toLowerCase());
      if (g && g.category) cats.add(slugify(g.category));
    }
    _mem = { slugs, cats };
    _memAt = now;
    return _mem;
  } catch (e) {
    // daca nu putem citi lista, nu blocam: redirectam "best effort" fara verificare
    return _mem || { slugs: null, cats: null };
  }
}

function redirect(to, status = 301) {
  return new Response(null, {
    status,
    headers: {
      "Location": to,
      "Cache-Control": "max-age=3600",
    },
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const idParam = (url.searchParams.get("id") || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
    const catParam = url.searchParams.get("category");

    // 1) /game.html (cu sau fara ?id=)
    if (path === "/game.html") {
      if (idParam) {
        const { slugs } = await loadIndex();
        // daca avem lista si jocul exista -> pagina lui; altfel -> /games/
        if (!slugs || slugs.has(idParam)) {
          return redirect(`${SITE}/game/${idParam}/`);
        }
        return redirect(`${SITE}/games/`);
      }
      return redirect(`${SITE}/games/`);
    }

    // 2) /products/...  -> homepage (nu au echivalent)
    if (path === "/products" || path.startsWith("/products/")) {
      return redirect(`${SITE}/`);
    }

    // 3) /?category=X  -> /category/Xslug/  (doar daca e categorie reala)
    if ((path === "/" || path === "/index.html") && catParam) {
      const cslug = slugify(catParam);
      const { cats } = await loadIndex();
      if (cslug && (!cats || cats.has(cslug))) {
        return redirect(`${SITE}/category/${cslug}/`);
      }
      // categorie necunoscuta -> homepage curat
      return redirect(`${SITE}/`);
    }

    // 4) restul -> trece nemodificat catre originea GitHub Pages
    return fetch(request);
  },
};
