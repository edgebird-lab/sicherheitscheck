# Sicherheitscheck – Entscheidungen und Annahmen

Robin hat die offenen Fragen der Spezifikation noch nicht beantwortet. Damit die Arbeit weitergeht, gilt jeweils der Vorschlag der Spezifikation oder die naheliegendste Empfehlung, gekennzeichnet als **Annahme, bis Robin entscheidet**. Jede Annahme lässt sich ändern; die Spalte „Wirkung“ sagt, wo.

## Offene Fragen der Spezifikation (10.2)

| Nr. | Frage | Annahme, bis Robin entscheidet | Wirkung im Code |
|---|---|---|---|
| F1 | Name „Sicherheitscheck“ oder „Sicherheitslotse“? | Der Vorschlag der Spezifikation ist „Sicherheitslotse“. Umgesetzt bleibt vorerst **„Sicherheitscheck“**: Auftrag, Ordner, Repo, Dateiendung `.sicherheitscheck` und Datenbankname heißen so, und eine Umbenennung sollte einmal und vor Version 0.1.0 geschehen, nicht nebenbei. Empfehlung: vor 0.1.0 entscheiden; bis dahin kostet die Umbenennung wenig. „CyberRisikoCheck“ wird nicht als Name verwendet. | Anzeigename an einer Stelle (`src/ui/marke.ts`) |
| F2 | BSI-Schulung machen? Bis dahin „Check nach DIN SPEC 27076“? | ja und ja | Oberfläche und Bericht sagen sachlich „nach DIN SPEC 27076“, kein Logo |
| F3 | Lizenz bei DIN Media anfragen oder eigene Formulierungen? | eigene Formulierungen | `src/katalog`, Abgleich in `docs/katalog-abgleich.md` |
| F4 | DoH-Anbieter Cloudflare oder Google? | Cloudflare als Standard, Google wählbar | `Einstellungen.dohAnbieter` (ab Phase 3 wirksam) |
| F5 | Exportdatei standardmäßig verschlüsseln? | ja, abschaltbar | Exportdialog |
| F6 | Fristen 14 / 90 / 180 Tage für Priorität 1 / 2 / 3? | ja | Phase 4.1 |
| F7 | Reichen Unterschriftsfelder auf dem Ausdruck? | ja für 0.1 | Phase 4.4 |
| F8 | Fördermittel: eigene Liste oder Links und Freitext? | Links und Freitext | Feld `Pruefung.foerderhinweise`, Bericht in Phase 4.4 |
| F9 | Datenschutz mit Kunden (Rechtsgrundlage, AV-Vertrag, Aufbewahrung)? | mit einer Datenschutzberatung klären; im Code nichts | – |
| F10 | Haftungshinweis anwaltlich prüfen lassen? | vor dem ersten bezahlten Auftrag | Text „Methodik und Grenzen“ (Phase 4.5) |
| F11 | Lizenz der App; Repo privat? | Lizenz offen, Repo privat bis zur Freigabe | README |
| F12 | Eigene Domains für Testläufe? | olbricht-digital und VPS-Domains, erst bei der Abnahme M-01 (Phase 5.7) | keine; Tests nutzen nur aufgezeichnete Antworten |
| F13 | Probe-Kunde für einen echten Check? | nach Phase 6 | – |
| F14 | Web-Version nur lokal oder öffentlich? | nur lokal (`npm run dev`, `vite preview`) | keine Bereitstellung |
| F15 | Angebot nennt Außenprüfung mit Domain und Zeitraum? | ja, Mustersatz fürs Angebot folgt mit Phase 3 | – |

## Eigene Entscheidungen bei der Umsetzung

