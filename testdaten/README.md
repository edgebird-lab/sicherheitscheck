# Testdaten

Antworten für die Unit-Tests der Außenprüfung. Kein Test fragt echte Domains ab (Spezifikation 9).

## `dns/` – Formatmuster der DoH-Anbieter

| Datei | Inhalt | Herkunft |
| --- | --- | --- |
| `cloudflare-txt.json`, `google-txt.json` | TXT `v=spf1 -all`: Cloudflare in Anführungszeichen, Google ohne | synthetisch |
| `cloudflare-txt-mehrteilig.json` | TXT aus mehreren Zeichenketten, `\"`, `\DDD` und UTF-8 in `\DDD` | synthetisch |
| `cloudflare-mx.json`, `google-mx.json` | zwei MX, Namen mit und ohne Punkt am Ende, AD-Flag | synthetisch |
| `cloudflare-caa.json`, `google-caa.json` | CAA `0 issue "letsencrypt.org"` | synthetisch |
| `cloudflare-nxdomain.json`, `cloudflare-nodata.json` | Status 3 (NXDOMAIN) und Status 0 ohne `Answer` | synthetisch |
| `cloudflare-servfail-dnssec.json`, `google-servfail-dnssec.json`, `google-soa-cd.json` | DNSSEC-Fehler: Status 2, mit `cd=1` Status 0; Kommentar bei Cloudflare als Liste (EDE), bei Google als Text | synthetisch |
| `cloudflare-abgeschnitten.json` | `TC: true` | synthetisch |
| `beispiel-zone.json` | fiktive Zone von example.com für den Beispielbetrieb und den Browsertest E-07, Schlüssel „TYP name“ | synthetisch |

**Synthetisch** heißt: von Hand geschrieben, im Aufbau der JSON-Antworten von Cloudflare und Google, wie ihn die Spezifikation (Abschnitt 3.3, [Q13], [Q14]) nach einer Abfrage mit curl am 11.11.2026 beschreibt: TXT bei Cloudflare in Anführungszeichen, bei Google ohne; `Comment` bei Cloudflare als Liste, bei Google als Text; Google mit Punkt am Ende der Namen und `edns_client_subnet`. Alle Namen liegen unter `.test` (RFC 6761) oder `example.com` (RFC 2606); IP-Adressen aus 192.0.2.0/24 (RFC 5737).

Aufgezeichnete Antworten echter Domains (TXT/CAA von google.com, MX von gmail.com, DNSSEC-Fehler von dnssec-failed.org, Spezifikation 9.10) liegen noch nicht vor: Agenten dürfen keine Live-Abfragen machen. Robin kann sie mit `node scripts/fixtures-aufnehmen.mjs` aufnehmen (siehe unten) und hier ergänzen; die Tests laufen auch ohne sie.

## Weitere Testdaten

Die meisten Regeltests bauen ihre Antworten im Code mit dem Testnetz (`src/netz/testnetz.ts`, Bausteine `txt`, `mx`, `caa`, `leer`, `nxdomain`, `servfail`). DKIM-Schlüssel erzeugen die Tests zur Laufzeit mit Web Crypto; sie werden nicht gespeichert.

## Fixture-Rekorder

`scripts/fixtures-aufnehmen.mjs` fragt einige öffentliche Namen bei Cloudflare und Google ab und legt die Antworten unverändert unter `testdaten/dns/aufgenommen/` ab, mit Datum im Dateinamen. Nur von Hand starten, nie in Tests oder in der CI:

```bash
node scripts/fixtures-aufnehmen.mjs
```

Das Skript ist im Projekt bisher nicht ausgeführt worden (keine Live-Abfragen durch Agenten).
