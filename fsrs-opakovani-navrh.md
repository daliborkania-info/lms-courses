# Návrh: Opakování ve stylu Anki (FSRS) pro Studium LMS

Verze 1.2 - 2026-07-12 - stav: IMPLEMENTOVÁNO (v1 dle tohoto návrhu; odchylky: odznak review-days-7 viz kap. 9, zrušené learning steps viz kap. 6)

## 1. Cíl

Přidat do LMS dlouhodobé opakování kartiček řízené algoritmem FSRS (Free Spaced Repetition Scheduler, stejný algoritmus jako v Anki od verze 23.10), a to v jedné globální frontě napříč všemi kurzy. Modul se dokončí jednou, ale jeho kartičky se pak vracejí v rostoucích intervalech přesně ve chvíli, kdy hrozí zapomenutí.

Tvrdá omezení (z tvého zadání a z architektury):

- Nesmí se ztratit profily ani postup v kurzech. Migrace je čistě aditivní, existující tabulky se nemění.
- Obsah kurzů (`courses/`) zůstává read-only a beze změny. Všech ~12 kurzů funguje tak, jak je, bez jediné úpravy.
- Žádný rebuild kvůli obsahu, mobile-first, offline za VPN (žádné CDN).

## 2. Jak to zapadá do současné architektury

Vše potřebné už existuje:

- Kartičky jsou obsahová data v `assessments/<ID>.json` (pole `flashcards`, formát `{front, back}`).
- Uživatelský stav žije v `data/lms.db` (better-sqlite3, WAL). Stav opakování je uživatelský stav, patří tam.
- Engine skenuje kurzy za běhu (`lib/content.js`, cache 15 s), takže fronta napříč kurzy je jen dotaz přes všechny kurzy.
- Gamifikace jede přes `xp_events` (`lib/gamification.js`), takže opakování se automaticky počítá do streaku a úrovní.

Přidávají se pouze: 3 nové tabulky, 1 nová knihovna, 2 API routes, 1 stránka, 1 položka v navigaci a drobnosti na Domů a ve Statistikách.

## 3. Klíčová rozhodnutí

### 3.1 Identita kartičky

Kartičky nemají ID a nechceme upravovat 12 existujících kurzů. Klíč kartičky se odvodí z obsahu:

```
card_key = courseId + "/" + moduleId + "/" + sha1(front).slice(0, 16)
```

Důsledky (záměrné, zdokumentují se v `novy-kurz-navod.md`):

- Úprava `back` (vysvětlení): historie opakování se zachová. Bezpečné vylepšování odpovědí.
- Úprava `front` (pojem): vznikne nová kartička ve stavu "nová", stará zmizí z fronty (její stav v DB zůstane, takže vrácení textu zpět ji oživí).
- Stejný `front` ve dvou modulech = dvě různé kartičky (klíč obsahuje modul). Duplicit v rámci jednoho modulu se deduplikují samy.

### 3.2 Plánovač: knihovna ts-fsrs

- `ts-fsrs` je referenční JS implementace od open-spaced-repetition (autoři FSRS), implementuje aktuální FSRS-6, licence MIT, žádná runtime závislost, vyžaduje Node >= 20.
- Dockerfile enginu staví na `node:20-bookworm-slim`, takže požadavek je splněn bez změny image.
- Instalace `npm install ts-fsrs`, funguje offline (žádné CDN), balí se do standalone buildu Nextu jako každá jiná závislost.
- Použijeme výchozí parametry FSRS-6 a `request_retention = 0.9` (cíl: 90% pravděpodobnost vybavení v okamžiku opakování). Výchozí parametry jsou trénované na stovkách milionů reálných opakování a pro start jsou víc než dobré.
- Záložní varianta, kdyby knihovna z jakéhokoli důvodu nevyhověla: FSRS formule se dají napsat ručně (~150 řádků), datový model níže na tom nic nemění.

### 3.3 Kdy kartička vstupuje do učení

Kartičky modulu se stanou "nové" (kandidáti na učení) v okamžiku, kdy má profil u modulu záznam v `progress`. Tím se automaticky řeší i tvůj stav "rozestudované a nestudované kurzy":

- Moduly, které už máš dokončené, dodají kartičky hned po nasazení (zpětné načtení je jen "projdi progress a založ karty", nic víc).
- Nestudované moduly a zamčené kurzy do fronty nic nesypou, dokud je nedokončíš.

