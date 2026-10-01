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
- `semester_label` (volitelné): slovo před číslem bloku v UI, výchozí „Semestr“. Např. `"Týden"`
  pro kurz rozvržený po týdnech, blok se pak zobrazí jako „Týden 1: <název bloku>“.

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

## 6. Vytvoření kurzu s AI (kompletní postup)

Kurz je jen sada souborů, takže ho celý může napsat AI asistent. Nejlépe funguje
agentní nástroj s přístupem k souborům (Claude Code, Cowork, Cursor apod.), který
soubory rovnou založí a zvaliduje; s čistě chatovým AI to jde taky, jen soubory
kopíruješ ručně.

### Krok 1: Připrav vstupy

Dej AI k přečtení tento návod (`docs/novy-kurz.md`) a jeden existující modul jako
vzor stylu (např. `courses/rubikova-kostka/modules/K03.md`). Rozmysli si:

- **téma a cíl** - co má absolvent umět, ne jen "vědět",
- **rozsah** - kompaktní (2 bloky), standardní (3), velké kurikulum (4-6),
- **publikum** - dítě, dospělý začátečník, profesionál; jazyk a tón,
- **personalizaci** - čemu se učíš TY a k čemu to použiješ (viz krok 4).

### Krok 2: Nejdřív osnova, pak obsah

Nech AI navrhnout osnovu: bloky, seznam modulů s jednovětým popisem každého.
**Schval ji dřív, než se začne psát obsah** - oprava osnovy stojí minutu, oprava
20 hotových modulů hodiny. Chtěj po AI zdůvodnění řazení (co na čem staví) a
označení volatility u každého modulu.

### Krok 3: Výzkum před psaním

U modulů označených RYCHLA (a STREDNI tam, kde se obor hýbe) musí AI udělat
čerstvou webovou rešerši před psaním, ne psát z paměti - ceny, verze nástrojů,
doporučené zdroje a knihy se mění. Chtěj reálné, existující zdroje a ověř
namátkou, že doporučená kniha/web opravdu existuje.

### Krok 4: Generuj po dávkách a personalizuj

Obsah nech psát po blocích (5 modulů + test), ne celý kurz najednou - snáz se
kontroluje a opravuje. Kvalita stojí na dvou věcech:

1. **Aplikace na tvůj život.** Sekce "Aplikace do 30 dnů" musí mířit na tvou
   konkrétní situaci (práce, studium, rodina), ne na abstraktní cvičení. Řekni
   AI dopředu, k čemu kurz potřebuješ.
2. **Hustota, ne vata.** Chtěj "studijní konspekt": definice + proč je to
   důležité + kde to selhává. Žádné motivační fráze a vycpávky.

Pořadí souborů: `course.json` → moduly → `assessments/`. Kartičky piš podle
pravidla identity ze sekce 4 (stabilní `front`, vyvíjející se `back`).

### Krok 5: Obrázky (volitelné)

Kde text nestačí (postupy, stavy, schémata), nech AI vygenerovat SVG do
`assets/` a odkázat je z modulů. Osvědčený postup z kurzu `rubikova-kostka`:
AI napíše generátor (Python skript), který SVG vyrábí programově - diagramy
jsou pak konzistentní, opravitelné a ověřitelné (viz `tools/rubiklib.py`,
stavy kostky se počítají simulátorem místo kreslení od ruky). Jednodušší
diagramy zvládne Mermaid přímo v Markdownu bez souborů.

### Krok 6: Validace a nasazení

Nech AI projít checklist ze sekce 5 (ideálně skriptem, ne okem). Pak složku
nakopíruj do `courses/` na serveru - kurz se objeví do 15 sekund. Projdi první
dva moduly v UI na mobilu: délka, čitelnost diagramů, funkčnost kvízu.

### Startovací prompt (zkopíruj a doplň)

```text
Přečti si docs/novy-kurz.md v tomto repu a jeden vzorový modul
(courses/rubikova-kostka/modules/K03.md). Vytvoř mi nový kurz na téma: [TÉMA].

Kontext: [kdo jsem, proč se to učím, k čemu to použiju, kolik času mám].
Rozsah: [2/3/4+ bloky]. Publikum: [pro koho, jazyk, tón].

Postup: nejdřív mi ukaž návrh osnovy (bloky a moduly s jednovětým popisem
a volatilitou) ke schválení. Obsah piš až po schválení, po blocích.
U RYCHLÝCH modulů udělej před psaním webovou rešerši. Dodrž všechny
konvence a formáty z návodu a na konci spusť validaci ze sekce 5.
```

