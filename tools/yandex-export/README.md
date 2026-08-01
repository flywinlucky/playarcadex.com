# Export metrici din Yandex Games Console

Descarca **toate** graficele ca CSV dintr-o data (in loc sa apesi butonul de
download pe fiecare grafic) si le uneste intr-un singur fisier, usor de dat
unui AI spre analiza.

Merge la fel de bine si pentru **Google Search Console** sau orice alt dashboard
care exporta CSV — pasul 2 (merge) nu e legat de Yandex.

---

## Pasul 1 — descarca CSV-urile

1. Deschide pagina de metrici a jocului tau:
   `https://games.yandex.ru/console/application/<ID>#metrics/game`

2. **Alege perioada si filtrele dorite.** Scriptul descarca exact ce e afisat
   pe ecran — daca vrei 3 luni, seteaza 3 luni inainte sa rulezi.

3. Apasa `F12` → tab-ul **Console**.

4. Deschide `grab-csv.js`, copiaza tot continutul, lipeste-l in consola, Enter.

5. Chrome cere o data **„Allow multiple downloads"** → apasa **Allow**.

Scriptul trece singur prin tab-urile de metrici (Product / Monetization /
Performance) si apasa fiecare buton de download. Vezi progresul in consola.

> Scriptul ruleaza local, in sesiunea ta, si doar apasa butoane care oricum
> exista in pagina. Nu trimite nimic nicaieri.

## Pasul 2 — uneste-le intr-un singur fisier

```bash
node merge-csv.js
```

Ia CSV-urile din `Downloads` (ultimele 24h) si scrie `yandex-raport.md` —
un singur fisier Markdown cu cate o sectiune si un tabel per raport.

### Optiuni

| Comanda | Ce face |
|---|---|
| `node merge-csv.js` | Downloads, ultimele 24h (implicit) |
| `node merge-csv.js --all` | toate CSV-urile, fara filtru de timp |
| `node merge-csv.js --hours 72` | fisiere din ultimele 72h |
| `node merge-csv.js --dir "C:/alt/folder"` | alt folder sursa |
| `node merge-csv.js --out raport.md` | alt fisier de iesire |
| `node merge-csv.js --max-rows 1000` | cate randuri pastreaza per tabel (implicit 400) |

---

## Daca nu descarca nimic

- Esti pe pagina de **metrici**? (nu pe Control panel / Published)
- Graficele s-au randat? Da-i cateva secunde dupa ce se incarca pagina.
- Butoanele de download apar in coltul dreapta-sus al fiecarui grafic
  (uneori doar la hover) — daca nu le vezi deloc, Yandex a schimbat interfata
  si trebuie ajustat selectorul din `grab-csv.js` (constanta `BTN_SELECTORS`).
- Ai apasat **Allow** la „Allow multiple downloads"? Daca ai apasat Block,
  reseteaza din iconita de langa bara de adresa.

## Cerinte

Doar Node.js pentru pasul 2. Zero dependinte externe.