Aby zpětné načtení nezavalilo první dny, platí denní limit nových kartiček (výchozí 15/den, nastavitelné per profil). Kartičky k zopakování (due) limit nemají - jejich počet drží na uzdě samotný FSRS.

### 3.4 Bezpečnost dat a migrace

- Migrace = pouze `CREATE TABLE IF NOT EXISTS` pro 3 nové tabulky ve stávajícím `getDb()`. Tabulky `profiles`, `progress`, `xp_events`, `badges` se nedotknou ani jedním ALTER.
- Před nasazením jednorázová záloha: `docker compose stop lms && cp data/lms.db data/lms.db.bak-2026-07-XX && docker compose up -d` (zastavení kvůli WAL, ať je záloha konzistentní).
- Rollback = nasadit předchozí image; nové tabulky starému kódu nevadí, může je ignorovat. Případně je lze i smazat.

## 4. Datový model

```sql
CREATE TABLE IF NOT EXISTS review_cards (
  profile_id  INTEGER NOT NULL,
  card_key    TEXT    NOT NULL,   -- courseId/moduleId/hash16(front)
  course_id   TEXT    NOT NULL,
  module_id   TEXT    NOT NULL,
  state       TEXT    NOT NULL DEFAULT 'New',  -- New | Learning | Review | Relearning
  due         TEXT,               -- ISO UTC; NULL dokud je karta New a nezařazená
  card_json   TEXT    NOT NULL,   -- serializovaný ts-fsrs Card (stability, difficulty, reps, lapses...)
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  first_seen_day TEXT,            -- lokální den prvního učení (pro denní limit nových)
  PRIMARY KEY (profile_id, card_key)
);
CREATE INDEX IF NOT EXISTS idx_review_due ON review_cards (profile_id, state, due);

CREATE TABLE IF NOT EXISTS review_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id  INTEGER NOT NULL,
  card_key    TEXT    NOT NULL,
  rating      INTEGER NOT NULL,   -- 1 Znovu, 2 Těžké, 3 Dobré, 4 Snadné
  log_json    TEXT    NOT NULL,   -- serializovaný ts-fsrs ReviewLog
  reviewed_at TEXT    NOT NULL DEFAULT (datetime('now')),
  day         TEXT    NOT NULL DEFAULT (date('now','localtime'))
);

CREATE TABLE IF NOT EXISTS review_settings (
  profile_id   INTEGER PRIMARY KEY,
  new_per_day  INTEGER NOT NULL DEFAULT 15,
  xp_daily_cap INTEGER NOT NULL DEFAULT 40
);
```

Poznámky:

- `card_json` nese kompletní FSRS stav (stability, difficulty, reps, lapses, learning_steps...). Ukládá se celý objekt, aby upgrade ts-fsrs nikdy nerozbil data; `state` a `due` jsou vytažené do sloupců jen kvůli dotazům.
- `review_log` je surovina pro budoucí optimalizaci parametrů FSRS přesně na tvoji paměť (oficiální optimizer umí import historie). Nic nemaže, jen roste; při ~50 opakováních denně je to pár MB za roky.
- Den (`day`, `first_seen_day`) se počítá jako `date('now','localtime')`, stejně jako u `xp_events` - půlnoc láme den konzistentně se streakem.
- Obsah karty (front/back) se v DB neduplikuje; zdrojem pravdy zůstává `assessments/*.json`. Fronta se skládá JOINem stavu z DB a obsahu z disku.

## 5. Synchronizace karet (obsah -> DB)

Funkce `syncCards(profileId)` v novém `lib/review.js`:

1. Načti `progress` profilu (seznam dokončených course/module dvojic).
2. Pro každý dokončený modul načti `flashcards` z assessmentu (přes existující `getModule`, respektive lehkou variantu čtoucí jen assessment).
3. Pro každou kartičku spočítej `card_key` a proveď `INSERT OR IGNORE` do `review_cards` se `state='New'` a `card_json = createEmptyCard()`.

Kdy se volá:

- Při `GET /api/review/queue` (líná synchronizace; při ~2000 kartách je to s `INSERT OR IGNORE` v transakci otázka milisekund, obsah je navíc kešovaný).
- Po `POST /api/progress` s akcí complete/quiz jen pro daný modul, aby se kartičky čerstvě dokončeného modulu objevily okamžitě.

Kartičky, jejichž `card_key` už v obsahu neexistuje (úprava/smazání), se z fronty přirozeně ztratí, protože fronta se skládá průnikem DB stavu a aktuálního obsahu. Jejich řádky v DB se nemažou (levné a vratné).

