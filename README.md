# 🎮 PlayArcadeX

Portal de jocuri web gratuit (stil CrazyGames), 100% static — perfect pentru **GitHub Pages**.
Jocurile vin din feed-ul partener **GameMonetize** și sunt integrate prin iframe.

## Arhitectura

```
playarcadex/
├── data/games.json        ← baza de date cu jocuri (sursa unică de adevăr)
├── fetch-games.js         ← descarcă jocurile din feed-ul GameMonetize
├── build.js               ← generatorul de site static (SSG)
├── static/                ← CSS / JS / imagini (copiate în dist la build)
├── dist/                  ← SITE-UL FINAL generat (asta se publică)
└── .github/workflows/     ← deploy automat pe GitHub Pages
```

**De ce așa?** GitHub Pages servește doar fișiere statice. Pentru SEO maxim, fiecare
joc primește **propria pagină HTML reală** (`/game/moto-x3m/`) generată la build —
Google le indexează perfect, spre deosebire de un singur `game.html?id=123`.

## Ce generează build-ul

- `index.html` — homepage cu Featured + secțiuni pe categorii
- `/game/<slug>/` — pagină per joc: iframe click-to-play, descriere, How to Play,
  jocuri similare, meta tags complete (title, description, canonical, Open Graph,
  Twitter Card) + **JSON-LD** (`VideoGame` + `BreadcrumbList`)
- `/category/<slug>/` — pagini de categorie cu `CollectionPage` schema
- `sitemap.xml` — toate URL-urile, regenerat automat
- `robots.txt`, `CNAME` (playarcadex.com), `404.html`
- `games.json` — index ușor pentru căutarea instant client-side

## Optimizări de viteză

- **Zero framework-uri** — HTML static + ~3KB de vanilla JS
- **Click-to-play**: iframe-ul jocului se încarcă DOAR după ce userul apasă Play
  (LCP rapid, nu încarci jocul degeaba)
- `loading="lazy"` pe toate thumbnail-urile, `fetchpriority="high"` pe primele
- `preconnect` la CDN-ul de imagini GameMonetize
- CSS unic, fără blocking scripts (`defer`)

## Cum lucrezi local

```bash
# 1. Descarcă jocurile reale din feed (înlocuiește sample-urile)
node fetch-games.js --pages=5     # 5 pagini x 100 jocuri

# 2. Generează site-ul
node build.js

# 3. Testează local
npx serve dist
```

## Deploy pe GitHub Pages (automat)

1. Pune tot folderul în repo-ul tău și fă push pe `main`.
2. În repo: **Settings → Pages → Source: GitHub Actions**.
3. Gata. Workflow-ul din `.github/workflows/deploy.yml`:
   - rulează la fiecare push,
   - **în fiecare luni** descarcă automat jocuri noi din feed și republică site-ul.
4. Domeniul custom: fișierul `CNAME` e generat automat cu `playarcadex.com`.
   Verifică în Settings → Pages că domeniul e setat și DNS-ul are
   `A` records spre GitHub Pages / `CNAME www → <user>.github.io`.

## După lansare (SEO checklist)

- [ ] Trimite `https://playarcadex.com/sitemap.xml` în **Google Search Console**
- [ ] Trimite și în **Bing Webmaster Tools**
- [ ] Verifică paginile cu Rich Results Test (schema VideoGame)
- [ ] Adaugă Google Analytics / Cloudflare Web Analytics dacă vrei statistici

## Personalizare

- Culori și design: `static/css/style.css` (variabilele din `:root`)
- Categorii prioritare / "profitabile": lista `PRIORITY_CATEGORIES` din `fetch-games.js`
- Jocuri featured: câmpul `"featured": true` în `data/games.json`
- Texte SEO globale: constantele de la începutul `build.js`
