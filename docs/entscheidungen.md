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
