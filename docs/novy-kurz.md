# Jak vytvořit nový kurz

Engine skenuje adresář `courses/` za běhu (cache 15 s). Nová složka s validním
`course.json` se objeví v nabídce **bez rebuildu i bez restartu**. Celý kurz jsou
jen soubory: JSON manifest, Markdown moduly a volitelně kvízy/kartičky a obrázky.

## 1. Struktura složky

```
courses/<id-kurzu>/
├── course.json            # manifest: název, bloky, pořadí modulů, odznaky
├── modules/<ID>.md        # jeden soubor na modul a na blokový test
├── assessments/<ID>.json  # volitelné: kvíz + kartičky k modulu (testy je nemají)
└── assets/                # volitelné: SVG/PNG obrázky kurzu
```

**Pojmenování:** id kurzu = kebab-case slug (např. `rubikova-kostka`). ID modulů =
jedno velké písmeno + 2 číslice (`K01`...`K20`), unikátní v rámci kurzu. Blokové
testy = `B01-TEST`, `B02-TEST`, ... (typ `exam`).

**Doporučená velikost:** blok = 5 modulů + 1 blokový test. Kompaktní téma 2 bloky,
standardní kurz 3, velké kurikulum 4-6.

## 2. course.json

```json
{
  "id": "<id-kurzu>",
  "title": "<Název kurzu>",
  "description": "<1-2 věty>",
  "level": "Hobby | Profesní | Bc. | Ing.",
  "language": "cs",
  "version": "1.0",
  "icon": "🧩",
  "requires": null,
  "semesters": [
    {
      "number": 1,
      "title": "<Název bloku>",
      "modules": ["X01", "X02", "X03", "X04", "X05", "B01-TEST"]
    }
  ],
  "badges": [
    { "id": "blok-1", "title": "Blok 1: <název>", "icon": "🏅",
      "rule": { "type": "semester_complete", "semester": 1 } },
    { "id": "course-<id-kurzu>", "title": "<Absolventský odznak>", "icon": "🎓",
      "rule": { "type": "course_complete" } }
  ]
}
```

- `requires`: id jiného kurzu, který musí být dokončen dřív (jinak `null`).
- `semesters` řídí pořadí i zamykání v UI; každé ID musí mít soubor v `modules/`.

## 3. Modul (modules/X01.md)

YAML frontmatter + Markdown tělo, typicky 40-70 řádků:

```markdown
---
id: "X01"
title: "<Název modulu>"
course: "<id-kurzu>"
semester: 1
order: 1
type: "module"          # "exam" pro blokové testy (order 100 + číslo bloku)
volatility: "STABILNI"  # STABILNI | STREDNI | RYCHLA (RYCHLÁ se v UI zvýrazní)
version: "1.0"
updated: "2026-07-17"
minutes: 20             # odhad času, obvykle 20-25
difficulty: 2           # 1-5
xp: 100                 # 100-150
prerequisites: []       # ID modulů, které musí být hotové (zamykání)
---

# X01: <Název modulu>

### Cíle
Po prostudování umíš: <konkrétní schopnosti, jedna věta>.

### Klíčové koncepty
<4-6 odstavců uvozených tučným pojmem. Klíčové termíny s anglickým
ekvivalentem v závorce.>

### Aplikace do 30 dnů
<Jeden konkrétní, malý, měřitelný úkol.>

### Kontrolní otázky
1. ... 2. ... 3. ... 4. ... 5. ...

### Zdroje
Kniha: <1 kniha>. Online: <1-2 zdroje>.
```

Blokový test: stejný frontmatter (`type: "exam"`), tělo = 4 syntézové otázky
napříč blokem, bez assessments souboru.

### Diagramy a obrázky v těle modulu

- **Mermaid:** obyčejný ` ```mermaid ` fence (flowchart, mindmap, timeline...).
  Kliknutí v UI otevře lightbox s pinch-zoomem.
- **Obrázky:** `![popisek](assets/nazev.svg)` - relativní cesta `assets/...` se
  přepíše na `/api/assets/<id-kurzu>/...`. Popisek z altu se zobrazí pod
  obrázkem, kliknutí otevře stejný lightbox. Podporované formáty: svg, png, jpg,
  gif, webp. Vzor: kurz `rubikova-kostka` (generátor `tools/gen_rubik_*.py`).

## 4. assessments/X01.json (jen běžné moduly)

```json
{
  "quiz": [
    { "q": "...", "options": ["a", "b", "c", "d"], "correct": 1, "explain": "..." }
  ],
  "flashcards": [
    { "front": "pojem", "back": "vysvětlení" }
  ]
}
```

Osvědčené množství: 4 kvízové otázky + 5 kartiček na modul. `correct` je 0-based
index. Špatné možnosti věrohodné, `explain` má učit, ne jen potvrdit.

**Identita kartiček (FSRS opakování):** stav učení kartičky je klíčovaný
`courseId/moduleId/sha1(front)`. Úprava `back` zachová historii opakování,
úprava `front` kartičku resetuje jako novou. Proto: `front` piš jako stabilní
pojem/otázku, všechno co se může vyvíjet patří do `back`.

## 5. Validace před nasazením

1. `course.json` je validní JSON; každé ID v `semesters[].modules` má soubor
   v `modules/` a naopak.
2. Frontmatter každého modulu je validní YAML se všemi povinnými poli,
   `course` odpovídá názvu složky.
3. Každá položka `prerequisites` odkazuje na existující modul.
4. Každý `assessments/*.json` je validní; kvíz má 4 možnosti a `correct` 0-3.
5. Obrázkové odkazy `assets/...` mají existující soubory (a obráceně: žádné
   nevyužité assety).
6. Mermaid fence je uzavřený (sudý počet ``` v souboru).

Nasazení obsahu = nakopírovat složku do `courses/` na serveru. Žádný rebuild;
engine si změny načte do 15 sekund.