## 6. Fronta a plánování

Skládání fronty pro profil:

1. **Due karty:** `state != 'New' AND due <= now`, seřazené podle `due` vzestupně. Bez limitu. Řazení podle `due` přirozeně míchá kurzy.
2. **Nové karty:** `state = 'New'`, jen do naplnění denního limitu (`new_per_day` minus počet karet s `first_seen_day = dnes`). Vybírají se round-robin napříč kurzy (ať zpětné načtení nevysype nejdřív celý jeden kurz), uvnitř kurzu podle pořadí modulů.
3. Pořadí ve frontě: nejdřív due, pak nové.

Odpověď na kartu (`rating` 1-4) se zpracuje serverově:

```js
const f = fsrs(generatorParameters({
  enable_fuzz: true,
  enable_short_term: false,
  learning_steps: [],
  relearning_steps: []
}));
const { card: next, log } = f.next(card, new Date(), rating);
```

`enable_fuzz` lehce rozptyluje intervaly, aby se dávky karet neshlukovaly do stejných dnů.

**Změna v 1.2 (2026-07-12):** learning steps jsou vypnuté. S výchozími kroky (1m/10m) karta ve stavu Learning nemohla opustit rozjetou dávku: "Těžké" opakovalo stále stejný krok (~6 min, donekonečna), "Dobré" potřebovalo dva průchody, a requeue pravidlo "due do 30 minut" ji pokaždé vrátilo hned na konec fronty - jediná cesta ven bylo "Snadné". Nově s `enable_short_term: false` plánuje každé hodnocení minimálně ~1 den dopředu a z dávky kartu odstraní. Jedinou výjimkou je "Znovu" (rating 1): server vrací `requeue` právě a jen pro něj a klient kartu vrátí na konec aktuální dávky k okamžitému přezkoušení (tlačítko ukazuje "hned" místo intervalu). Když uživatel seanci opustí po "Znovu", karta se vrátí podle FSRS (~24 h) - přijatelný kompromis. Stávající karty ve stavu Learning/Relearning migraci nepotřebují, nový scheduler je při dalším hodnocení normálně převede do Review.

## 7. API

**`GET /api/review/queue?profile=ID`** - provede sync, vrátí:

```json
{
  "counts": { "due": 12, "newToday": 7, "newRemaining": 8, "doneToday": 23 },
  "queue": [
    {
      "cardKey": "delegovani/D01/a1b2c3d4e5f60718",
      "front": "Fixed vs. recurring cost v delegování",
      "back": "Zaučení = jednorázová investice...",
      "courseId": "delegovani", "courseTitle": "Delegování...", "courseIcon": "🤝",
      "moduleId": "D01", "state": "Review"
    }
  ],
  "nextDueAt": "2026-07-11T06:12:00Z"
}
```

`nextDueAt` slouží pro hlášku u prázdné fronty ("další opakování zítra ráno").

**`POST /api/review/answer`** - `{ profileId, cardKey, rating }`:

1. Načte kartu, zavolá `f.next`, uloží nový `card_json`, `state`, `due`, u nové karty vyplní `first_seen_day`.
2. Vloží `review_log`.
3. Přidělí XP (viz níže) přes existující `addXp`, vyhodnotí odznaky.
4. Vrátí `{ scheduledDays, counts, xp, level, streak, newBadges }`.

Pro zobrazení intervalů pod tlačítky (jako v Anki: "10 min / 1 d / 3 d / 7 d") vrací queue u každé karty i preview přes `f.repeat(card, now)` - je to čistá funkce, počítá se při skládání fronty.

## 8. UI

### 8.1 Navigace

`BottomNav.jsx`: přidat čtvrtou položku `{ href: "/opakovani", icon: "🔁", label: "Opakování" }`. Čtyři položky se na mobil vejdou (flex-1).

### 8.2 Stránka /opakovani

Nová stránka podle vzoru stávajících (useProfile, ProfilePicker, BottomNav):

- Hlavička: `K opakování 12 · Nové 8 · Dnes hotovo 23`.
- Karta vizuálně shodná se současným `Flashcards.jsx` (tap = otočení), navíc štítek `🤝 delegovani · D01` jako odkaz do modulu.
- Po otočení čtyři tlačítka v jedné řadě: `Znovu` (červená), `Těžké` (oranžová), `Dobré` (indigo), `Snadné` (zelená), pod každým predikovaný interval. Před otočením tlačítka nejsou (nutí vybavit si odpověď - to je celý trik aktivního vybavování).
- Prázdná fronta: "🎉 Hotovo. Další kartička tě čeká {nextDueAt}." plus tlačítko "Přidat dnes dalších 5 nových" (jednorázově zvedne denní limit - užitečné, ne nutné pro v1).
- XP toast recyklovaný z modulové stránky.

