# Ammo Tracker: Munitions-Logbuch für iPhone & iPad

## Kontext

Sportschütze möchte seinen Munitionsbestand verwalten und am Schießstand nach jedem Durchgang die verschossenen Patronen eintragen. Datenschutz hat oberste Priorität: **keine Daten verlassen das Gerät** (kein Konto, keine Cloud, kein Tracking, keine externen Anfragen). Die Optik soll ansprechend sein, mit einer Patronenabbildung pro Kaliber. Vorbilder: AmmoKeep, Ammo Log.

Es gibt keinen Mac, deshalb wird es eine **installierbare Web-App (PWA)**, die über „Zum Home-Bildschirm“ wie eine normale App startet und offline läuft. Projektordner `D:\#Claude\Projekte\Ammo Tracker` ist leer. Vorhanden: Node 24, Python 3.14, git, gh.

## Entscheidungen (vom Nutzer)

- PWA statt nativer App (kein Mac)
- Technik: **schlicht, ohne Build**: HTML/CSS/Vanilla-JS (ES-Module), IndexedDB, keine Fremdbibliotheken
- Hosting: **GitHub Pages** (nur Code, keine Daten)
- Bestand: **Kaliber → Sorten** (Hersteller, Bezeichnung, Geschossgewicht, Preis)
- Funktionen: Bestand, **Trainingsverlauf mit Statistik**, **Einkäufe & Kosten**, **Waffen mit Schusszähler**, **Mindestbestand-Warnung**
- Am Stand: **Training starten → nach jedem Durchgang Anzahl eintragen → beenden**

## Meine Annahmen (korrigierbar)

- Gängige Kaliberliste vorinstalliert (9 mm Luger, .22 lfB, .38 Spl, .357 Mag, .45 ACP, .40 S&W, 9 mm Makarov, .44 Mag, .223 Rem, .308 Win, 7,62×39, .300 BLK, 6,5 Creedmoor, .30-06, 8×57 IS, 12/70, 12/76 …), eigene Kaliber ergänzbar
- Bestand wird **aus Buchungen berechnet** (Einkäufe + Korrekturen − abgeschlossene Durchgänge), damit immer alles konsistent bleibt. Inventur-Funktion „Bestand korrigieren“ legt eine Korrekturbuchung an
- Kosten pro Schuss = gewichteter Durchschnittspreis der Sorte
- Abzug vom Bestand erst bei „Training beenden“. Laufendes Training überlebt das Schließen der App
- Optik: dunkles Design (gut am Stand, spart Akku) mit Messing-/Kupfer-Akzenten, große Tippflächen, optional helles Design
- Patronenbilder: **SVG, aus Maßen generiert** je Bauform (Pistole randlos, Revolver mit Rand, Randfeuer, Flaschenhals-Gewehr, Schrotpatrone) mit Hülsenfarbe Messing/Nickel/Stahl und Geschossform (Vollmantel, Hohlspitz, Blei, Spitz). Damit ist jedes Kaliber, auch ein eigenes, proportional richtig dargestellt
- Datensicherung: **Export/Import als JSON-Datei** (Teilen-Menü → Dateien-App), dazu eine Erinnerung, wenn länger nicht gesichert wurde. `navigator.storage.persist()` anfordern. iPhone und iPad führen getrennte Bestände (Abgleich per Datei-Import)
- Keine externen Schriftarten, CDNs oder Analytics, dazu eine strenge Content-Security-Policy (`connect-src 'none'`). Das garantiert technisch, dass nichts nach außen geht

## Bildschirme (Tab-Leiste unten)

