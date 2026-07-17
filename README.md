# Studium LMS - osobní e-learningový engine

Modulární "přehrávač kurzů": engine (Next.js + SQLite) je striktně oddělený od obsahu (adresář `courses/`) i od uživatelských dat (adresář `data/`). Nový kurz = nová složka, žádný rebuild.

Free k užití pod [MIT licencí](LICENSE). Návod na vytvoření vlastního kurzu (včetně postupu s AI): [docs/novy-kurz.md](docs/novy-kurz.md).

## Rychlý start (Proxmox / jakýkoli Docker host)

```bash
cd lms
docker compose up -d --build
# aplikace běží na http://<ip-serveru>:3000
```

Přes VPN pak z mobilu otevři `http://<ip-serveru>:3000`. UI je mobile-first.

## Struktura

```
lms/
├── docker-compose.yml
├── engine/            # aplikace (image se builduje z tohoto adresáře)
├── courses/           # OBSAH - mountovaný volume (read-only)
│   ├── marketing-bc/  # kurz: Bc. studium (M01-M30 + semestrální testy)
│   └── marketing-mgr/ # kurz: navazující Mgr. (M31-M50 + testy)
└── data/              # UŽIVATELSKÁ DATA - SQLite (vznikne při prvním startu)
```

- **`courses/` volume:** engine skenuje adresář za běhu (cache 15 s). Nová složka
  s `course.json` se objeví v nabídce bez restartu i bez rebuildu.
- **Řazení kurzů na Domů (per profil):** nejdřív zahájené nedokončené kurzy
  (první je ten nejdéle netknutý, poslední ten s nejčerstvější aktivitou),
  pak nezahájené v původním pořadí, dokončené úplně na konci. Aktivita = práce
  s modulem (dokončení nebo kvíz, i opakovaný); opakování kartiček pořadí nemění.
- **`data/` volume:** `lms.db` (profily, postup, XP, streaky, odznaky) přežije
  update image i restart. Zálohuj prostým zkopírováním souboru.

## Formát kurzu (pro přidávání obsahu)

> **Kompletní postup vytvoření nového kurzu krok za krokem: [docs/novy-kurz.md](docs/novy-kurz.md)**
> (struktura, course.json, moduly, kvízy a kartičky, obrázky, validace). Níže jen rychlý přehled.

```
courses/<id-kurzu>/
├── course.json          # manifest: název, semestry, pořadí modulů, odznaky
├── modules/<ID>.md      # obsah modulu: YAML frontmatter + Markdown (+ Mermaid)
├── assets/              # volitelné: SVG/PNG obrázky kurzu
└── assessments/<ID>.json  # volitelné: {"quiz":[...], "flashcards":[...]}
```

- **Obrázky v modulech:** `![popisek](assets/nazev.svg)` - relativní cesta `assets/...`
  se přepíše na `/api/assets/<id-kurzu>/...` (route má ochranu proti path traversal,
  cache 5 min). Popisek z altu se zobrazí pod obrázkem, kliknutí otevře stejný
  pinch-zoom lightbox jako u Mermaid diagramů. Vzor: kurz `rubikova-kostka`
  (24 SVG, generátor `tools/gen_rubik_*.py` + `tools/rubiklib.py` - simulátor
  kostky, izometrický pohled i pohled shora se šipkami permutací).

Frontmatter modulu (povinná pole):

```yaml
---
id: "M01"
title: "Název modulu"
semester: 1
order: 1
type: "module"        # module | exam
minutes: 20           # odhad času
difficulty: 2         # 1-5
xp: 100               # XP za dokončení
prerequisites: []     # ID modulů, které musí být hotové (zamykání)
volatility: "STABILNI" # STABILNI | STREDNI | RYCHLA (RYCHLÁ se zvýrazní)
---
```

Kvíz: `{"q":"otázka","options":["a","b","c","d"],"correct":1,"explain":"..."}`.
Flashcard: `{"front":"pojem","back":"vysvětlení"}`.

## Opakování (FSRS, styl Anki)

Záložka **🔁 Opakování** drží jednu frontu kartiček napříč všemi kurzy, plánovanou
algoritmem FSRS-6 (knihovna `ts-fsrs`, stejný algoritmus jako v Anki). Detailní
návrh: `fsrs-opakovani-navrh.md`.

- Kartičky modulu vstupují do učení dokončením modulu (záznam v `progress`).
- Nové kartičky: max 15/den (tabulka `review_settings`, sloupec `new_per_day`);
  kartičky k zopakování limit nemají. Tlačítko na prázdné frontě přidá
  jednorázově 5 nových navíc.
- Hodnocení: Znovu / Těžké / Dobré / Snadné (FSRS rating 1-4), pod tlačítky je
  predikovaný příští interval.
- Identita kartičky = `courseId/moduleId/sha1(front)`. Úprava `back` zachová
  historii, úprava `front` kartičku resetuje jako novou. Obsah kurzů se kvůli
  opakování nijak nemění.
- Stav žije v `lms.db` (tabulky `review_cards`, `review_log`, `review_settings`),
  migrace je čistě aditivní. `review_log` sbírá kompletní historii pro případnou
  budoucí optimalizaci FSRS parametrů na míru.

## Gamifikace

- **XP:** modul = `xp` z frontmatteru; kvíz = bonus až 50 XP podle skóre
  (opakování kvízu přidá jen zlepšení - žádné farmení).
- **Úrovně:** úroveň n vyžaduje n² x 100 XP.
- **Streak:** dny s aspoň jednou aktivitou; drží se, dokud nevynecháš celý den.
  Opakování kartiček se počítá jako aktivita - streak jde udržet i bez nového modulu.
- **XP za opakování:** +2 XP za kartičku, strop 40 XP/den (`review_settings.xp_daily_cap`).
- **Odznaky:** z manifestu kurzu (dokončený semestr, celý kurz) + engine
  (první modul, streak 3/7/30, bezchybné kvízy, 100/1000 opakování,
  úspěšnost >= 90 % při 200+ opakováních, 7 dní opakování v kuse).

## Vývoj bez Dockeru

```bash
cd engine
npm install
npm run dev   # čte ../courses a zapisuje ../data
```

## Poznámky k provozu

- Určeno pro provoz za VPN - žádná autentizace, profily jsou "Netflix-style".
- Mermaid diagramy se renderují v prohlížeči (npm balíček, funguje offline).
- Healthcheck: `GET /api/courses` vrací 200 + JSON.
- Update enginu: `docker compose build && docker compose up -d` - data i kurzy zůstávají.
