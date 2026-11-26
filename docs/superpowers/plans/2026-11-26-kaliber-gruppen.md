# Hauptkaliber mit Unterarten: Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bestandsliste zeigt Hauptkaliber (Gruppe) mit Gesamtzahl, darunter Zwischensummen je Kaliber + Art; Training erlaubt verträgliche Kaliber (12/70 in 12/76, .38 Spl in .357).

**Architecture:** Gruppen, Verträglichkeit und Art-Vorschläge stehen fest in `js/calibers.js` (nach Kaliber-id, nicht in der Datenbank). Reine Rechenfunktionen in `js/model.js` bauen daraus einen Baum Block → Unterart → Sorte und prüfen die Verträglichkeit. Die Ansichten `stock.js` und `training.js` nutzen nur diese Funktionen.

**Tech Stack:** Vanilla JS (ES-Module), IndexedDB, Tests mit `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-26-kaliber-gruppen-design.md`

## Global Constraints

- Gruppe „Kaliber 12“: `c-12-70`, `c-12-76`. Gruppe „.357 Mag / .38 Spl“: `c-357`, `c-38spl`. Alle anderen Kaliber (auch eigene) sind ihre eigene Gruppe.
- Verträglich: `c-12-76` nimmt auch `c-12-70`; `c-357` nimmt auch `c-38spl`. Nicht umgekehrt.
- Neues optionales Feld `art` (String) an `loads`. Vergleich ohne Groß-/Kleinschreibung und ohne Leerzeichen am Rand. `SCHEMA_VERSION` bleibt 2.
- Art-Vorschläge: Standard, High Velocity, Subsonic, Match, Buckshot, Flintenlaufgeschoss, plus bereits benutzte Arten.
- Zwischensummen-Zeilen nur, wenn ein Block mehr als eine Unterart hat.
- Kein Mindestbestand für Gruppen; Mindestbestand bleibt pro Kaliber und pro Sorte.
- Texte in der App und im Handbuch: Deutsch, natürlich, keine Gedankenstriche (– oder —).
- Bei Auslieferung `APP_VERSION.number` in `js/version.js` und `VERSION` in `sw.js` auf 14 erhöhen, Datum 26.11.2026.
- Commits nur lokal, nicht pushen. Commit-Mail ist die eingestellte Noreply-Adresse.

## Review Focus

1. Von einer Gruppe ist nur ein Kaliber vorhanden (nur 12/70-Sorten): Block heißt dann wie das Kaliber („12/70“), nicht „Kaliber 12“. Test in Task 1.
2. Art nur durch Schreibweise verschieden („Buckshot“, „ buckshot “): landen in derselben Unterart, Anzeige nimmt die zuerst gefundene Schreibweise. Test in Task 1.
3. Umgekehrte Richtung im Training: 12/76-Sorte an einer 12/70-Waffe muss abgelehnt werden. Test in Task 1, Prüfung in Task 4.
4. Sorte, deren Kaliber gelöscht ist (`caliberById` liefert `undefined`): wird übersprungen, kein Absturz. Test in Task 1.
5. Alte Daten ohne `art` und Kaliber ohne Gruppe: Ansicht sieht aus wie Version 13 (keine Zwischenzeilen). Test in Task 1 (ein Block, eine Unterart), Sichtprüfung in Task 3.

---

### Task 1: Gruppen, Verträglichkeit und Bestandsbaum

**Files:**
- Modify: `js/calibers.js` (am Ende ergänzen)
- Modify: `js/model.js` (neue Funktionen nach `caliberTotals`)
- Test: `tests/groups.test.js` (neu)

**Interfaces:**
- Produces (`js/calibers.js`):
  - `CALIBER_GROUPS: { [caliberId]: groupId }` mit `'c-12-70','c-12-76' → 'g-12'`, `'c-357','c-38spl' → 'g-357'`
  - `GROUP_NAMES: { 'g-12': 'Kaliber 12', 'g-357': '.357 Mag / .38 Spl' }`
  - `ALSO_FITS: { 'c-12-76': ['c-12-70'], 'c-357': ['c-38spl'] }`
  - `ART_SUGGESTIONS: string[]` (Liste aus Global Constraints, in dieser Reihenfolge)
