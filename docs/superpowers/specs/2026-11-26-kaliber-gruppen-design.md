# Hauptkaliber mit Unterarten und passende Munition im Training

Stand: 26.11.2026, Entwurf zur Freigabe

## Worum es geht

Gewünscht wurde: In der Bestandsliste soll man pro Hauptkaliber die Gesamtzahl sehen und direkt darunter die Zwischensummen der Unterarten. Beispiele:

- **Kaliber 12:** Gesamtzahl, darunter 12/76, 12/70 und 12/70 Buckshot.
- **.22 lfB:** Gesamtzahl, darunter Standard und High Velocity.

Der Grund: Viele Flinten in 12/76 verschießen auch 12/70, ein Revolver in .357 Magnum auch .38 Special. Man will also wissen, wie viel man insgesamt für eine Waffe hat, ohne den Überblick über die einzelnen Arten zu verlieren. Aus demselben Grund soll das Training zulassen, dass man aus einer 12/76-Waffe 12/70 verschießt und aus einer .357 die .38 Special.

## Heutiger Stand

- Zwei Ebenen: Kaliber → Sorte (Hersteller + Bezeichnung + grain). Die Kaliberzeile zeigt die Summe, darunter stehen die Sorten (`js/views/stock.js`).
- 12/70 und 12/76 sind getrennte Kaliber (`c-12-70`, `c-12-76`), ebenso .357 Magnum (`c-357`) und .38 Special (`c-38spl`).
- „Buckshot“ oder „Standard“ steht, wenn überhaupt, als freier Text im Feld *Bezeichnung*.
- Training: Die Prüfung in `choose()` (`js/views/training.js`) lehnt jede Sorte ab, deren Kaliber nicht genau dem der Waffe entspricht. `guessLoad()` schlägt nur Sorten mit genau diesem Kaliber vor.
- Die Vorgabe-Kaliber liegen beim Nutzer schon in der Datenbank. `init()` in `js/store.js` legt nur fehlende Kaliber neu an und ergänzt bei vorhandenen keine neuen Felder.

## Ziele

1. Bestandsliste mit drei Ebenen: **Hauptkaliber** (Gesamtzahl) → **Unterart** (Zwischensumme) → **Sorte** (wie bisher antippbar für Einkauf, Korrektur, Bearbeiten).
2. Jede Sorte kann eine **Art** haben (z. B. Buckshot, High Velocity).
3. Im Training lassen sich an einer Waffe auch **verträgliche Kaliber** verschießen (12/76 nimmt 12/70, .357 Magnum nimmt .38 Special).
4. Buckshot und andere Arten sind im Bild über die **Hülsenfarbe der Sorte** zu unterscheiden.

## Nicht-Ziele

- Kein eigenes Patronenbild für Buckshot oder Flintenlaufgeschoss (durchsichtige Hülse mit sichtbaren Kugeln). Das ist als mögliche spätere Erweiterung vorgemerkt.
- Kein Mindestbestand für ein ganzes Hauptkaliber. Der Mindestbestand bleibt pro Kaliber und pro Sorte.
- Eigene Kaliber lassen sich vorerst keiner Gruppe zuordnen, sie stehen für sich allein. Auch die Verträglichkeit für eigene Kaliber lässt sich nicht einstellen.
- Keine Einstellung pro Waffe („verträgt auch …“), die Verträglichkeit ist fest im Kaliber hinterlegt.

## Was auf keinen Fall passieren darf

- Bestehende Daten gehen verloren oder werden falsch gezählt. Sorten ohne Art und Kaliber ohne Gruppe müssen genauso aussehen und zählen wie heute.
- Der Abgleich zwischen Geräten (`mergeData`) oder alte Sicherungen gehen kaputt.
- Im Training wird eine Munition zugelassen, die nicht in die Waffe passt (z. B. 12/76 in einer 12/70-Flinte).

## Umsetzungswege

**Bestand**
- **A, gewählt:** Kaliber bekommen eine Gruppe, Sorten ein Feld *Art*. Zwischensummen ergeben sich aus Kaliber + Art. Robust und eindeutig, kostet zwei neue Felder.
- B: Art automatisch aus der Bezeichnung lesen. Verworfen, das geht schief bei abweichender Schreibweise („00 Buck“, „Posten“).
- C: 12/70 und 12/76 zu einem Kaliber zusammenlegen. Verworfen, eigene Bilder und Maße gingen verloren, und die Waffe wüsste nicht mehr, ob sie 76 mm verträgt.

**Training**
- **A, gewählt:** Feste Verträglichkeit im Kaliber. Keine Einstellarbeit, nichts kann falsch eingetragen werden.
- B: Pro Waffe einstellbar. Verworfen, flexibler, aber Aufwand für jeden und fehleranfällig.

**Buckshot-Bild**
- **1, gewählt:** Vorhandene Einstellung „Hülse für das Bild“ der Sorte nutzen.
- 2: Eigenes Bild mit sichtbaren Kugeln. Später.

## Entwurf

### Daten

- **Gruppe und Verträglichkeit** gehören zu den Vorgabe-Kalibern und kommen aus dem Code (`js/calibers.js`), nicht aus der Datenbank. Denn vorhandene Kaliber-Einträge beim Nutzer bekommen keine neuen Felder (siehe heutiger Stand). Der Code liest sie über die Kaliber-id nach.
  - Gruppe „Kaliber 12“: `c-12-70`, `c-12-76`
  - Gruppe „.357 Mag / .38 Spl“: `c-357`, `c-38spl`
  - Verträglich: `c-12-76` nimmt auch `c-12-70`; `c-357` nimmt auch `c-38spl`.
  - Alle anderen Kaliber sind ihre eigene Gruppe mit ihrem eigenen Namen.
