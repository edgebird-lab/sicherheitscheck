# Sicherheitscheck

IT-Sicherheitsberatung nach DIN SPEC 27076 für Betriebe mit bis zu 50 Beschäftigten: geführtes Interview zu 27 Anforderungen, Statuswert nach dem Punkteschema der Norm, Maßnahmenplan und eine passive Prüfung von E-Mail-Domain und Website. Läuft im Browser, ohne KI und ohne Server; alle Kundendaten bleiben auf dem Rechner des Beraters.

> In Arbeit. Stand und nächste Schritte: [docs/stand.md](docs/stand.md). Gebaut wird nach der [Spezifikation](docs/spezifikation.md).

## Entwickeln

```bash
npm install
npm run dev       # Entwicklungsserver
npm test          # Unit-Tests (Vitest)
npm run e2e       # Browsertests (lokal mit Edge auf Port 4181, in der CI nicht)
npm run build     # Typprüfung und Produktions-Build
npm run lint      # oxlint
```

## Lizenz

Noch nicht festgelegt. Das Repo ist privat.
