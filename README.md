# 🎮 PlayArcadeX

Portal de jocuri web gratuit (stil CrazyGames), 100% static — perfect pentru **GitHub Pages**.
Jocurile vin din feed-ul partener **GameMonetize** și sunt integrate prin iframe.

## Catalogul de jocuri — curatorie PREMIUM (manual)

Baza de jocuri (`data/games.json`) e o **curatorie premium** construită din listele
de top ale GameMonetize, nu tot catalogul la grămadă. Fetch-ul automat e
**dezactivat** ca să protejeze această bază.

### Cum împrospătezi catalogul premium
1. Mergi la **https://gamemonetize.com/rss-builder**
2. Generează liste JSON cu `Type: HTML5` și `Popularity:` pe rând —
   **Best Games, Hot Games, Exclusive, Editor's Picks, Most Popular** (Items: 100)
3. Salvează fiecare ca `.txt` într-un folder (ex. `premium-feeds/`)
4. Rulează merge-ul (deduplică + scor de calitate):
   ```
   node merge-premium.js premium-feeds
   node build.js
   ```
5. Verifică local cu `npx serve dist`, apoi `git commit` + `git push`

Algoritmul de calitate: fiecare listă are o greutate (Editor's Picks cea mai
mare), iar jocurile care apar în **mai multe liste** primesc scor cumulat —
cele mai bune ajung Featured pe homepage și primele în fiecare categorie
(stil CrazyGames/Yandex).

> `fetch-games.js` rămâne în proiect ca alternativă pentru fetch automat din
> toate categoriile, dar nu e folosit în workflow (l-am dezactivat ca să nu
> suprascrie baza premium).

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

## Personalizare & Trending

- **✨ Recommended for You** — site-ul învață local (în browserul fiecărui user,
  fără cont, fără tracking pe server) ce categorii joacă: vizita pe pagina unui
  joc = +1 punct, apăsarea Play = +3 puncte pentru categoria respectivă.
  Pe homepage apare automat o secțiune cu jocuri din categoriile preferate,
  iar **secțiunile de categorii se reordonează** după interesul fiecărui user —
  o fată care joacă Girls vede Girls primele; un fan Racing vede Racing primul.
- **📈 Trending Now** (global, pe click-uri reale) — necesită contorul gratuit
  din `cloudflare-worker/worker.js`. Instrucțiunile pas-cu-pas sunt în
  comentariul din fișier (5 minute). După deploy, pui URL-ul workerului în
  `build.js` la `TRENDING_API` și dai push. Până atunci secțiunea stă ascunsă
  și site-ul merge normal. Scorurile au decay zilnic (-15%), deci trendingul
  arată ce e popular acum, nu suma istorică.

## Funcții de retenție (stil CrazyGames)

- **Recently Played** — jocurile jucate apar automat pe homepage (localStorage)
- **Favorites ❤** — buton de inimă pe fiecare pagină de joc + secțiune pe homepage
- **Random Game 🎲** — buton în header, te duce la un joc aleatoriu
- **New Games 🆕** — cele mai noi jocuri din feed, pe homepage
- **All Games 📚** — catalog complet A-Z la `/games/`
- **Share social** — Facebook, X, WhatsApp, Telegram + copy link pe fiecare joc
- **PWA** — site instalabil pe telefon/desktop (manifest + service worker care
  cache-uiește doar CSS/JS/imagini; paginile rămân mereu fresh de pe rețea)

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

