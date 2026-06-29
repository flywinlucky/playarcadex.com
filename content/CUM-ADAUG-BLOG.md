# Cum adaugi un articol nou pe blog

Sistemul de blog funcționează ca paginile de joc: pui un fișier, rulezi build-ul, gata.

## Pași

1. Creează un fișier nou în `content/blog/`, de exemplu:
   `content/blog/numele-articolului.md`
   (Numele fișierului devine URL-ul: `/blog/numele-articolului/`. Folosește doar
   litere mici, cifre și cratime — fără spații sau diacritice.)

2. La începutul fișierului pui "frontmatter" — datele articolului — între `---`:

   ```
   ---
   title: Titlul articolului care apare pe pagina
   description: Meta description pentru Google, ~155 caractere. Important pentru SEO.
   date: 2026-07-15
   tags: News, Steam, Guide
   cover: /img/blog/poza.jpg
   ---
   ```

   - `title` și `description` sunt obligatorii (description = ce apare în Google).
   - `date` — formatul `AAAA-LL-ZZ`. Articolele se sortează automat, cel mai nou primul.
   - `tags` — opțional, separate prin virgulă.
   - `cover` — opțional. Pui o imagine în `static/img/blog/` și o referențiezi aici.
     Dacă lipsește, cardul afișează o iconiță 📰.
   - `draft: true` — opțional. Dacă îl pui, articolul NU se publică (util ca să
     lucrezi la el fără să apară pe site).

3. Sub frontmatter scrii articolul în Markdown:

   ```
   ## Subtitlu (apare ca H2, bun pentru SEO)

   Paragraf normal. Poți pune **text îngroșat**, *italic* și
   [link către un joc](https://playarcadex.com/game/slug/).

   - element listă
   - alt element

   ### Sub-subtitlu (H3)

   > Citat, dacă vrei.
   ```

4. Rulează build-ul:
   ```
   node build.js
   ```
   Articolul apare automat la `/blog/slug/`, în pagina `/blog/`, în sitemap.xml,
   și primește schema SEO (BlogPosting) + og:type=article. Apoi push pe GitHub.

## Sfaturi SEO

- Pune cuvinte-cheie reale în `title` și în primul paragraf (ce caută lumea pe Google).
- Linkează către jocuri și categorii reale de pe site (linkuri interne = bun pentru SEO).
- Dacă scrii despre un joc care NU e pe site (gen un joc Steam), linkează spre sursa
  oficială și spune clar că nu e jucabil pe site — ca să nu induci userii în eroare.
- Articole "top săptămânal" trebuie chiar actualizate; dacă nu ții ritmul, scrie
  articole care rămân relevante luni întregi (ghiduri, "alternative gratis la X").
