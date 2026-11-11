import { describe, expect, it, vi } from 'vitest'
import { KATALOG } from '../katalog'
import { beispielBetrieb } from '../modell/beispiel'
import { neuePruefung, neuerBetrieb, wiederholungspruefung } from '../modell/operationen'
import { FORMAT_VERSION, type Datenbestand, type Exportdatei } from '../modell/typen'
import { HEUTE, JETZT, zaehler } from '../testhilfen/pruefung'
import { aadFuer, alsKopie, bekannteBetriebe, dateiname, erzeugeExport, fuehreZusammen, ImportFehler, leseInhalt, leseKopf, sichererName } from './datei'
import { direkteKrypto, Entschluesselungsfehler, KDF_STANDARD, zuBase64, type KdfParameter } from './krypto'
import { leererBestand, standardEinstellungen } from './pruefen'

/** Kleine Parameter für schnelle Tests; KDF_STANDARD prüfen eigene Fälle */
const KDF_TEST: KdfParameter = { speicherKiB: 64, durchlaeufe: 1, parallelitaet: 1 }
const PASSWORT = 'korrekt Pferd Batterie'
/** Zeitlimit für Tests mit den vollen Argon2-Parametern (je Ableitung rund 0,7 s, unter Last mehr) */
const LANGSAM = 30_000
const PROGRAMM = 'Sicherheitscheck 0.1.0'

function bestand(): Datenbestand {
  const b = beispielBetrieb(KATALOG, HEUTE)
  const zweiter = wiederholungspruefung(b, KATALOG, 'Robin', HEUTE, JETZT, zaehler('w'))!.betrieb
  const dritter = neuePruefung(neuerBetrieb('Bäckerei Probe & Söhne', JETZT, 'b-2'), KATALOG, 'Robin', HEUTE, JETZT, 'p-2').betrieb
  return { formatVersion: FORMAT_VERSION, einstellungen: { ...standardEinstellungen(), berater: { name: 'Robin', firma: 'olbricht-digital', email: '', telefon: '' } }, betriebe: [zweiter, dritter] }
}

async function importiere(text: string, passwort: string | null) {
  return leseInhalt(leseKopf(text), passwort, direkteKrypto, KATALOG)
}