| Nr. | Entscheidung | Grund |
|---|---|---|
| E1 | Die CI (`.github/workflows/ci.yml`) prüft nur Lint, Unit-Tests und Build. Die Browsertests laufen lokal vor jedem Commit. | Vorgabe des Auftrags („CI nur mit lint, test und build“); weicht von Spezifikation 7.9 ab, die Playwright auch in der CI vorsieht. Nachrüsten heißt: eine Zeile `npx playwright test` in `ci.yml`. |
| E2 | Katalog vorläufig: 27 Anforderungen mit Verteilung 6 / 5 / 4 / 3 / 3 / 6 auf die Themenbereiche, Nummern „1.1“ bis „6.6“, vier Vorfragen, TOP immer relevant, A11 mit Begründung abwählbar. Die Oberfläche weist darauf hin, solange `KATALOG_ABGEGLICHEN = false`. | Die Norm liegt noch nicht vor (Phase 0). Einzelheiten und Prüfliste in `docs/katalog-abgleich.md`. |
| E3 | „Nicht relevant“ bei einer Anforderung, deren Regel es nicht erlaubt, zählt als offen und erzeugt die Prüfmeldung R1 (Warnung). Die Operation `setzeAntwort` lässt die Wahl dort gar nicht erst zu. | Spezifikation 6.1 und T-B12; R1 ist eine eigene Kennung neben A1 bis W3. |
| E4 | Nach dem Abschließen sind auch Datum, Berater, Teilnehmende und Vorbereitung schreibgeschützt; die Förderhinweise bleiben änderbar. | Das eingefrorene Ergebnis enthält `ohneGeschaeftsfuehrung`; Teilnehmende nachträglich zu ändern, würde Ergebnis und Bericht widersprüchlich machen. |
| E5 | Wiederholungsprüfung: Antworten zu Anforderungen, die eine Vorfrage ausblendet, gelten nicht als „übernommen“. A5 zählt nur sichtbare Anforderungen. | Ausgeblendete Anforderungen erscheinen im Interview nicht und ließen sich nicht bestätigen; der Abschluss wäre sonst unmöglich. |
| E6 | Beim Laden aus IndexedDB werden ungültige Einstellungen durch Standardwerte ersetzt (mit Meldung) und fehlende Antworten in Entwürfen als „offen“ ergänzt. Abgeschlossene Prüfungen bleiben unverändert. | Spezifikation 7.4 (überspringen und melden) gilt für Betriebe; die Einstellungen sind ersetzbar, ein Datenverlust entsteht nicht. |
| E7 | Speicherfehler: Der Schreibpuffer behält die Änderungen und versucht es mit wachsendem Abstand erneut (bis 30 s); der Kopf zeigt „Speichern fehlgeschlagen“. | Nichts soll stillschweigend verloren gehen. |
| E8 | Der Beispielbetrieb (Schritt 4.6) ist vorgezogen, weil Startseite und Browsertests ihn brauchen. Feste Kennungen, Domain `example.com` (reserviert, RFC 2606), eine abgeschlossene Prüfung mit 18 von 37 Punkten. | Spezifikation 5.2 und 9.10. |
| E9 | Migrationsgerüst: Format 1 ist das erste Format, `MIGRATIONEN` ist leer. Der Test T-E09 (Datei mit Format 0) speist eine Test-Migration ein. | Ein erfundenes „Format 0“ im Produktcode wäre irreführend. |
| E10 | Import: Enthält die Datei einen fehlerhaften Betrieb, wird der ganze Import abgelehnt (strenge Prüfung); beim Laden aus IndexedDB werden fehlerhafte Betriebe dagegen übersprungen. Obergrenzen für die Argon2-Parameter einer Datei (höchstens 1 GiB, 20 Durchläufe, Parallelität 8). | Spezifikation 6.11 („bei jedem Fehler bleibt der Bestand unverändert“); die Obergrenzen verhindern, dass eine präparierte Datei den Rechner lahmlegt. |
| E11 | Dateinamen: Zeichen außer Buchstaben (auch Umlaute), Ziffern und „-“ werden zu „-“; mehrere „-“ werden zusammengefasst, am Rand entfernt („Tischlerei-Beispiel-GmbH-fiktiv“). | Ergänzung zu 6.11, sonst entstünden Namen wie „GmbH--fiktiv-“. |
| E12 | Passwörter werden vor der Schlüsselableitung in Unicode-Normalform NFC gebracht. | Gleiche Umlaute ergeben auf allen Systemen denselben Schlüssel. |
| E13 | Tab-Sperre: Ein zweiter Tab zeigt eine Sperrseite mit „Erneut versuchen“ statt einer schreibgeschützten Ansicht. | Bearbeiten ohne Speichern wäre eine Falle (Spezifikation 7.4: „zeigt … und speichert nicht“). |
| E14 | Die Domainprüfung nach 6.3 (Teil von Schritt 3.1, T-D01 bis T-D08) ist vorgezogen, weil der Schritt Betrieb die Domain prüft. tldts (Public Suffix List, rund 270 kB) wird erst bei der Prüfung geladen. | Spezifikation 5.3; kleineres Haupt-Bundle. |
| E15 | Die Schritte Außenprüfung und Maßnahmen sind bis Phase 3 und 4 als „in Arbeit“ gekennzeichnete Platzhalter. Der Schritt Bericht enthält vorerst nur Abschließen und Wiederöffnen mit Fehlerliste und Sprungmarken (5.9); die Druckansicht folgt mit 4.4. | Ohne Abschluss gäbe es in Phase 2 keine Wiederholungsprüfung (E-05). |
| E16 | Interview: Strg+Eingabe und „Weiter“ gehen zur nächsten Anforderung, auf der letzten Karte zur Auswertung. Nach jedem Wechsel liegt der Fokus auf der Überschrift der Fragekarte. Ohne gewählte Anforderung beginnt das Interview bei der ersten offenen und bleibt dort, bis weitergeschaltet wird. „Unverändert bestätigen“ schaltet nicht selbst weiter. | Screenreader hören den Titel der neuen Frage; die Karte springt nicht mitten im Tippen weiter. |
| E17 | Auswertung eines Entwurfs: laufend berechnet, offene Anforderungen zählen wie nicht erfüllt, Hinweis „Vorläufig“. Nach dem Abschluss: das eingefrorene Ergebnis. Bis zum Vergleich (4.3) zeigt die Auswertung nur den Statuswert der Vorgängerprüfung. | Spezifikation 5.5 (keine laufende Punktzahl im Interview) bleibt gewahrt; die Auswertung ist ein eigener Schritt. |
| E18 | Netzdiagramm: Koordinaten wie 6.12 (300 × 300, Mitte 150/150, Radius 100); die viewBox ist für die Beschriftung auf −80 0 460 300 erweitert. Im Diagramm stehen Kurznamen, die Tabelle daneben nennt die vollen Namen und die Werte. | Lange Themennamen passen sonst nicht ins Bild. |
| E19 | „Neue Prüfung“ fragt nach, wenn schon ein Entwurf existiert. Ein Betrieb ohne Prüfung zeigt in den Schritten 2 bis 7 den Knopf „Neue Prüfung“. | Versehentliche leere Prüfungen vermeiden. |
| E20 | `NetzFehler` hat ein zusätzliches, optionales Feld `httpStatus`. | 6.4 verlangt den Wiederholversuch nur bei Netzfehlern und HTTP 5xx; ohne das Feld müsste der Lauf den Fehlertext auswerten. Gespeichert wird der Typ nicht. |
| E21 | Eine DoH-Antwort mit `TC = true` wird schon beim Lesen zum NetzFehler „Antwort abgeschnitten (TC)“; `DnsAntwort` bleibt wie in Abschnitt 4. Ist die Grenze der DNS-Abfragen erreicht, entfällt der Wiederholversuch, und der erste Fehler bleibt stehen. Der Wiederholversuch steht mit dem Zusatz „Wiederholung“ im Protokoll. | 6.4 nennt TC als „Abfrage gescheitert“; der Typ hat kein Feld dafür. |
| E22 | SPF im Einzelnen: Ein doppeltes `redirect` gilt als ungültige Angabe (SPF-10). Ein `redirect` auf ein Ziel mit Makro lässt das wirksame „all“ offen; dann steht nur SPF-11 da. Ein include-Ziel mit NXDOMAIN hat „keinen SPF-Eintrag“ (SPF-08); nur gescheiterte Abfragen ergeben SPF-00. ptr und Makros, die vor einem permerror auftauchen, bleiben als weitere Regeln stehen. | RFC 7208, Abschnitt 6 (Modifikatoren höchstens einmal); die Spezifikation regelt diese Fälle nicht ausdrücklich. |