- Produces (`js/model.js`):
  - `artKey(art: string|undefined) -> string` (getrimmt, klein; leer → `''`)
  - `groupOf(caliberId: string) -> string` (Gruppen-id oder die caliberId selbst)
  - `fitsFirearm(loadCaliberId: string, firearmCaliberId: string) -> boolean` (gleich oder in `ALSO_FITS[firearmCaliberId]`)
  - `stockTree(data: {loads, purchases, adjustments, sessions}, caliberById: (id) => caliber|undefined) -> Block[]`
    - `Block = { id: string, name: string, caliberIds: string[], total: number, subs: Sub[] }`
    - `Sub = { key: string /* `${caliberId}|${artKey}` */, caliberId: string, art: string, label: string, total: number, loads: { load, qty }[] }`
    - Bestand aus `stockByLoad(data)`. Blöcke nach `total` absteigend, Subs nach `total` absteigend, Sorten in Eingabereihenfolge.
    - `name`: Gruppenname, wenn mehr als ein Kaliber der Gruppe vorkommt, sonst Kalibername.
    - `label`: Block mit mehreren Kalibern → `Kalibername` + (` ${art}` wenn Art); Block mit einem Kaliber → `art` oder, ohne Art, Kalibername.
    - `caliberIds` in Reihenfolge der Sub-Summen.

- [ ] **Step 1: Tests schreiben** in `tests/groups.test.js` mit Kalibern aus `DEFAULT_CALIBERS` (`caliberById = (id) => DEFAULT_CALIBERS.find((c) => c.id === id)`) und Bestand über `adjustments` (`{ loadId, delta }`):
  - `groupOf`: `'c-12-70'` und `'c-12-76'` → `'g-12'`; `'c-9luger'` → `'c-9luger'`.
  - `fitsFirearm('c-12-70','c-12-76') === true`, `fitsFirearm('c-12-76','c-12-70') === false`, `fitsFirearm('c-38spl','c-357') === true`, `fitsFirearm('c-357','c-38spl') === false`, `fitsFirearm('c-9luger','c-9luger') === true`.
  - Baum 12er: Sorten 12/76 (150), 12/70 Trap (200), 12/70 Skeet (50), 12/70 Art „Buckshot“ (50) und Art „ buckshot “ (30) → ein Block `{ id:'g-12', name:'Kaliber 12', total:480 }`, Subs in Reihenfolge `['12/70', '12/76', '12/70 Buckshot']` mit Summen `[250,150,80]`, Buckshot-Sub hat 2 Sorten und `art === 'Buckshot'`.
  - Nur 12/70-Sorten → Block `name === '12/70'`, `id === 'g-12'`.
  - .22 lfB mit Art „Standard“ (700) und „High Velocity“ (500) → ein Block `name '.22 lfB'`, Labels `['Standard','High Velocity']`.
  - .22 lfB ohne Art, zwei Sorten → ein Block, genau ein Sub mit `label '.22 lfB'`.
  - Sorte mit `caliberId: 'c-geloescht'` → taucht in keinem Block auf, kein Fehler.
  - Zwei Blöcke (9 mm 100, 12er 480) → Reihenfolge 12er zuerst.

- [ ] **Step 2: Tests laufen lassen, müssen scheitern**
  Run: `npm test`
  Expected: FAIL in `groups.test.js` (Exporte fehlen), alle alten Tests PASS.

- [ ] **Step 3: Konstanten in `js/calibers.js` und Funktionen in `js/model.js` umsetzen** (Signaturen wie oben; `model.js` importiert aus `./calibers.js`).

- [ ] **Step 4: Tests laufen lassen**
  Run: `npm test`
  Expected: alle PASS.

- [ ] **Step 5: Commit**
  `git add js/calibers.js js/model.js tests/groups.test.js` und Commit „Kalibergruppen, Verträglichkeit und Bestandsbaum in der Rechenlogik“.

### Task 2: Feld „Art“ an der Sorte

**Files:**
- Modify: `js/views/stock.js` (`loadFields`, `editLoad`)

**Interfaces:**
- Consumes: `ART_SUGGESTIONS` aus Task 1, `uniqueList` aus `js/ui.js`.
- Produces: gespeicherte Sorten haben `art` (getrimmter String, leer erlaubt).

