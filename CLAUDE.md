# PlayArcadeX — context pentru Claude

Citeste asta inainte sa modifici ceva. Rezuma proiectul, istoricul deciziilor si
regulile pe care trebuie sa le respecti.

## Ce este

`playarcadex.com` — portal de jocuri browser gratuite. ~2.600 de jocuri luate din
feed-ul **GameMonetize** (embed prin iframe de la `html5.gamemonetize.co`).

- **Site static**, generat de `build.js` (Node, zero dependinte externe).
- Sursa: `static/` (css/js/img) + `data/games.json` + `content/blog/*.md`
- Iesire: `dist/` (sters si regenerat complet la fiecare build)
- Deploy: **GitHub Pages**, cu **Cloudflare** in fata (DNS proxiat).
- Build: `node build.js`

## Structura importanta in build.js

- `page({...})` — sablonul HTML comun (head, header, sidebar, main, footer)
- `buildHome()` / `buildGamePages()` / `buildCategoryPages()` / `buildBlog()` /
  `buildStaticPages()` / `buildSitemap()`
- `gameEditorial(g)` — genereaza descriere UNICA per joc (vezi „AdSense" mai jos)
- `mascotBand(games, label, pose)` — banda cu mascota, reutilizabila
- `PARTNERS` — lista partenerilor (pagina `/partners/`)
- `STATIC_PAGES` — About, Contact, Privacy, Terms, DMCA, Partners

## Contextul cel mai important: AdSense

Site-ul a fost **respins de AdSense** cu:
`"Google-served ads on screens with replicated content, Low value content"`

Cauza: conținutul vine dintr-un feed folosit de sute de alte site-uri (titluri si
descrieri identice), plus jocurile au ele insele reclame Google in iframe.

Ce s-a facut ca raspuns (NU strica astea):

1. **Descrieri unice pe fiecare pagina de joc** — `gameEditorial()` produce text
   variat (deschidere/mijloc/incheiere alese prin hash din slug, plus detalii din
   tag-uri). Scopul e sa NU para sablon identic. Daca modifici, pastreaza variatia.
2. **Pagini de categorie cu continut propriu** — intro, sectiune „About", FAQ cu
   schema FAQPage, plus ItemList schema.
3. **Blog editorial** — `content/blog/*.md`, 9 articole. Vezi `content/CUM-ADAUG-BLOG.md`.
   Datele publicarii sunt esalonate intentionat (nu toate in aceeasi zi) ca sa nu
   para continut produs in masa. **Nu publica 20 de articole deodata.**
4. **Blog vizibil** in sidebar-ul principal + footer + sectiune „From the Blog" pe home.

Bug istoric reparat: folderul sursa `static/` continea o copie veche a intregului
site (`static/dist`), pe care build-ul o copia in `dist/` — site-ul se auto-duplica
la URL-uri gen `/dist/game/...`. **Nu pune niciodata foldere generate in `static/`.**

## SEO — decizii luate pe baza datelor din Search Console

- Titlurile paginilor de joc: `"{Titlu} Online Free — Play Now, No Download | PlayArcadeX"`
  (tiparul „online free" e cel care aduce clicuri real, confirmat din queries).
- **Nu schimba titlurile jocurilor** (numele propriu-zis) — strica potrivirea cu
  ce cauta lumea.
- URL-uri vechi (`game.html?id=`, `/products/`, `/?category=`) → redirect 301 prin
  workerul din `cloudflare-worker/redirects.js` (citeste live `games.json`).
  Nu hardcoda slug-uri acolo.
- Statistici (iulie 2026): ~165 clicuri / 3.3K afisari pe 3 luni, in crestere.
  Cele mai slabe: paginile de categorie (pozitii mari) si piata SUA (pozitia ~36).

## Mascota

Robot-arcade minimalist, vectorial, in culorile brandului. Generata din SVG.
Poze: `static/img/mascot/mascot-{hello,happy,excited,thumbsup,point}.png`.
Folosita in: banda de recomandari (home x2, blog index), pagina 404, favicon/logo
(doar fata, in `favicon.svg` + `logo-face.svg`).

## Reguli / preferinte (respecta-le)

- **Fara `box-shadow` pe `.logo-badge`** — a fost scos intentionat.
- **Fara antena** pe iconitele de fata (`favicon.svg`, `logo-face.svg`, icon-192/512).
- Fara emoji in reclamele Google Ads (interzis de politici) — in site e ok.
- Fara `nofollow` pe linkurile din `/partners/` (sunt DoFollow intentionat), dar
  nu transforma pagina intr-o lista lunga de schimburi reciproce (risc „link scheme").
- Reclamele proprii (AdSense) sa NU fie lipite de iframe-ul jocului — risc de
  clicuri accidentale => invalid traffic => ban.
- Nu folosi imagini/iconite de jocuri care nu sunt pe site (Minecraft, Roblox etc.)
  in materiale promotionale — trademark.
- Mobil: `.row` trebuie sa aiba `touch-action: pan-x pan-y` (altfel swipe-ul
  vertical pe carduri nu deruleaza pagina — bug reparat).

## De verificat dupa orice modificare

```
node build.js
```
Apoi: linkurile interne din articole sa duca la jocuri care exista, `dist/` sa nu
contina foldere ciudate (`dist/dist`, `dist/static`), si sitemap-ul sa includa
blogul si paginile statice.
