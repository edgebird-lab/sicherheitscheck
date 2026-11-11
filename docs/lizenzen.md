# Lizenzen

## Der Sicherheitscheck selbst

© 2026 Robin Olbricht – olbricht-digital. Alle Rechte vorbehalten. Der Quelltext ist öffentlich einsehbar, und die Programme (Windows-Programm und Web-Version) dürfen kostenlos genutzt werden. Eine offene Lizenz ist noch nicht gewählt; ohne sie erlaubt die Einsicht in den Quelltext kein Kopieren, Ändern oder Weitergeben.

Die DIN SPEC 27076 ist nicht Teil des Sicherheitschecks. Die App übernimmt nur Nummer, Themenbereich, TOP-Kennzeichen und Punkteschema; Fragen, Erläuterungen und Maßnahmen sind eigene Formulierungen ([README](../README.md#bewertung-nach-din-spec-27076)).

## Fremdbestandteile

Die folgenden Bibliotheken stehen unter ihren eigenen Lizenzen. Versionen nach `package-lock.json` und `src-tauri/Cargo.lock` (Stand 0.1.0, 11.11.2026); Lizenzen nach `npm view ‹paket› license` bzw. den Angaben der Crates (`cargo tree -e normal --target x86_64-pc-windows-msvc -f '{p} {l}'`).

### In der Oberfläche (npm, Web-Version und Windows-Programm)

| Paket | Version | Lizenz | Einsatz |
| --- | --- | --- | --- |
| react, react-dom, scheduler | 19.3.1, 19.3.1, 0.28.0 | MIT | Oberfläche |
| tldts, tldts-core | 7.4.21 | MIT; enthält die Public Suffix List von Mozilla (MPL-2.0) | registrierbare Domain bestimmen |
| idb | 8.0.4 | ISC | IndexedDB mit Promises |
| @noble/hashes | 2.4.0 | MIT | Argon2id für verschlüsselte Sicherungen |
| @tauri-apps/api | 2.12.4 | Apache-2.0 OR MIT | Brücke zu Rust, nur im Windows-Programm |

### Im Windows-Programm (Rust)

Direkt eingebunden:

| Crate | Version | Lizenz | Einsatz |
| --- | --- | --- | --- |
| tauri | 2.12.5 | Apache-2.0 OR MIT | Programmrahmen mit WebView2 |
| tauri-plugin-dialog | 2.8.4 | Apache-2.0 OR MIT | Dialoge zum Öffnen und Speichern |
| tauri-plugin-single-instance | 2.5.5 | Apache-2.0 OR MIT | nur ein Programmfenster |
| webview2-com, windows | 0.39.1, 0.62.2 | MIT; MIT OR Apache-2.0 | PDF direkt aus der WebView2 |
| serde, serde_json | 1.0.229, 1.0.154 | MIT OR Apache-2.0 | Daten zwischen Rust und Oberfläche |
| rustls | 0.23.46 | Apache-2.0 OR ISC OR MIT | TLS-Verbindungen der Website-Prüfung |
| ring | 0.17.14 | Apache-2.0 AND ISC | Kryptoanbieter für rustls |
| webpki-roots | 1.0.12 | CDLA-Permissive-2.0 | Wurzelzertifikate von Mozilla |
| x509-parser | 0.18.1 | MIT OR Apache-2.0 | Zertifikatsfelder lesen |
| reqwest | 0.13.5 | MIT OR Apache-2.0 | HTTP ohne Weiterleitung |
| tokio | 1.54.1 | MIT | asynchrone Laufzeit |
| url | 2.5.8 | MIT OR Apache-2.0 | URL-Prüfung |
| psl | 2.1.251 | MIT/Apache-2.0; enthält die Public Suffix List (MPL-2.0) | Freigabe nur für registrierbare Domains |

Insgesamt bindet das Windows-Programm 262 fremde Crates ein. Fast alle stehen unter MIT, Apache-2.0 oder beiden zur Wahl. Daneben kommen vor: Unicode-3.0 (ICU-Crates für Unicode-Daten), ISC (rustls-webpki, untrusted), BSD-3-Clause (subtle, alloc-no-stdlib, alloc-stdlib, brotli, brotli-decompressor), MPL-2.0 (cssparser, cssparser-macros, selectors, dtoa-short, option-ext), Zlib (foldhash), Unlicense OR MIT, Apache-2.0 allein (tao, sync_wrapper) und CDLA-Permissive-2.0 (webpki-roots). Die vollständige Liste mit Versionen ergibt der oben genannte `cargo tree`-Befehl in `src-tauri`.

Der Installer (NSIS) lädt bei Bedarf den WebView2-Bootstrapper von Microsoft; Windows 10 und 11 bringen die WebView2-Laufzeit meist schon mit.

### Nur in der Entwicklung (nicht im Programm)

| Paket | Version | Lizenz | Einsatz |
| --- | --- | --- | --- |
| typescript | 7.0.2 | Apache-2.0 | Sprache |
| vite, @vitejs/plugin-react | 8.3.7, 6.3.0 | MIT | Build |
| vitest | 5.1.0 | MIT | Unit-Tests |
| @playwright/test | 1.65.0 | Apache-2.0 | Browsertests |
| @axe-core/playwright | 4.14.0 | MPL-2.0 | Barrierefreiheit in den Browsertests |
| oxlint | 1.93.0 | MIT | Lint |
| @types/react, @types/react-dom, @types/node | 19.3.0, 19.3.0, 24.19.2 | MIT | Typen |
| @tauri-apps/cli | 2.12.4 | Apache-2.0 OR MIT | Windows-Programm bauen |
| rcgen (Crate) | 0.14.10 | MIT OR Apache-2.0 | Test-Zertifikate zur Laufzeit |