- [ ] **Step 1: In `loadFields` direkt nach `name` ein Feld einfügen:** `{ name: 'art', label: 'Art', value: l.art, placeholder: 'optional, z. B. Buckshot, High Velocity', suggestions: uniqueList(S.state.loads.map((x) => x.art), ART_SUGGESTIONS), hint: 'Sorten mit gleicher Art werden im Bestand zusammengezählt.' }`
- [ ] **Step 2: In `editLoad` beim Zusammenbauen von `row` `art: (v.art || '').trim()` übernehmen.**
- [ ] **Step 3: Prüfen im Browser** (`preview_start` mit dem Eintrag aus `.claude/launch.json`): Sorte anlegen mit Art „Buckshot“, erneut öffnen, Feld zeigt „Buckshot“, Vorschläge erscheinen beim Tippen. Konsole ohne Fehler.
- [ ] **Step 4: Commit** „Sorte bekommt optionales Feld Art“.

### Task 3: Bestandsansicht mit Blöcken und Unterarten

**Files:**
- Modify: `js/views/stock.js` (`render`, `mount`, `editCaliberMin`, `actions`)
- Modify: `css/app.css` (Stil für Unterart-Zeile, bei `.loads`)

**Interfaces:**
- Consumes: `stockTree`, `isLow` (Task 1 / bestehend), `S.cart(caliber, opts, load)`.
- Produces: DOM-Attribute `data-block-total="<block.id>"`, `data-sub-total="<sub.key>"`, `data-load-qty="<load.id>"` (bleibt), Abschnitt-id `cal-<block.id>`.

- [ ] **Step 1: `render` auf `stockTree({ ...S.state, loads }, S.caliber)` umstellen.**
  - Parade: ein Eintrag pro Block, Bild `S.cart(S.caliber(block.subs[0].caliberId), { scale: 2.4 }, block.subs[0].loads[0].load)`, Zahl `block.total`, Beschriftung `block.name`, `data-id = block.id`.
  - Liste: Kopf wie bisher (große Patrone aus `subs[0]`, Name `block.name`, Gesamtzahl). Bei `subs.length > 1` vor den Sorten jeder Sub eine Zeile `.sub-row` mit kleiner Patrone (`S.cart(S.caliber(sub.caliberId), { height: 28 }, sub.loads[0].load)`), `sub.label` und `sub.total`. Bei `subs.length === 1` keine Zwischenzeile (Aussehen wie Version 13).
  - Warnung am Block: Kaliber aus `block.caliberIds` mit `isLow(caliber, Summe dieses Kalibers)` oder Sorte mit `isLow(load, qty)`. `min. X` unter der Gesamtzahl nur bei Blöcken mit einem Kaliber.
  - Name-Knopf: `data-action="editCalMin" data-id="<block.id>"`.
- [ ] **Step 2: `editCaliberMin` nimmt eine Block-id:** Kaliber über `block.caliberIds` (bei Einzelkaliber die id selbst); Fenster zeigt ein Feld `minStock_<caliberId>` pro Kaliber mit Label „Mindestbestand <Kalibername>“ und Text „Du hast insgesamt <b>X</b> Patronen <Blockname>.“; speichert jedes Kaliber einzeln wie bisher.
- [ ] **Step 3: `mount` umstellen:** Für geänderte Sorten `countUp` auf `data-load-qty`, auf `data-sub-total` der zugehörigen Sub und `data-block-total` des Blocks; alte Summen aus `before` berechnen wie bisher, nur über Sub/Block statt Kaliber. Blink auf `.badge-low` des Blocks, wenn eine Warnung gilt.
- [ ] **Step 4: CSS für `.sub-row`:** eigene Zeile im Raster von `.loads`, kleine Patrone links, Label und Zahl im Stil von `.load`, aber hervorgehoben (Fettschrift, Zahl rechtsbündig mit `tabular-nums`). Abstände an die bestehende Liste anpassen.
- [ ] **Step 5: Prüfen im Browser** mit Testdaten: 12/70 Trap, 12/70 Buckshot (Hülse Schwarz), 12/76, .22 lfB Standard + High Velocity, 9 mm ohne Art.
  Expected: Block „Kaliber 12“ mit drei Zwischenzeilen, Buckshot-Patrone schwarz; .22 lfB mit zwei Zwischenzeilen; 9 mm ohne Zwischenzeile; Parade mit einem Eintrag pro Block; Einkauf eintragen lässt Sorte, Zwischensumme und Gesamtzahl hochzählen; Mindestbestand bei „Kaliber 12“ zeigt zwei Felder. Konsole ohne Fehler. Bildschirmfoto machen.
