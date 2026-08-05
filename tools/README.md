# 🔧 Generator surse jocuri — GameMonetize feed parser

Script Python care ia feed-urile GameMonetize (PC + Mobile), le parsează,
curăță, dedupliceză și le formatează în format compatibil cu `data/games.json`.

## Instalare dependențe

```
pip install -r requirements.txt
```

(Scriptul merge și fără `requests` — cade automat pe `urllib` din standard library.)

## Folosire

1. Linkurile tale sunt deja puse în script (lista `FEEDS`):
   - **PC games:** `https://gamemonetize.com/feed.php?format=0&page=1`
   - **Mobile games:** `https://gamemonetize.com/feed.php?format=0&platform=1&page=1`

2. Rulează:
   ```
   python3 generate_sources.py
   ```
   sau cu mai multe pagini:
   ```
   python3 generate_sources.py --pages 5
   ```

3. Rezultatul apare în folderul `sources/`:
   - `pc_games.json` — jocuri PC, formatate, sortate (cele bune primele)
   - `mobile_games.json` — jocuri Mobile, formatate
   - `all_games.json` — ambele combinate, deduplicat global
   - `by_category.json` — grupate pe categorie
   - `by_publisher.json` — grupate pe publisher
   - `report.txt` — câte jocuri, distribuția pe categorii

## Ce face automat

- **Parsează** JSON-ul din feed (cu reparare dacă vine stricat)
- **Curăță** HTML, entități (`&mdash;` → `—`), spații multiple
- **Generează slug** URL-friendly identic cu site-ul
- **Detectează orientarea** (landscape/portrait/adaptive) din dimensiuni
- **Dedupliceză** (în aceeași platformă + global, PC are prioritate)
- **Sortează** pe scor (categorii prioritare + descrieri bogate urcă sus)
- **Adaugă** `platform` ("pc"/"mobile") și `publisher` pentru filtrare
- **Filtrează** jocurile gunoi (titluri goale, fără URL/thumb)

## Integrare

După ce rulezi scriptul, ai 2 opțiuni:
1. **Trimite fișierele lui Claude** pentru integrare în `data/games.json`
2. **Folosește admin panel** (tab Import) — trage fișierele JSON direct acolo

Câmpurile `platform` și `publisher` sunt extra față de games.json — sunt
opționale și pot fi păstrate (pentru filtrare viitoare) sau ignorate la integrare.