describe('Export und Import (Spezifikation 9.2)', () => {
  it('T-E01: unverschlüsselt hin und zurück → Datenbestand tief gleich', async () => {
    const daten = bestand()
    const { text, datei } = await erzeugeExport({ bestand: daten, umfang: 'alles', passwort: null, jetzt: JETZT, programm: PROGRAMM, krypto: direkteKrypto })
    expect(datei).toMatchObject({ format: 'sicherheitscheck', formatVersion: 1, erstellt: '2026-11-11T12:00:00.000Z', programm: PROGRAMM, umfang: 'alles', verschluesselung: null })
    expect(await importiere(text, null)).toEqual(daten)
  })

  it('T-E02: verschlüsselt hin und zurück → tief gleich; der Dateitext enthält den Betriebsnamen nicht', async () => {
    const daten = bestand()
    const { text, datei } = await erzeugeExport({ bestand: daten, umfang: 'alles', passwort: PASSWORT, jetzt: JETZT, programm: PROGRAMM, krypto: direkteKrypto, kdf: KDF_TEST })
    expect(text).not.toContain('Tischlerei')
    expect(text).not.toContain('Bäckerei')
    expect(text).not.toContain('Erika')
    expect(datei.verschluesselung).toMatchObject({ verfahren: 'AES-256-GCM', kdf: 'Argon2id', speicherKiB: 64, durchlaeufe: 1, parallelitaet: 1 })
    expect(await importiere(text, PASSWORT)).toEqual(daten)
  })

  it('nutzt standardmäßig Argon2id mit 64 MiB, 3 Durchläufen, Parallelität 1, neues Salz und neuen IV je Export', async () => {
    const daten = { ...leererBestand(), betriebe: [neuerBetrieb('Klein', JETZT, 'k')] }
    const eins = await erzeugeExport({ bestand: daten, umfang: 'alles', passwort: PASSWORT, jetzt: JETZT, programm: PROGRAMM, krypto: direkteKrypto })
    const zwei = await erzeugeExport({ bestand: daten, umfang: 'alles', passwort: PASSWORT, jetzt: JETZT, programm: PROGRAMM, krypto: direkteKrypto })
    const v1 = eins.datei.verschluesselung!
    const v2 = zwei.datei.verschluesselung!
    expect(v1).toMatchObject({ speicherKiB: 65_536, durchlaeufe: 3, parallelitaet: 1 })
    expect(atob(v1.salzB64)).toHaveLength(16)
    expect(atob(v1.ivB64)).toHaveLength(12)
    expect(v1.salzB64).not.toBe(v2.salzB64)
    expect(v1.ivB64).not.toBe(v2.ivB64)
    expect(eins.datei.inhalt).not.toBe(zwei.datei.inhalt)
    expect(await importiere(eins.text, PASSWORT)).toEqual(daten)
  }, LANGSAM)

  it('T-E03: falsches Passwort → „Passwort falsch oder Datei beschädigt.“', async () => {
    const { text } = await erzeugeExport({ bestand: bestand(), umfang: 'alles', passwort: PASSWORT, jetzt: JETZT, programm: PROGRAMM, krypto: direkteKrypto, kdf: KDF_TEST })
    await expect(importiere(text, 'falsches Passwort 123')).rejects.toThrow(new Entschluesselungsfehler())
    await expect(importiere(text, 'falsches Passwort 123')).rejects.toThrow('Passwort falsch oder Datei beschädigt.')
  })

  it('T-E04: geändertes „erstellt“ → Entschlüsselung scheitert', async () => {
    const { datei } = await erzeugeExport({ bestand: bestand(), umfang: 'alles', passwort: PASSWORT, jetzt: JETZT, programm: PROGRAMM, krypto: direkteKrypto, kdf: KDF_TEST })
    const verfaelscht = JSON.stringify({ ...datei, erstellt: '2026-11-12T12:00:00.000Z' })
    await expect(importiere(verfaelscht, PASSWORT)).rejects.toBeInstanceOf(Entschluesselungsfehler)
  })

  it('T-E05: formatVersion 99 → „Die Datei stammt aus einer neueren Version.“', async () => {
    const { datei } = await erzeugeExport({ bestand: bestand(), umfang: 'alles', passwort: null, jetzt: JETZT, programm: PROGRAMM, krypto: direkteKrypto })
    expect(() => leseKopf(JSON.stringify({ ...datei, formatVersion: 99 }))).toThrow(new ImportFehler('Die Datei stammt aus einer neueren Version.'))
  })

  it('T-E06: bekannte Betriebs-ID mit Wahl „als Kopie“ → neue Kennungen, Name mit „(Kopie)“', async () => {
    const daten = bestand()
    const { text } = await erzeugeExport({ bestand: daten, umfang: 'betrieb', betriebId: daten.betriebe[0].id, passwort: null, jetzt: JETZT, programm: PROGRAMM, krypto: direkteKrypto })
    const neu = await importiere(text, null)
    expect(bekannteBetriebe(daten, neu).map((b) => b.id)).toEqual([daten.betriebe[0].id])

    const z = fuehreZusammen(daten, neu, { [daten.betriebe[0].id]: 'kopie' }, { umfang: 'betrieb', einstellungenUebernehmen: false }, zaehler('kopie'))
    expect(z).toMatchObject({ hinzugefuegt: 0, kopiert: 1, ersetzt: 0, uebersprungen: 0 })
    const original = daten.betriebe[0]
    const kopie = z.bestand.betriebe[2]
    expect(z.bestand.betriebe.slice(0, 2)).toEqual(daten.betriebe)
    expect(kopie.name).toBe('Tischlerei Beispiel GmbH (fiktiv) (Kopie)')
    expect(kopie.id).not.toBe(original.id)
    const alteIds = new Set([original.id, ...original.pruefungen.map((p) => p.id), ...original.pruefungen.flatMap((p) => p.massnahmen.map((m) => m.id))])
    const neueIds = [kopie.id, ...kopie.pruefungen.map((p) => p.id), ...kopie.pruefungen.flatMap((p) => p.massnahmen.map((m) => m.id))]
    expect(neueIds.filter((i) => alteIds.has(i))).toEqual([])
    // Verweis der Wiederholungsprüfung zeigt auf die kopierte Vorgängerprüfung
    expect(kopie.pruefungen[1].vorgaengerId).toBe(kopie.pruefungen[0].id)
  })

  it('T-E07: Umfang „betrieb“ in der Datei auf „alles“ geändert → Entschlüsselung scheitert, Bestand unverändert', async () => {
    const daten = bestand()
    const vorher = structuredClone(daten)
    const { datei } = await erzeugeExport({ bestand: daten, umfang: 'betrieb', betriebId: 'b-2', passwort: PASSWORT, jetzt: JETZT, programm: PROGRAMM, krypto: direkteKrypto, kdf: KDF_TEST })
    const verfaelscht = JSON.stringify({ ...datei, umfang: 'alles' })
    await expect(importiere(verfaelscht, PASSWORT)).rejects.toBeInstanceOf(Entschluesselungsfehler)
    expect(daten).toEqual(vorher)
  })

  it('T-E08: verschlüsselter Export eines Betriebs heißt „Sicherheitscheck-Betrieb-2026-11-11.sicherheitscheck“', async () => {
    const daten = bestand()
    const { dateiname: name, text } = await erzeugeExport({ bestand: daten, umfang: 'betrieb', betriebId: 'b-2', passwort: PASSWORT, jetzt: JETZT, programm: PROGRAMM, krypto: direkteKrypto, kdf: KDF_TEST })
    expect(name).toBe('Sicherheitscheck-Betrieb-2026-11-11.sicherheitscheck')
    expect(text).not.toContain('Bäckerei')
  })

  it('T-E09: verschlüsselte Datei mit formatVersion 0 → erst entschlüsselt, dann migriert, dann geprüft', async () => {
    // Ein Datenbestand in einem gedachten Format 0 ohne „letzteSicherung“
    const alt = structuredClone(bestand()) as unknown as Record<string, unknown>
    alt.formatVersion = 0
    delete (alt.einstellungen as Record<string, unknown>).letzteSicherung
    const kopf = { format: 'sicherheitscheck', formatVersion: 0, erstellt: JETZT.toISOString(), programm: 'Sicherheitscheck 0.0.9', umfang: 'alles' as const }
    const v = await direkteKrypto.verschluessele(JSON.stringify(alt), PASSWORT, aadFuer(kopf), KDF_TEST)
    const text = JSON.stringify({ ...kopf, verschluesselung: { verfahren: 'AES-256-GCM', kdf: 'Argon2id', ...KDF_TEST, salzB64: v.salzB64, ivB64: v.ivB64 }, inhalt: v.chiffratB64 })

    const reihenfolge: string[] = []
    const krypto = {
      ...direkteKrypto,
      entschluessele: async (...args: Parameters<typeof direkteKrypto.entschluessele>) => {
        reihenfolge.push('entschlüsselt')
        return direkteKrypto.entschluessele(...args)
      },
    }
    const migration0 = vi.fn((d: Record<string, unknown>) => {
      reihenfolge.push('migriert')
      // sieht den Klartext, nicht das Chiffrat
      expect(d.betriebe).toHaveLength(2)
      ;(d.einstellungen as Record<string, unknown>).letzteSicherung = null
    })
    const geladen = await leseInhalt(leseKopf(text), PASSWORT, krypto, KATALOG, { 0: migration0 })
    expect(reihenfolge).toEqual(['entschlüsselt', 'migriert'])
    expect(geladen).toEqual(bestand())

    // Ohne Migration schlägt die Prüfung fehl: Format 0 wird nicht unterstützt
    await expect(leseInhalt(leseKopf(text), PASSWORT, direkteKrypto, KATALOG)).rejects.toThrow('Datenformat 0 wird nicht unterstützt.')
  })

  it('Export mit 50 Prüfungen und den Standardparametern dauert unter 5 s', async () => {
    const b = beispielBetrieb(KATALOG, HEUTE)
    const vorlage = b.pruefungen[0]
    const pruefungen = Array.from({ length: 50 }, (_, i) => ({ ...structuredClone(vorlage), id: `p-${i + 1}`, nr: i + 1 }))
    const daten: Datenbestand = { ...leererBestand(), betriebe: [{ ...b, pruefungen }] }
    const start = performance.now()
    const { text } = await erzeugeExport({ bestand: daten, umfang: 'alles', passwort: PASSWORT, jetzt: JETZT, programm: PROGRAMM, krypto: direkteKrypto, kdf: KDF_STANDARD })
    const dauer = performance.now() - start
    expect(dauer).toBeLessThan(5000)
    expect(text.length).toBeGreaterThan(100_000)
  }, LANGSAM)
})