### 8.3 Domů a Statistiky

- Domů: nad seznam kurzů karta "🔁 Čeká na tebe X kartiček k opakování" (odkaz na /opakovani), zobrazí se jen když X > 0. Doplňuje stávající streak-nudge.
- Statistiky: sekce Opakování - celkem karet v učení, úspěšnost za posledních 30 dní (podíl ratingů >= 2), dnešní počet. Nic víc, ať stránka nebobtná.

### 8.4 Stávající Flashcards v modulu

`Flashcards.jsx` v detailu modulu zůstává beze změny jako volné listování při prvním studiu. FSRS fronta je nová, oddělená věc. (Volitelně later: tlačítko "Do opakování" u modulu, ale sync to řeší automaticky.)

## 9. Gamifikace

- **XP:** +2 XP za ohodnocenou kartu, s denním stropem `xp_daily_cap` (výchozí 40 XP/den z opakování), reason `review`. Zapisuje se do `xp_events`, takže **samotné opakování drží streak** - i den bez nového modulu je aktivní den. Strop brání farmení a drží hodnotu modulů.
- **Odznaky** (engine, do `evaluateBadges`): `review-100` "Stovka v hlavě" 🧠 (100 opakování), `review-1000` "Tisícovka opakování" 🏛️ (1000 opakování), `retention-90` "Železná paměť" 🔒 (úspěšnost >= 90 % při aspoň 200 opakováních), `review-days-7` "Týden opakování v kuse" 🧹 (aspoň jedno opakování v každém ze 7 posledních dní; původně zamýšlená "čistá fronta 7 dní" by vyžadovala denní snapshoty stavu fronty, tohle je spolehlivě dopočitatelné z logu).
- Vše sebereferenční, žádné žebříčky - v souladu s designem LMS.

## 10. Hrany a detaily

- **Více profilů:** vše je per `profile_id`, každý profil má vlastní stav i limity. Žádný vliv na ostatní.
- **Volatilní obsah:** moduly s `volatility: RYCHLA` obsahují fakta, která stárnou. V1 je nerozlišuje; jako v2 nápad lze karty z takových modulů po N měsících automaticky pozastavit. Do návrhu jen poznámka.
- **Kvízové otázky jako karty:** v2 nápad (front = otázka, back = správná odpověď + explain). Zdvojnásobilo by to počet karet, do v1 nejde.
- **Výkon:** ~1000-2000 karet, vše lokální SQLite s indexem na (profile, state, due) - jednotky ms. Sync je INSERT OR IGNORE v jedné transakci.
- **Čas:** `due` v UTC ISO (ts-fsrs pracuje s Date), "den" pro limity lokálně dle serveru (Proxmox, Praha) - konzistentní se streak logikou.
- **Undo:** v1 bez undo (Anki ho má, ale komplikuje stav). Špatný klik znamená nanejvýš o jedno opakování navíc, FSRS to srovná.

## 11. Postup implementace

1. **F1 - jádro:** `npm install ts-fsrs`; tabulky v `lib/db.js`; nový `lib/review.js` (card_key, syncCards, buildQueue, answer); routes `/api/review/queue` a `/api/review/answer`. Testovatelné přes curl.
2. **F2 - UI:** stránka `/opakovani`, položka v BottomNav, karta na Domů.
3. **F3 - gamifikace a statistiky:** XP se stropem, 4 odznaky, sekce ve Stats.
4. **F4 - dokumentace:** README (sekce Opakování), `novy-kurz-navod.md` (pravidlo o identitě kartiček: back měnit volně, front jen s vědomím resetu).

Nasazení: záloha `lms.db` (kap. 3.4), `docker compose build && docker compose up -d`. Obsahové kurzy ani data se nemění; první otevření /opakovani založí karty z už dokončených modulů.

Rozsah: zhruba 600-800 řádků nového kódu, jedna nová závislost, nula zásahů do obsahu.

## 12. Co v1 záměrně neobsahuje

Optimalizace FSRS parametrů na míru (review_log na to sbírá data, jde doplnit kdykoli), karty z kvízových otázek, undo, ruční suspend/bury, obrázky na kartách, per-kurz vypínání opakování. Všechno jde přidat později bez změny datového modelu.
