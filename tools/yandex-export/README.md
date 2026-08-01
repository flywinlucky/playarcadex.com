# Yandex Games — raport de metrici

Extensie Chrome care aduna **toate** graficele din consola Yandex Games si
genereaza **un singur fisier HTML** cu grafice, KPI-uri, tabele si datele brute.

Fara zeci de CSV-uri imprastiate prin Downloads: datele sunt capturate in
memorie si comprimate intr-un raport unic, gata de citit sau de dat unui AI
spre analiza.

---

## Instalare (o singura data)

1. Chrome → `chrome://extensions`
2. Porneste **Developer mode** (dreapta sus)
3. **Load unpacked** → alege folderul `tools/yandex-export/extension`
4. Click pe iconita de puzzle 🧩 din bara Chrome → fixeaza („pin") extensia

## Folosire

1. Deschide consola jocului:
   `https://games.yandex.ru/console/application/<ID>#metrics/game`
2. **Alege perioada** dorita (se captureaza exact ce e configurat pe ecran)
3. Click pe iconita extensiei → **Genereaza raportul**
4. Extensia trece singura prin cele trei sectiuni:
   - Product metrics (`#metrics/game`)
   - Monetization metrics (`#metrics/adv`)
   - Performance metrics (`#metrics/performance`)
5. Se descarca in `Downloads/yandex-<ID>-<data>/`:

```
yandex-547145-2026-08-01/
├── raport.html          ← grafice + tabele, pentru citit
├── date-pentru-ai.md    ← toate datele, complete, pentru analiza AI
└── csv/                 ← optional: fisierele brute, separat
    ├── Rating.csv
    └── ...
```

Bifezi in extensie ce formate vrei. Implicit: HTML + Markdown.

Pentru un al doilea joc, deschide consola lui si repeta — raportul e per aplicatie.

## Ce format pentru ce

| Fisier | Cand il folosesti |
|---|---|
| `raport.html` | Vrei sa te uiti tu: grafice, KPI-uri, tabele. Se deschide offline. |
| `date-pentru-ai.md` | Il dai unui AI spre analiza. Contine **toate** datele, netrunchiate, cu un cuprins care descrie fiecare set si coloanele lui. Blocuri ```csv — compacte si lipsite de ambiguitate. |
| `csv/*.csv` | Vrei sa le procesezi in Excel / script propriu. |

## Ce contine raportul HTML

- Antet cu ID-ul aplicatiei, perioada si data generarii
- Cuprins cu linkuri catre fiecare set de date
- Pentru fiecare grafic:
  - **KPI-uri** (total pentru volume, medie pentru rate/pozitii/CPM)
  - **Grafic**: linie pentru serii temporale, bare pentru categorii
  - **Tabel** de date (pliabil)
  - **CSV brut** (pliabil) — datele exacte, daca vrei sa le procesezi altfel

Raportul e complet auto-continut: fara librarii, fara fonturi externe, fara
requesturi. Il poti deschide oricand, offline, sau trimite ca atasament.

---

## Cum functioneaza (si de ce nu se umple Downloads)

Butonul „Download graph data in .csv" din consola construieste un `Blob` si il
descarca printr-un `<a download>`. Extensia intercepteaza temporar
`URL.createObjectURL` si `HTMLAnchorElement.click`, ia continutul CSV **in
memorie** si suprima descarcarea reala. La final restaureaza tot ce a modificat.

Are acces **doar** la `games.yandex.ru` (declarat in `manifest.json`) si nu
contine nicio adresa externa — datele nu pot pleca din browser.

## Daca nu captureaza nimic

Yandex isi poate schimba interfata. In ordine:

1. Verifica ca esti pe consola jocului si ca graficele s-au randat.
2. Daca extensia zice „N grafice, dar 0 capturate", mecanismul de download s-a
   schimbat — ajusteaza interceptarea din `popup.js` (`captureCsvInPage`).
3. Daca zice „niciun grafic gasit", s-a schimbat butonul — ajusteaza
   selectorul din acelasi fisier.

### Varianta de rezerva: descarcare clasica

Daca interceptarea nu merge, folosesti metoda veche (descarca fisierele
separat, apoi le unesti):

- `grab-csv.js` — lipeste in `F12` → Console (Chrome cere intai sa scrii
  `allow pasting`), sau
- `bookmarklet.txt` — pune randul `javascript:...` ca URL al unui bookmark

apoi:

```bash
node merge-csv.js          # uneste CSV-urile din Downloads intr-un .md
node merge-csv.js --all    # toate CSV-urile, fara filtru de timp
node merge-csv.js --help   # vezi optiunile in capul fisierului
```

## Fisiere

| Fisier | Rol |
|---|---|
| `extension/` | extensia Chrome (varianta recomandata) |
| `extension/report.js` | generatorul de HTML: parsare CSV, grafice SVG, layout |
| `extension/popup.js` | orchestrare: navigare intre sectiuni + capturare |
| `grab-csv.js` | rezerva: script de consola, descarcare clasica |
| `bookmarklet.txt` | rezerva: acelasi lucru, ca bookmark |
| `merge-csv.js` | rezerva: uneste CSV-uri descarcate intr-un singur Markdown |

Pentru `merge-csv.js` iti trebuie Node.js. Extensia nu are nevoie de nimic.