describe('Import: Fehler lassen den Bestand unverändert', () => {
  it('erkennt kaputte und fremde Dateien', () => {
    expect(() => leseKopf('{nicht json')).toThrow('Die Datei ist kein gültiges JSON.')
    expect(() => leseKopf(JSON.stringify({ format: 'prozesslotse' }))).toThrow('Die Datei ist keine Sicherheitscheck-Datei.')
    expect(() => leseKopf(JSON.stringify({ format: 'sicherheitscheck', formatVersion: 'eins' }))).toThrow('Die Datei hat keine gültige Formatversion.')
  })

  it('lehnt riesige Schlüsselparameter ab', async () => {
    const { datei } = await erzeugeExport({ bestand: bestand(), umfang: 'alles', passwort: PASSWORT, jetzt: JETZT, programm: PROGRAMM, krypto: direkteKrypto, kdf: KDF_TEST })
    const boese = { ...datei, verschluesselung: { ...datei.verschluesselung!, speicherKiB: 64 * 1024 * 1024 } }
    expect(() => leseKopf(JSON.stringify(boese))).toThrow('Die Schlüsselparameter der Datei sind ungültig.')
  })

  it('verlangt ein Passwort für verschlüsselte Dateien', async () => {
    const { text } = await erzeugeExport({ bestand: bestand(), umfang: 'alles', passwort: PASSWORT, jetzt: JETZT, programm: PROGRAMM, krypto: direkteKrypto, kdf: KDF_TEST })
    await expect(importiere(text, null)).rejects.toThrow('Die Datei ist verschlüsselt; bitte das Passwort eingeben.')
  })

  it('lehnt eine Datei mit fehlerhaftem Betrieb ganz ab', async () => {
    const { datei } = await erzeugeExport({ bestand: bestand(), umfang: 'alles', passwort: null, jetzt: JETZT, programm: PROGRAMM, krypto: direkteKrypto })
    const inhalt = structuredClone(datei.inhalt as Datenbestand)
    inhalt.betriebe[1].name = ''
    await expect(importiere(JSON.stringify({ ...datei, inhalt }), null)).rejects.toThrow(new ImportFehler('Betrieb 2: Name fehlt.'))
  })

  it('verschlüsselt nur mit mindestens 12 Zeichen', async () => {
    await expect(erzeugeExport({ bestand: bestand(), umfang: 'alles', passwort: 'zu kurz', jetzt: JETZT, programm: PROGRAMM, krypto: direkteKrypto, kdf: KDF_TEST })).rejects.toThrow(
      'Das Passwort braucht mindestens 12 Zeichen.',
    )
  })

  it('ein verändertes Chiffrat fällt auf', async () => {
    const { datei } = await erzeugeExport({ bestand: bestand(), umfang: 'alles', passwort: PASSWORT, jetzt: JETZT, programm: PROGRAMM, krypto: direkteKrypto, kdf: KDF_TEST })
    const bytes = Uint8Array.from(atob(datei.inhalt as string), (c) => c.charCodeAt(0))
    bytes[10] ^= 1
    const verfaelscht: Exportdatei = { ...datei, inhalt: zuBase64(bytes) }
    await expect(importiere(JSON.stringify(verfaelscht), PASSWORT)).rejects.toBeInstanceOf(Entschluesselungsfehler)
  })
})

