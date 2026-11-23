# Ammo Tracker

**App öffnen:** https://dwal1n.github.io/ammo-tracker/

Munitionsbestand und Training für Sportschützen, als Web-App für iPhone und iPad.
Alle Daten bleiben auf dem Gerät: kein Konto, keine Cloud, keine Werbung, keine Statistik-Dienste.
Nach der Installation lädt die App nichts mehr aus dem Internet und darf technisch auch keine Verbindung nach außen aufbauen.

## Funktionen

- Bestand pro Kaliber mit einzelnen Sorten (Hersteller, Geschossgewicht, Preis)
- Training am Stand: starten, nach jedem Durchgang die Anzahl antippen, beenden. Erst dann wird vom Bestand abgezogen
- Einkäufe mit Preis, daraus Kosten pro Schuss und Wert des Bestands
- Packungen per Strichcode oder QR-Code scannen, Anzahl eingeben, fertig gebucht
- Abgleich zwischen iPhone und iPad per Datei (Zusammenführen)
- Waffen mit Schusszähler und Erinnerung an die Wartung
- Warnung bei Mindestbestand
- Verlauf mit Statistik (Schuss pro Monat, Kosten, meistgeschossene Kaliber)
- Patronenbilder für jedes Kaliber, realistisch oder als technische Zeichnung
- Sicherung als Datei und Wiederherstellung

## Auf dem iPhone oder iPad installieren

1. Die Adresse der App in **Safari** öffnen.
2. Auf das Teilen-Symbol tippen (Quadrat mit Pfeil nach oben, eventuell hinter „…“).
3. In der Liste ganz unten auf **Mehr** tippen, dann **Zum Home-Bildschirm** wählen und bestätigen. Tipp: Über „Aktionen bearbeiten“ lässt sich der Eintrag dauerhaft nach oben holen.
4. Die App ab jetzt über das Symbol „Munition“ starten. Sie läuft dann auch im Flugmodus.

Wichtig: Immer über das Symbol auf dem Home-Bildschirm öffnen, nicht über Safari. Safari und die installierte App haben getrennte Speicher.

## Datensicherung

Die Daten liegen nur auf dem jeweiligen Gerät. Unter **Mehr → Datensicherung** eine Sicherung erstellen und in der Dateien-App ablegen, am besten regelmäßig. Die App erinnert daran, wenn die letzte Sicherung länger als 30 Tage her ist.

Mit **Sicherung laden** lassen sich die Daten auf einem anderen Gerät (zum Beispiel dem iPad) einlesen. Achtung: Das ersetzt die Daten auf dem Zielgerät komplett.

Wird die App vom Home-Bildschirm gelöscht, sind auch ihre Daten weg.

## Für die Entwicklung

Reines HTML, CSS und JavaScript ohne Build-Schritt. Einzige Fremdbibliothek ist ZXing 0.23.0 für den Packungs-Scanner (`vendor/zxing.min.js`, Apache-2.0, Lizenz in `vendor/ZXING-LICENSE.txt`). Sie wird mit der App ausgeliefert und lädt nichts aus dem Internet.

- Lokal starten: `python -m http.server 8765` im Projektordner, dann `http://localhost:8765` öffnen
- Testrahmen mit iPhone- und iPad-Größe: `http://localhost:8765/dev/phone.html#ipad`
- Tests der Rechenlogik: `npm test`
- Vorschauseiten neu bauen: `node dev/build-preview.mjs` und `node dev/build-varianten.mjs`
- App-Icons neu bauen: `node dev/build-icons.mjs` (nutzt den installierten Edge oder Chrome)
- Nach Änderungen an App-Dateien die Nummer in `js/version.js` und `VERSION` in `sw.js` gemeinsam erhöhen, damit installierte Apps die neue Fassung laden (ein Test prüft, dass beide passen)
