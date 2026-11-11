# Sicherheitscheck

IT-Sicherheitsberatung nach DIN SPEC 27076 für Betriebe mit bis zu 50 Beschäftigten: geführtes Interview zu 27 Anforderungen, Statuswert nach dem Punkteschema der Norm, Auswertung je Themenbereich und später Maßnahmenplan, Bericht und eine passive Prüfung von E-Mail-Domain und Website. Läuft im Browser, ohne KI und ohne Server; alle Kundendaten bleiben auf dem Rechner des Beraters.

![Schritt „Auswertung“: Statuswert 18 von 37 Punkten, Netzdiagramm und Tabelle je Themenbereich](docs/bilder/auswertung.png)

> **In Arbeit.** Fertig sind Phase 1 (Datenmodell, Bewertung, Speicher, verschlüsselter Export) und Phase 2 (Interview und Auswertung) der [Spezifikation](docs/spezifikation.md). Außenprüfung, Maßnahmenplan und Bericht folgen. Stand und nächste Schritte: [docs/stand.md](docs/stand.md), Annahmen: [docs/entscheidungen.md](docs/entscheidungen.md).

## Was es kann

- **Geführter Ablauf in sieben Schritten:** Betrieb, Vorgespräch, Interview, Außenprüfung, Auswertung, Maßnahmen, Bericht. Ein Häkchen in der Schrittleiste zeigt, was vollständig ist.
- **Interview mit Fragekarte:** je Anforderung Themenbereich, TOP-Kennzeichen („zählt ±3 Punkte“), Verweis auf die Leitfragen der Norm, eigene Kurzfrage und „Darum geht es“. Bewertung erfüllt, nicht erfüllt oder (wo erlaubt) nicht relevant, Begründung in Stichpunkten als Pflicht, Nachweis optional. Bedienbar nur mit der Tastatur (Strg+Eingabe: weiter). Eine laufende Punktzahl zeigt das Interview bewusst nicht.
- **Vorfragen im Vorgespräch** blenden Anforderungen aus, die nicht zutreffen (z. B. WLAN), und begründen das automatisch. Warnung, solange niemand aus der Geschäftsführung teilnimmt.
- **Auswertung:** Statuswert, Rohpunkte (nur in der Berateransicht), Netzdiagramm mit Tabelle je Themenbereich, nicht erfüllte TOP-Anforderungen, nicht relevante Anforderungen mit Begründung.
- **Abschluss und Wiederholung:** Beim Abschließen wird das Ergebnis eingefroren. Eine Wiederholungsprüfung übernimmt Teilnehmende, Vorfragen, Antworten und offene Maßnahmen; jede übernommene Antwort muss bestätigt oder geändert werden.
- **Daten lokal:** IndexedDB im Browser, Speichern nach jeder Änderung, Schutz vor zwei gleichzeitig offenen Tabs. Sicherung als Datei `.sicherheitscheck`, standardmäßig verschlüsselt (Argon2id, AES-256-GCM, im Web Worker).
- **Fiktiver Beispielbetrieb** „Tischlerei Beispiel GmbH“ zum Ausprobieren.

![Interview einer Wiederholungsprüfung: Themenbereiche mit Fortschritt links, Fragekarte mit „Letztes Mal“ rechts](docs/bilder/interview.png)

## Bewertung nach DIN SPEC 27076

| Anforderung | erfüllt | nicht erfüllt, teilweise oder offen | nicht relevant |
| --- | --- | --- | --- |
| Basis (22) | 1 Punkt | 0 Punkte | fällt aus dem Höchstwert |
| TOP (5) | 3 Punkte | −3 Punkte | – (immer relevant) |

Statuswert = Summe der Punkte, ausgewiesen mindestens 0; Höchstwert 37, wenn alles relevant ist. Der Beispielbetrieb erfüllt 3 TOP- und 15 Basis-Anforderungen: 3 × 3 − 2 × 3 + 15 = **18 von 37 Punkten (49 %)**. Je Themenbereich gilt dieselbe Rechnung; das Netzdiagramm zeigt den Anteil an den Höchstpunkten.