- **Art** ist ein neues, optionales Textfeld `art` an der Sorte (`loads`). Leer = keine besondere Art. Beim Vergleich zählen Groß-/Kleinschreibung und Leerzeichen am Rand nicht.
- Keine Erhöhung von `SCHEMA_VERSION` nötig: Das Feld ist zusätzlich, alte Sicherungen bleiben gültig, `mergeData` übernimmt es ohne Änderung.

### Rechenlogik (`js/model.js`, testbar in Node)

Eine neue Funktion baut aus Sorten und Bestand den Baum:

```
Block (Gruppe oder einzelnes Kaliber): name, total, unterarten[]
  Unterart (Kaliber + Art): caliberId, art, total, sorten[]
    Sorte: loadId, Bestand
```

- Blöcke nach Gesamtzahl absteigend (wie heute die Kaliber).
- Unterarten innerhalb eines Blocks nach Zwischensumme absteigend.
- Sorten in der bisherigen Reihenfolge.
- Name der Unterart: Bei Blöcken mit mehreren Kalibern „Kaliber + Art“ („12/70 Buckshot“), ohne Art nur der Kalibername („12/70“). Bei Blöcken mit nur einem Kaliber nur die Art („High Velocity“), ohne Art der Kalibername („.22 lfB“).
- Dazu eine Funktion „passt diese Sorte in diese Waffe?“: gleiches Kaliber oder ein verträgliches.

### Bestandsansicht (`js/views/stock.js`)

```
[▮] Kaliber 12              480 Schuss
     ▯ 12/76          150
        Rottweil Waidmannsheil   150
     ▮ 12/70          250
        Geco Trap                200
        Rio Skeet                 50
     ■ 12/70 Buckshot  80
        Fiocchi 00 Buck           80
```

- Kopf des Blocks: große Patrone links, Name des Blocks, Gesamtzahl.
- **Zwischensummen-Zeilen nur, wenn der Block mehr als eine Unterart hat.** Sonst bleibt alles wie heute (eine Kaliberzeile, darunter die Sorten).
- Jede Unterart-Zeile hat eine kleine Patrone, gezeichnet mit dem Kaliber der Unterart und der ersten Sorte darin. So übernimmt sie deren Hülsenfarbe (z. B. schwarz für Buckshot).
- Patronenparade oben: eine Patrone pro Block mit der Gesamtzahl. Bild = Unterart mit dem größten Bestand.
- Antippen auf den Blocknamen öffnet wie heute den Mindestbestand. Bei einem Block mit mehreren Kalibern stehen dort mehrere Felder untereinander, eins pro Kaliber (meine Entscheidung, siehe unten).
- Warnung „Mindestbestand“ am Block, wenn ein Kaliber oder eine Sorte darin unter ihrem Mindestbestand liegt (wie heute, nur über alle Kaliber des Blocks).
- Die Zähl-Animation nach Einkauf oder Training (`mount()`) muss auf Block- und Unterart-Summen umgestellt werden. Heute hängt sie an der Kaliber-id.

### Sorte anlegen und bearbeiten

- Neues Feld **Art** direkt unter *Bezeichnung*, optional, mit Vorschlägen: Standard, High Velocity, Subsonic, Match, Buckshot, Flintenlaufgeschoss, plus bereits benutzte eigene Arten.
- Hinweistext: Sorten mit gleicher Art werden in der Bestandsliste zusammengezählt.

### Training (`js/views/training.js`)

- Die Prüfung lässt Sorten verträglicher Kaliber zu. Unverträgliche werden weiter mit Hinweis abgelehnt.
- Der Vorschlag ohne ausgewählte Sorte (`guessLoad`) bleibt: zuletzt an dieser Waffe benutzte Sorte, sonst die mit dem größten Bestand im **eigenen** Kaliber, erst danach eine verträgliche.
- Die Auswahlliste bleibt nach Kaliber gegliedert, damit man sieht, was man verschießt.

### Sonstiges

- `sw.js`: `VERSION` erhöhen, sonst kommt das Update nicht aufs iPhone.
- Handbuch: Text zu Bestand, Sorte und Training anpassen, Bildschirmfotos und PDF neu bauen, mitcommitten.
- Tests in `tests/model.test.js` für Baum und Verträglichkeit.

## Meine Entscheidungen (bitte prüfen)

- Gruppenname „.357 Mag / .38 Spl“ für die Revolvergruppe.
- Zwischensummen erscheinen nur, wenn es mehr als eine Unterart gibt.
- Mindestbestand bei Gruppen: ein Feld pro Kaliber im selben Fenster, kein eigener für die Gruppe.
- Vorschlagsliste für *Art* wie oben.
- Eigene Kaliber bleiben vorerst ohne Gruppe.

## Offen für die Umsetzung

- Genaue Abstände, Schriftgrößen und Größe der kleinen Patrone im Stil der bestehenden Liste.
- Ob die Unterart-Zeilen selbst antippbar sind (z. B. zum Ein- und Ausklappen). Vorerst nicht nötig.