1. **Bestand**: Karten pro Kaliber mit Patronenbild, Gesamtzahl und Warnsymbol bei Mindestbestand. Antippen zeigt die Sorten mit Bestand, Ø-Preis, Mindestbestand und Buttons „Einkauf“ und „Korrigieren“
2. **Training**: großer Button „Training starten“ (Stand optional, Waffe wählen, Sorte vorausgewählt). Läuft ein Training, gibt es den Button „Durchgang eintragen“ mit Schnelltasten 5/10/20/25/50 und Zahlenfeld, die Liste der Durchgänge (löschbar), Waffe/Sorte wechseln und „Beenden“ mit Zusammenfassung (Schuss, Kosten)
3. **Verlauf**: vergangene Trainings und Einkäufe, Statistik (Schuss pro Monat als einfaches SVG-Balkendiagramm, Kosten pro Monat, Top-Kaliber)
4. **Waffen**: Waffe mit Name, Kaliber und Schusszähler (Startwert + Durchgänge), optionales Wartungsintervall mit Hinweis
5. **Einstellungen**: Kaliber verwalten, Export/Import, Design hell/dunkel, Info zum Datenschutz

## Datenmodell (IndexedDB, Datenbank `ammo-tracker`)

- `calibers` {id, name, family, dims{caseLen, oal, rim, neck, …}, caseColor, custom}
- `loads` (Sorten) {id, caliberId, maker, name, grain, bulletType, minStock, archived}
- `purchases` {id, loadId, date, qty, totalPrice, dealer, note}
- `adjustments` {id, loadId, date, delta, note}
- `firearms` {id, name, caliberId, startCount, serviceInterval, note}
- `sessions` {id, start, end, range, status: 'active'|'done', strings:[{id, time, firearmId, loadId, qty}]}
- `meta` {schemaVersion, lastBackup}

## Dateistruktur

```
index.html, manifest.webmanifest, sw.js (Offline-Cache, versioniert)
css/app.css
js/app.js (Router, Tab-Leiste), js/db.js (IndexedDB-Wrapper),
js/model.js (reine Logik: Bestand, Ø-Preis, Statistik – testbar),
js/calibers.js (Vorgaben), js/cartridge-svg.js (Patronen-Generator),
js/backup.js (Export/Import + Validierung), js/views/*.js (je Bildschirm)
icons/ (App-Icons, Apple-Touch-Icon), tests/*.test.js (node:test)
docs/superpowers/specs/2026-11-23-ammo-tracker-design.md
```

## Umsetzung (Reihenfolge)

1. Design-Dokument nach `docs/superpowers/specs/` schreiben, `git init`, erster Commit
2. **Patronen-Generator + Stilvorschau** zuerst: eine Vorschauseite mit allen Kaliberbildern und einer Musterkarte im Browser zeigen und vom Nutzer abnehmen lassen
3. `model.js` testgetrieben (node:test): Bestandsberechnung, Ø-Preis, Training abschließen, Statistik, Import-Validierung
4. `db.js` + App-Gerüst (Tab-Leiste, Router, Safe-Area für Notch/Home-Indikator, iPad-Layout zweispaltig)
5. Bildschirme Bestand → Training → Waffen → Verlauf → Einstellungen
6. PWA: Manifest, Icons, Service Worker, CSP, `storage.persist()`
7. GitHub-Repo anlegen und auf Pages veröffentlichen, **erst nach Zustimmung des Nutzers** (veröffentlicht Code öffentlich, benötigt dessen GitHub-Konto)
8. Kurze Anleitung (README auf Deutsch): Installation auf iPhone/iPad, Sicherung

## Verifikation

- `node --test tests/` für die Logik
- Lokal `python -m http.server` + Browser-Pane mit iPhone- und iPad-Viewport: kompletten Ablauf durchklicken (Sorte anlegen → Einkauf → Training mit 3 Durchgängen → beenden → Bestand/Statistik/Waffenzähler prüfen → Export → Daten löschen → Import)
- Netzwerk-Tab prüfen: nach dem Laden keine einzige externe Anfrage; Offline-Modus: App lädt weiter
- Abschließend auf dem echten iPhone über die GitHub-Pages-Adresse installieren und im Flugmodus testen (macht der Nutzer)
