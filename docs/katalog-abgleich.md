# Katalog-Abgleich mit der DIN SPEC 27076

Arbeitsblatt für Robin (Phase 0.2 und 0.3 der Spezifikation). Der Katalog der App ist ohne die Norm entstanden: Die fünf TOP-Anforderungen folgen der Kurzfassung in Spezifikation 3.1 (nach dem öffentlichen Leitfaden [Q3]); die 22 Basis-Anforderungen, ihre Nummern, ihre Verteilung auf die Themenbereiche, die Vorfragen und die Relevanzregeln sind **Annahmen** aus dem IT-Grundschutz und allgemeinem Fachwissen. Alle Texte sind eigene Formulierungen.

Die vollständigen Texte (Titel, Kurzfrage, „Darum geht es“, Maßnahme) stehen in [katalog-texte.md](katalog-texte.md), erzeugt aus `src/katalog`.

## So prüfen

1. Norm als PDF nach `normen/` legen (steht in `.gitignore`, kommt nie ins Repo).
2. Für jede Zeile unten: Gibt es in der Norm eine Anforderung mit diesem Inhalt? Nummer, Themenbereich und TOP-Kennzeichen eintragen.
3. Basis-Anforderungen der Norm, die hier fehlen, unten unter „Fehlt im Katalog“ notieren; Anforderungen der App ohne Gegenstück in der Norm unter „Überzählig“.
4. Texte in [katalog-texte.md](katalog-texte.md) lesen: kein Satz darf wörtlich oder fast wörtlich aus der Norm stammen (Spezifikation 3.2). Freigabe in der letzten Spalte mit Datum vermerken.
5. Danach im Code: `normNr` und Zuordnung in `src/katalog/anforderungen.ts` anpassen, `KATALOG.version` erhöhen, `KATALOG_ABGEGLICHEN = true` in `src/katalog/index.ts` setzen, `npx vitest run -u` für die Textdatei, Tests T-K01 bis T-K03 grün.

Die App-Kennung (A01 bis A27) bleibt beim Umnummerieren gleich; gespeicherte Prüfungen beziehen sich darauf.

## Anforderungen

Spalten „Norm“: vom Abgleich auszufüllen. ✔ = passt, sonst Korrektur eintragen.

| ID | vorl. Nr. | Themenbereich | TOP | Kurzbezeichnung (eigene) | Relevanz in der App | Nr. laut Norm | Thema/TOP passt | Inhalt passt | kein Normtext, Freigabe |
|---|---|---|---|---|---|---|---|---|---|
| A01 | 1.1 | Organisation & Sensibilisierung | TOP | Geschäftsführung verantwortet die Informationssicherheit | immer | | | | |
| A02 | 1.2 | Organisation & Sensibilisierung | TOP | Beschäftigte erkennen Phishing und Betrugsversuche | immer | | | | |
| A03 | 1.3 | Organisation & Sensibilisierung | | Zuständigkeit für IT-Sicherheit ist geregelt | immer | | | | |
| A04 | 1.4 | Organisation & Sensibilisierung | | Notfallplan für IT-Ausfälle und Angriffe | immer | | | | |
| A05 | 1.5 | Organisation & Sensibilisierung | | Regeln für Homeoffice und mobiles Arbeiten | Vorfrage `mobiles_arbeiten` = Ja | | | | |
| A06 | 1.6 | Organisation & Sensibilisierung | | Überblick über IT, Daten und Dienstleister | immer | | | | |
| A07 | 2.1 | Identitäts- und Berechtigungsmanagement | | Persönliche Benutzerkonten für alle | immer | | | | |
| A08 | 2.2 | Identitäts- und Berechtigungsmanagement | | Sichere und verschiedene Passwörter | immer | | | | |
| A09 | 2.3 | Identitäts- und Berechtigungsmanagement | | Zweiter Faktor für Zugänge aus dem Internet | immer | | | | |
| A10 | 2.4 | Identitäts- und Berechtigungsmanagement | | Rechte nur so weit wie nötig, Administration getrennt | immer | | | | |
| A11 | 2.5 | Identitäts- und Berechtigungsmanagement | | Zugänge werden beim Austritt entzogen | mit Begründung abwählbar | | | | |
| A12 | 3.1 | Datensicherung | TOP | Regelmäßige Datensicherung | immer | | | | |
| A13 | 3.2 | Datensicherung | | Alle wichtigen Daten sind in der Sicherung | immer | | | | |
| A14 | 3.3 | Datensicherung | | Eine Sicherung liegt getrennt und geschützt | immer | | | | |
| A15 | 3.4 | Datensicherung | | Wiederherstellung wird erprobt | immer | | | | |
| A16 | 4.1 | Patch- und Änderungsmanagement | TOP | Updates werden zeitnah eingespielt | immer | | | | |
| A17 | 4.2 | Patch- und Änderungsmanagement | | Keine Systeme ohne Herstellerunterstützung | immer | | | | |
| A18 | 4.3 | Patch- und Änderungsmanagement | | Software kommt nur aus geprüften Quellen | immer | | | | |
| A19 | 5.1 | Schutz vor Schadprogrammen | TOP | Makros und aktive Inhalte sind abgeschaltet | immer | | | | |
| A20 | 5.2 | Schutz vor Schadprogrammen | | Virenschutz auf allen Rechnern und Servern | immer | | | | |
| A21 | 5.3 | Schutz vor Schadprogrammen | | Eingehende E-Mails werden gefiltert | immer | | | | |
| A22 | 6.1 | IT-Systeme und Netzwerke | | Firewall schützt das Netz des Betriebs | immer | | | | |
| A23 | 6.2 | IT-Systeme und Netzwerke | | WLAN ist verschlüsselt, Gäste sind getrennt | Vorfrage `wlan` = Ja | | | | |
| A24 | 6.3 | IT-Systeme und Netzwerke | | Fernzugriff und Fernwartung sind abgesichert | Vorfrage `fernzugriff` = Ja | | | | |
| A25 | 6.4 | IT-Systeme und Netzwerke | | Smartphones und Tablets sind geschützt | Vorfrage `mobilgeraete` = Ja | | | | |
| A26 | 6.5 | IT-Systeme und Netzwerke | | Geräte ohne voreingestellte Zugangsdaten | immer | | | | |
| A27 | 6.6 | IT-Systeme und Netzwerke | | Rechner sind gegen fremden Zugriff gesperrt | immer | | | | |

