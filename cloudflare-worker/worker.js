/**
 * PlayArcadeX Trending API — Cloudflare Worker (plan gratuit)
 * ----------------------------------------------------------
 * Endpoints:
 *   POST /hit   body: {"slug":"moto-x3m"}   -> incrementeaza contorul jocului
 *   GET  /top                                -> top 12 jocuri: [{"slug":"...","hits":123}, ...]
 *
 * SETUP (5 minute, gratuit):
 *  1. Cont gratuit pe https://dash.cloudflare.com
 *  2. Workers & Pages -> Create Worker -> numeste-l "pax-trending" -> Deploy
 *  3. Edit code -> sterge tot si lipeste acest fisier -> Deploy
 *  4. In pagina workerului: Settings -> Bindings -> Add -> KV Namespace
 *     - Variable name:  TRENDS   (exact asa!)
 *     - Creezi un namespace nou, ex. "pax-trends"
 *  5. Copiezi URL-ul workerului (ex. https://pax-trending.USERUL-TAU.workers.dev)
 *     si il pui in build.js la constanta TRENDING_API, apoi push pe GitHub.
 *
 * Note:
 *  - Plan gratuit: 100.000 requesturi/zi — mai mult decat suficient la inceput.
 *  - Scorurile se "racesc" treptat (decay zilnic) ca trendingul sa reflecte
 *    ce e popular ACUM, nu istoric total.
 */

const ALLOWED_ORIGIN = "https://playarcadex.com";
const TOP_N = 12;
const DECAY_PER_DAY = 0.85; // scorul scade 15%/zi -> trending mereu proaspat

const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

async function loadCounts(env) {
  const raw = await env.TRENDS.get("counts");
  const data = raw ? JSON.parse(raw) : { updated: Date.now(), scores: {} };
  // decay proportional cu timpul trecut
  const days = (Date.now() - data.updated) / 86400000;
  if (days > 0.04) { // aplica decay doar daca a trecut > ~1h
    const f = Math.pow(DECAY_PER_DAY, days);
    for (const k in data.scores) {
      data.scores[k] *= f;
      if (data.scores[k] < 0.5) delete data.scores[k];
    }
    data.updated = Date.now();
  }
  return data;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    if (req.method === "POST" && url.pathname === "/hit") {
      let slug;
      try {
        const body = await req.json();
        slug = String(body.slug || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 90);
      } catch (e) { /* ignore */ }
      if (!slug) return json({ ok: false }, 400);

      const data = await loadCounts(env);
      data.scores[slug] = (data.scores[slug] || 0) + 1;
      await env.TRENDS.put("counts", JSON.stringify(data));
      return json({ ok: true });
    }

    if (req.method === "GET" && url.pathname === "/top") {
      const data = await loadCounts(env);
      const top = Object.entries(data.scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_N)
        .map(([slug, hits]) => ({ slug, hits: Math.round(hits) }));
      return json(top);
    }

    return json({ error: "Not found" }, 404);
  },
};