describe('Zusammenführen', () => {
  it('fügt Unbekanntes hinzu, ersetzt oder überspringt Bekanntes nach Wahl', () => {
    const daten = bestand()
    const geaendert = { ...daten.betriebe[1], notiz: 'aus der Datei' }
    const fremd = neuerBetrieb('Neu GmbH', JETZT, 'b-neu')
    const neu: Datenbestand = { ...daten, betriebe: [daten.betriebe[0], geaendert, fremd] }
    const z = fuehreZusammen(daten, neu, { [daten.betriebe[1].id]: 'ersetzen' }, { umfang: 'alles', einstellungenUebernehmen: false })
    expect(z).toMatchObject({ hinzugefuegt: 1, ersetzt: 1, uebersprungen: 1, kopiert: 0 })
    expect(z.bestand.betriebe.map((b) => b.id)).toEqual([daten.betriebe[0].id, 'b-2', 'b-neu'])
    expect(z.bestand.betriebe[1].notiz).toBe('aus der Datei')
  })

  it('übernimmt Einstellungen nur bei Umfang „alles“ und ausdrücklicher Wahl', () => {
    const daten = bestand()
    const neu: Datenbestand = { ...daten, einstellungen: { ...daten.einstellungen, darstellung: 'dunkel' } }
    expect(fuehreZusammen(daten, neu, {}, { umfang: 'alles', einstellungenUebernehmen: false }).bestand.einstellungen.darstellung).toBe('system')
    expect(fuehreZusammen(daten, neu, {}, { umfang: 'betrieb', einstellungenUebernehmen: true }).bestand.einstellungen.darstellung).toBe('system')
    expect(fuehreZusammen(daten, neu, {}, { umfang: 'alles', einstellungenUebernehmen: true }).bestand.einstellungen.darstellung).toBe('dunkel')
  })

  it('Kopie ohne Vorgänger bleibt ohne Vorgänger', () => {
    const b = alsKopie(neuePruefung(neuerBetrieb('X', JETZT, 'x'), KATALOG, 'R', HEUTE, JETZT, 'p').betrieb, zaehler())
    expect(b.pruefungen[0].vorgaengerId).toBeNull()
  })
})

describe('Dateinamen (6.11)', () => {
  it('Sicherung, Betrieb unverschlüsselt und verschlüsselt', () => {
    expect(dateiname('alles', null, true, '2026-11-11')).toBe('Sicherheitscheck-Sicherung-2026-11-11.sicherheitscheck')
    expect(dateiname('betrieb', 'Tischlerei Beispiel GmbH (fiktiv)', false, '2026-11-11')).toBe('Sicherheitscheck-Tischlerei-Beispiel-GmbH-fiktiv-2026-11-11.sicherheitscheck')
    expect(dateiname('betrieb', 'Tischlerei Beispiel GmbH (fiktiv)', true, '2026-11-11')).toBe('Sicherheitscheck-Betrieb-2026-11-11.sicherheitscheck')
  })

  it('behält Umlaute, ersetzt Sonderzeichen', () => {
    expect(sichererName('Bäckerei Müller & Söhne')).toBe('Bäckerei-Müller-Söhne')
    expect(sichererName('../../etc')).toBe('etc')
    expect(sichererName('???')).toBe('Betrieb')
  })
})