Verteilung in der App (Annahme): 6 / 5 / 4 / 3 / 3 / 6 Anforderungen je Themenbereich, TOP wie in Spezifikation 3.1. Maximum 37 Punkte (22 × 1 + 5 × 3).

**Fehlt im Katalog** (Anforderungen der Norm ohne Gegenstück):

- …

**Überzählig** (Anforderungen der App ohne Gegenstück in der Norm):

- …

## Was außerdem gegen die Norm zu prüfen ist

| Stelle | Annahme in der App | Wo im Code | geprüft |
|---|---|---|---|
| Nummernschema | „Themenbereich.laufende Nummer“, z. B. 1.1 bis 6.6 | `normNr` in `src/katalog/anforderungen.ts` | |
| Themennamen und Reihenfolge | wie Spezifikation 3.1 | `src/katalog/themen.ts` | |
| Relevanz | TOP-Anforderungen immer relevant; vier Basis-Anforderungen über Vorfragen; eine (A11) mit Begründung abwählbar | `relevanz` in `src/katalog/anforderungen.ts` | |
| Vorfragen | vier Ja/Nein-Fragen: mobiles Arbeiten, WLAN, Fernzugriff, Smartphones und Tablets | `src/katalog/vorfragen.ts` | |
| Vorbereitungsliste | Notfallplan, Datensicherungskonzept, Berechtigungskonzept, IT-Übersicht, Dienstleisterverträge | `KATALOG.vorbereitung` in `src/katalog/index.ts` | |
| Punkte je Themenbereich (6.1) | `anteil = max(0, roh) / maximal`, also negative Werte eines Themas als 0 | `src/modell/bewertung.ts` | |
| Netzdiagramm (6.12) | sechs Achsen in Themenreihenfolge, oben beginnend im Uhrzeigersinn, Wert = Anteil | `src/modell/diagramm.ts` | |
| Dringlichkeit (6.8) | Priorität 1 für TOP, 2 für Basis; Fristen 14 / 90 Tage | Phase 4.1 | |
| Bericht (6.13) | Aufbau Seite 1 bis Anhang, Unterschriften von Geschäftsleitung und Berater | Phase 4.4 | |
| Ablauf | vier Schritte (Erstgespräch, Interview, Auswertung und Bericht, Präsentation), Interview 1 bis 2 Stunden, Geschäftsführung nimmt teil | Schritt Vorgespräch | |

## Freigabe

- [ ] Nummern und Zuordnung abgeglichen (Phase 0.2) – Datum, Robin
- [ ] Texte frei von Normtext (Phase 0.3) – Datum, Robin
