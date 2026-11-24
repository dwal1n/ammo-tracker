# Ammo Tracker

**App öffnen:** https://dwal1n.github.io/ammo-tracker/

Munitionsbestand und Training für Sportschützen, als Web-App für iPhone und iPad.
Alle Daten bleiben auf dem Gerät: kein Konto, keine Cloud, keine Werbung, keine Statistik-Dienste.
Nach der Installation lädt die App nichts mehr aus dem Internet und darf technisch auch keine Verbindung nach außen aufbauen.

## Funktionen

- Bestand pro Kaliber mit einzelnen Sorten (Hersteller, Geschossgewicht, Preis)
- Packungen per Strichcode oder QR-Code scannen, Anzahl eingeben, fertig gebucht
- Training am Stand: starten, nach jedem Durchgang die Anzahl antippen, beenden. Erst dann wird vom Bestand abgezogen
- Einkäufe mit Preis, daraus Kosten pro Schuss und Wert des Bestands
- Waffen mit Schusszähler und Erinnerung an die Wartung
- Warnung bei Mindestbestand, pro Kaliber (alle Sorten zusammen) oder pro Sorte
- Verlauf mit Statistik (Schuss pro Monat, Kosten, meistgeschossene Kaliber)
- Patronenbilder für jedes Kaliber, realistisch oder als technische Zeichnung
- Sicherung als Datei und Abgleich zwischen iPhone und iPad

## Auf dem iPhone oder iPad installieren

1. Die Adresse der App in **Safari** öffnen. Andere Browser und eingebaute Browser anderer Apps können nicht installieren.
2. Auf das Teilen-Symbol tippen (Quadrat mit Pfeil nach oben, eventuell hinter „…“).
3. In der Liste ganz unten auf **Mehr** tippen, dann **Zum Home-Bildschirm** wählen und bestätigen. Tipp: Über „Aktionen bearbeiten“ lässt sich der Eintrag dauerhaft nach oben holen.
4. Die App ab jetzt über das Symbol **Munition** starten. Sie läuft dann auch im Flugmodus.

Wichtig: Immer über das Symbol auf dem Home-Bildschirm öffnen, nicht über Safari. Safari und die installierte App haben getrennte Speicher.

## Erste Schritte

1. **Mehr → Meine Kaliber:** die Kaliber antippen, die du schießt. Danach zeigen alle Auswahllisten nur noch diese.
2. **Bestand füllen**, entweder per Scanner (siehe unten) oder über das **Plus** oben rechts. Das Plus legt immer eine neue Sorte an. Dort kannst du den aktuellen Bestand gleich mit eintragen.
3. **Waffen:** deine Waffen mit Kaliber anlegen. Beim Training schlägt die App dann die passende Munition vor.
4. **Mehr → Sicherung erstellen**, wenn alles erfasst ist.

Wichtig: Eine Sorte entweder beim Anlegen mit Bestand füllen **oder** per Scan Packungen buchen, nicht beides. Sonst zählt die Munition doppelt.

## Packungen scannen

1. Im **Bestand** oben auf das **Strichcode-Symbol** tippen und den Strichcode der Packung in den Rahmen halten.
2. **Beim ersten Mal** fragt die App, welche Sorte das ist und wie viele Patronen in der Packung sind. Gibt es die Sorte noch nicht, „Neue Sorte anlegen …“ wählen und oben rechts auf **Weiter** tippen.
3. **Anzahl der Packungen** eingeben (Schnellwahl 1, 5, 10, 20), wahlweise Preis pro Packung und Händler, dann **Buchen**. Mit **Buchen und weiter scannen** geht es direkt mit der nächsten Packung weiter.

Ab dem zweiten Mal erkennt die App die Packung sofort.

- **Angebrochene Packung:** oben auf **Einzelne Patronen** umschalten und die gezählte Menge eintragen. Der Preis wird anteilig berechnet.
- **Munition, die du schon länger hast:** beim Händler **Anfangsbestand** wählen. Dann zählt sie in der Statistik nicht als Ausgabe, der Preis fließt aber in die Kosten pro Schuss ein.
- **Strichcode statt QR-Code:** Manche Hersteller (z. B. Magtech) drucken auf alle Packungen denselben QR-Code. Die App lehnt ihn ab, dann einfach den Strichcode scannen.
- **Falsche Sorte erwischt:** beim Buchen auf **Andere Sorte zuordnen** tippen.
- **Kamera will nicht:** **Nummer eintippen** (die Ziffern unter dem Strichcode) oder **Foto aufnehmen**.
- **Kamera-Erlaubnis:** iOS fragt bei Web-Apps immer wieder danach. Innerhalb eines Scan-Durchgangs fragt es nur einmal. Eventuell hilft **Einstellungen → Apps → Safari → Kamera → Erlauben**.

Gelernte Packungen stehen unter **Mehr → Gelernte Packungen** und lassen sich dort ändern oder löschen.