**Kein Normtext:** Die Norm ist urheberrechtlich geschützt. Die App enthält nur Nummer, Themenbereich, TOP-Kennzeichen und Punkteschema; Fragen, Erläuterungen und Maßnahmen sind eigene Formulierungen. Die Leitfragen stellt der Berater aus der Norm. Der Katalog ist noch nicht mit der Norm abgeglichen ([Abgleichblatt](docs/katalog-abgleich.md), [alle Texte](docs/katalog-texte.md)). Der Check ist keine Zertifizierung.

## Aufbau

| Ordner | Inhalt |
| --- | --- |
| `src/katalog` | 6 Themenbereiche, 27 Anforderungen, Vorfragen, Bezug zum IT-Grundschutz |
| `src/modell` | Datenmodell, Bewertung, Operationen (Abschluss, Wiederholung), Fortschritt, Netzdiagramm, Beispielbetrieb |
| `src/pruefung` | Domainprüfung (Public Suffix List); später die Regeln der Außenprüfung |
| `src/speicher` | Prüfung beim Laden, Migration, IndexedDB, Schreibpuffer, Tab-Sperre, Export und Import, Verschlüsselung |
| `src/ui` | React-Oberfläche |
| `e2e` | Browsertests mit Playwright und axe |
| `docs` | Spezifikation, Stand, Entscheidungen, Katalog-Abgleich |

Die Fachlogik kennt kein React und ist vollständig getestet. **Technik:** React 19, TypeScript 7, Vite 8, tldts, idb, @noble/hashes, Vitest, Playwright mit axe, oxlint, GitHub Actions.

## Qualität

- 127 Unit-Tests mit von Hand nachgerechneten Werten, darunter alle Fälle der Spezifikation für Katalog, Statuswert, Abschluss, Wiederholung, Laden, Export und Import (T-K, T-B, T-O, T-L, T-E, T-D, T-G). Der Export von 50 Prüfungen mit den vollen Argon2-Parametern dauert rund 1 s.
- 19 Browsertests: Betrieb anlegen und neu laden, Vorgespräch mit Vorfragen, Interview vollständig per Tastatur, Wiederholungsprüfung bis zum Abschluss, verschlüsselter Export und Import in ein leeres Profil, zweiter Tab, Import als Kopie. Kein Test greift auf fremde Adressen zu.
- Barrierefreiheit: axe meldet auf keiner Seite und in keinem Schritt schwere Befunde, weder hell noch dunkel; jedes Eingabefeld ist beschriftet; nach jedem Seitenwechsel steht der Fokus auf der Überschrift. Jede Stufe hat Symbol und Wort.
- Bei jedem Push laufen Lint, Unit-Tests und Build; die Browsertests laufen vor jedem Commit lokal mit Edge.

## Entwickeln

```bash
npm install
npm run dev       # Entwicklungsserver
npm test          # Unit-Tests (Vitest)
npm run e2e       # Browsertests (lokal mit Edge auf Port 4181)
npm run build     # Typprüfung und Produktions-Build
npm run lint      # oxlint
```

`npm run bilder` erzeugt die Bilder dieser README neu (bei laufendem `npx vite preview`, Port 4181).

## Grenzen

- Der Katalog ist vorläufig: Nummern, Verteilung der Basis-Anforderungen und Relevanzregeln sind Annahmen bis zum Abgleich mit der Norm.
- Netzdiagramm, Dringlichkeit und Aufbau des Berichts sind Annahmen der Spezifikation (6.12, 6.13).
- Die Daten liegen unverschlüsselt in der IndexedDB des Browsers. Für den Rechner des Beraters gelten BitLocker und Bildschirmsperre; regelmäßig eine verschlüsselte Sicherung exportieren.

## Lizenz

Noch nicht festgelegt. Das Repo ist privat.