- [ ] **Step 6: `npm test`** Expected: alle PASS.
- [ ] **Step 7: Commit** „Bestand zeigt Hauptkaliber mit Zwischensummen je Unterart“.

### Task 4: Verträgliche Munition im Training

**Files:**
- Modify: `js/views/training.js` (`guessLoad`, `choose` → `validate`)

**Interfaces:**
- Consumes: `fitsFirearm` aus Task 1.

- [ ] **Step 1: `validate` in `choose`:** Ablehnen nur noch, wenn `!fitsFirearm(S.load(v.load).caliberId, fa.caliberId)`. Meldung unverändert.
- [ ] **Step 2: `guessLoad`:** Zuletzt benutzte Sorte der Waffe wie bisher; sonst nicht ausgeblendete Sorte mit gleichem Kaliber und größtem Bestand; erst wenn keine da ist, verträgliche Sorte (`fitsFirearm`) mit größtem Bestand.
- [ ] **Step 3: Prüfen im Browser:** Waffe in 12/76 anlegen, Training starten, 12/70-Sorte wählen → wird angenommen. Waffe in 12/70, 12/76-Sorte wählen → Meldung „Diese Sorte passt nicht zum Kaliber der Waffe (12/70).“ Revolver .357 mit .38-Spl-Sorte → angenommen. Training beenden, Bestand der 12/70-Sorte sinkt.
- [ ] **Step 4: `npm test`** Expected: alle PASS.
- [ ] **Step 5: Commit** „Training erlaubt verträgliche Kaliber (12/70 in 12/76, .38 Spl in .357)“.

### Task 5: Version, Handbuch, Auslieferung

**Files:**
- Modify: `js/version.js`, `sw.js` (Version 14)
- Modify: `handbuch/handbuch.html` (Kapitel Bestand, Mindestbestand, Training)
- Modify: `dev/build-handbuch.mjs` (Beispieldaten)
- Regenerate: `handbuch/img/*.png`, `Ammo Tracker Handbuch.pdf` (lokal, liegt in `.gitignore`)
- Add: Spec und dieser Plan

- [ ] **Step 1: Version** in `js/version.js` auf `{ number: 14, date: '26.11.2026' }`, in `sw.js` `VERSION = 'ammo-v14'`. Neue Dateien gibt es nicht, die Liste im Offline-Speicher bleibt.
- [ ] **Step 2: Beispieldaten im Handbuch-Skript** um eine 12er-Gruppe ergänzen (12/70 Trap, 12/70 Buckshot mit `caseColor: 'black'`, 12/76) und bei .22 lfB eine zweite Sorte mit Art „High Velocity“ sowie Art „Standard“ an der vorhandenen.
- [ ] **Step 3: Handbuch-Text:** Kapitel Bestand: Hauptkaliber, Zwischensummen, Feld Art (mit Beispiel Kaliber 12 und .22 lfB), Buckshot über Hülsenfarbe. Kapitel Mindestbestand: bei Gruppen ein Feld pro Kaliber. Kapitel Training: 12/70 in 12/76 und .38 Spl in .357 erlaubt, nicht umgekehrt. Ohne Gedankenstriche.
- [ ] **Step 4: Handbuch bauen:** lokalen Server starten (`python -m http.server 8765 --bind 127.0.0.1` im Hintergrund), dann `node dev/build-handbuch.mjs`. Expected: neue PNGs in `handbuch/img/`, PDF erzeugt. Bilder `bestand.png` und `mindestbestand.png` ansehen.
- [ ] **Step 5: `npm test`** Expected: alle PASS (inkl. Versions- und Offline-Test).
- [ ] **Step 6: Commit** mit Spec, Plan, Version, Handbuch und Bildern: „Hauptkaliber mit Unterarten, verträgliche Munition im Training (Version 14)“. Nicht pushen.