## Bestand korrigieren

Im **Bestand** auf eine Sorte tippen. Dort gibt es **Einkauf eintragen** (Menge kommt dazu) und **Bestand korrigieren** (die tatsächlich gezählte Menge eintragen, die App gleicht aus). Fehlbuchungen lassen sich im **Verlauf** antippen, ändern oder löschen.

## Mindestbestand

Im **Bestand** auf den Kalibernamen tippen (z. B. „.308 Win“) und eine Zahl eintragen. Die App vergleicht sie mit der Gesamtzahl aller Sorten dieses Kalibers, egal von welchem Hersteller. Neben der Gesamtzahl steht dann „min. 500“, fällt die Summe darunter, wird das Kaliber rot markiert. Zusätzlich lässt sich unter **Sorte bearbeiten** eine Grenze für eine einzelne Sorte setzen. Leeres Feld heißt: keine Warnung.

## Training

**Training** öffnen, **Training starten**, Waffe und Munition wählen. Nach jedem Durchgang die Anzahl antippen. Ein falscher Durchgang lässt sich über den Papierkorb löschen. Mit **Training beenden** wird vom Bestand abgezogen. Ein laufendes Training bleibt erhalten, auch wenn die App geschlossen wird.

## Sicherung und Abgleich

Die Daten liegen nur auf dem jeweiligen Gerät. Unter **Mehr → Sicherung und Abgleich** auf **Sicherung erstellen** tippen und die Datei z. B. mit „In Dateien sichern“ ablegen oder per AirDrop verschicken. Die App erinnert daran, wenn die letzte Sicherung länger als 30 Tage her ist. Wird das Teilen-Menü abgebrochen, gilt das nicht als Sicherung.

**iPhone und iPad abgleichen:**

1. Auf dem iPhone **Sicherung erstellen** und per AirDrop ans iPad schicken.
2. Auf dem iPad **Datei laden** und **Zusammenführen** wählen.
3. Auf dem iPad **Zurückschicken** antippen und die Datei aufs iPhone schicken, dort ebenfalls zusammenführen.

Zusammenführen behält alles von beiden Geräten. Wurde derselbe Eintrag auf beiden Geräten geändert, gewinnt die neuere Fassung. Gelöschtes wird auch auf dem anderen Gerät gelöscht. **Alles ersetzen** ist nur für den Umzug auf ein neues Gerät gedacht.

Wird die App vom Home-Bildschirm gelöscht, sind auch ihre Daten weg.

## Updates

Neue Versionen kommen von selbst: App mit Internet öffnen, ein paar Sekunden warten, ganz schließen (vom unteren Rand hochwischen und die App wegwischen) und wieder öffnen. Die aktuelle Version steht ganz unten unter **Mehr**. Die Daten bleiben bei Updates erhalten. Die App zum Aktualisieren nie löschen.

## Bedienung

- Über der Tastatur erscheint eine Leiste mit **Fertig**. Tippen auf eine freie Fläche schließt die Tastatur ebenfalls.
- Unter **Mehr** lassen sich Patronenbilder (realistisch oder technische Zeichnung), helles oder dunkles Design und eigene Kaliber einstellen.
- Animationen schalten sich ab, wenn auf dem Gerät „Bewegung reduzieren“ aktiv ist.

## Für die Entwicklung

Reines HTML, CSS und JavaScript ohne Build-Schritt. Einzige Fremdbibliothek ist ZXing 0.23.0 für den Packungs-Scanner (`vendor/zxing.min.js`, Apache-2.0, Lizenz in `vendor/ZXING-LICENSE.txt`). Sie wird mit der App ausgeliefert und lädt nichts aus dem Internet.

- Lokal starten: `python -m http.server 8765` im Projektordner, dann `http://localhost:8765` öffnen
- Testrahmen mit iPhone- und iPad-Größe: `http://localhost:8765/dev/phone.html#ipad`
- Scan-Test mit Beispielfotos (Ordner `Packungen Beispiele/`, nicht im Repository): `http://localhost:8765/dev/scan-test.html`
- Tests: `npm test`
- Vorschauseiten neu bauen: `node dev/build-preview.mjs` und `node dev/build-varianten.mjs`
- App-Icons neu bauen: `node dev/build-icons.mjs` (nutzt den installierten Edge oder Chrome)
- Handbuch neu bauen: `node dev/build-handbuch.mjs` (Bildschirmfotos mit Beispieldaten nach `handbuch/img/`, dann PDF aus `handbuch/handbuch.html`; nur PDF: `… pdf`, Seitenbilder zur Kontrolle: `… vorschau`). Der lokale Server muss laufen
- Nach Änderungen an App-Dateien die Nummer in `js/version.js` und `VERSION` in `sw.js` gemeinsam erhöhen, damit installierte Apps die neue Fassung laden (ein Test prüft, dass beide passen)
