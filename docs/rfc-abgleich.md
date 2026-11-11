# Abgleich der Regeln mit den Standards (Phase 0.4)

Die Regeln der Außenprüfung (Spezifikation 6.5, umgesetzt in `src/pruefung`) stützen sich teils auf Standards, die für die Spezifikation nicht geöffnet wurden (Abschnitt 3.4). Dieses Blatt sammelt die Annahmen je Regel. Die Spalte „Stand“ gibt Fachwissen wieder, **nicht** den gelesenen Originaltext; der Abgleich mit den RFCs steht noch aus. Abweichungen ändern nur Regeltabelle, Code und Tests der jeweiligen Prüfung.

Vorbereitet am 11.11.2026 ohne Webrecherche (Vorgabe: Agenten recherchieren nur, wenn eine Tatsache für die Umsetzung fehlt).

| Bereich | Annahme im Code | Quelle zum Abgleich | Stand (Fachwissen) | Prüfen |
| --- | --- | --- | --- | --- |
| Null-MX | Genau ein MX `0 .` heißt „empfängt keine E-Mail“ (MX-02); mehrere MX mit einem `0 .` darunter gelten als normale Liste (MX-03). | RFC 7505, Abschnitt 3 | Null-MX ist genau ein Eintrag mit Priorität 0 und leerem Ziel; weitere MX daneben sind nicht erlaubt. | [ ] Soll ein Null-MX neben anderen MX eine eigene Warnung ergeben? |
| SPF | Regeln nach RFC 7208 (geöffnet): Zählung, Schleifen, Qualifier. Doppeltes `redirect` → SPF-10. | RFC 7208, Abschnitte 4.6.4, 5, 6 | Modifikatoren `redirect` und `exp` höchstens einmal, sonst permerror. Syntax von `ip4`/`ip6` wird nicht geprüft. | [ ] Ungültige IP-Angaben als SPF-10 werten? |
| DMARC | Nur „v=DMARC1“ exakt; `pct` ≠ 100 → DMARC-09; `sp=none` → DMARC-10; `rua` ohne `mailto:` → DMARC-12. | RFC 7489 (geöffnet); DMARCbis | DMARCbis streicht `pct` (ersetzt durch `t`) und ergänzt `np` und `psd`. Status von DMARCbis unbekannt (Abruf am 11.11.2026 blockiert). | [ ] Status DMARCbis; bei Veröffentlichung DMARC-09 durch eine Regel zu `t=y` ersetzen und `np` prüfen (Risiko R12). |
| DKIM | Leeres `p=` → widerrufen (DKIM-03); ohne `k` gilt `rsa`; RSA < 1024 Bit Warnung, 1024–2047 Hinweis, ab 2048 ok; Ed25519 mit 32 Byte ok. | RFC 6376, Abschnitt 3.6.1; RFC 8301, Abschnitt 3.2; RFC 8463 | Signer müssen mindestens 1024 Bit nutzen und sollen 2048 Bit nutzen; Prüfer werten Signaturen unter 1024 Bit nicht. Ed25519 seit RFC 8463. | [ ] Grenzen bestätigen. |
| MTA-STS | TXT beginnt genau mit `v=STSv1;`, `id` 1–32 Buchstaben oder Ziffern; Richtlinie ohne Weiterleitung, `max_age` ≤ 31 557 600, `mx` mit `*.` für genau ein Label. | RFC 8461 (geöffnet) | wie umgesetzt | [ ] Nichts offen außer der Richtlinie im Windows-Programm (Phase 5). |
| TLS-RPT | Kandidat beginnt mit `v=TLSRPTv1` (Groß/klein genau); genau ein Eintrag; `rua` mit `mailto:` oder `https:`. Ohne Eintrag, aber mit MTA-STS → Hinweis. | RFC 8460, Abschnitt 3 | Versionsangabe unterscheidet Groß/klein; mehr als ein Eintrag heißt „kein TLS-RPT“; Berichtswege `mailto` und `https`. | [ ] Groß/klein der Versionsangabe bestätigen. |
| DNSSEC | AD-Flag des DoH-Anbieters; SERVFAIL mit und NOERROR ohne Prüfung (`cd=1`) → kaputte Signatur. | RFC 4035; Verhalten der Anbieter | Beide Anbieter validieren; das AD-Flag gilt nur so weit, wie man dem Anbieter vertraut. | [ ] Erledigt durch Abnahme M-02 (Phase 5.7). |
| CAA | Erster Name mit CAA-Einträgen von D bis zur TLD; Flag 128 bei unbekannter Angabe → Warnung; bekannte Angaben issue, issuewild, iodef, contactemail, contactphone, issuemail, issuevmc; Angaben ohne Groß/klein. | RFC 8659, Abschnitte 3, 4.1, 5; RFC 9495 (issuemail) | Baumaufstieg bis zur TLD, kritisches Flag 128, Angaben ohne Groß/klein. | [ ] Liste der bekannten Angaben bestätigen. |
| security.txt, HSTS | erst im Windows-Programm (6.6) | RFC 9116, RFC 6797 | – | [ ] mit Phase 5.5 |
| Argon2id | 64 MiB, 3 Durchläufe, Parallelität 1 (Export, umgesetzt in Phase 1.6) | RFC 9106, Abschnitt 4 | RFC 9106 empfiehlt als zweite Wahl 64 MiB mit 3 Durchläufen und 4 Lanes; 1 Lane ist im Browser üblich. | [ ] Parameter mit einem Experten abstimmen (TR-02102-1 verlangt das). |
| Testnamen | `.test`, `example.com`, 192.0.2.0/24 | RFC 2606, RFC 6761, RFC 5737 | reservierte Namen und Adressen | [ ] – |

Ergebnis bisher: keine Abweichung bekannt. Nach dem Abgleich die Häkchen setzen, Abweichungen hier eintragen und Schritt 0.4 in `docs/stand.md` abhaken.
