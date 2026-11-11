/**
 * Export und Import als Datei `.sicherheitscheck` (Spezifikation 4 „Exportdatei“, 6.11).
 *
 * Import in fester Reihenfolge, bei jedem Fehler bleibt der Bestand unverändert:
 * 1. JSON lesen, `format` prüfen  2. neuere Version ablehnen  3. entschlüsseln (Kopfdaten
 * sind zusätzlich authentisiert)  4. erst dann migrieren  5. streng prüfen.
 */
import { heuteLokal } from '../modell/datum'
import { neueId, type NeueId } from '../modell/operationen'
import { FORMAT_VERSION, type Betrieb, type Datenbestand, type Datum, type Exportdatei, type Id, type Katalog, type Umfang, type Verschluesselung } from '../modell/typen'
import { KDF_STANDARD, type KdfParameter, type Krypto } from './krypto'
import { migriere, MIGRATIONEN, type Migrationen } from './migration'
import { Formatfehler, istObj, pruefeDatenbestand } from './pruefen'

export const ENDUNG = '.sicherheitscheck'
export const MAX_DATEIGROESSE = 50 * 1024 * 1024
export const MIN_PASSWORT = 12

export class ImportFehler extends Error {}

/** Zusätzlich authentisierte Daten: Ändert jemand Version, Zeitpunkt oder Umfang in der Datei, scheitert die Entschlüsselung. */
export function aadFuer(kopf: { formatVersion: number; erstellt: string; umfang: string }): string {
  return `sicherheitscheck;${kopf.formatVersion};${kopf.erstellt};${kopf.umfang}`
}

/** Buchstaben, Ziffern und „-“ bleiben; alles andere wird „-“ (mehrere zusammengefasst, am Rand entfernt). */
export function sichererName(name: string): string {
  return name.replace(/[^\p{L}\p{N}-]/gu, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '') || 'Betrieb'
}

/**
 * Dateiname nach 6.11. Verschlüsselte Dateien eines Betriebs tragen keinen Namen,
 * weil schon der Name verrät, wer geprüft wurde.
 */
export function dateiname(umfang: Umfang, betriebName: string | null, verschluesselt: boolean, heute: Datum): string {
  if (umfang === 'alles') return `Sicherheitscheck-Sicherung-${heute}${ENDUNG}`
  if (verschluesselt || !betriebName) return `Sicherheitscheck-Betrieb-${heute}${ENDUNG}`
  return `Sicherheitscheck-${sichererName(betriebName)}-${heute}${ENDUNG}`
}

export interface ExportOptionen {
  bestand: Datenbestand
  umfang: Umfang
  /** nur bei Umfang „betrieb“ */
  betriebId?: Id
  /** null = unverschlüsselt */
  passwort: string | null
  jetzt: Date
  /** z. B. 'Sicherheitscheck 0.1.0' */
  programm: string
  krypto: Krypto
  kdf?: KdfParameter
}

export interface Export {
  datei: Exportdatei
  text: string
  dateiname: string
}

export async function erzeugeExport(o: ExportOptionen): Promise<Export> {
  let inhalt: Datenbestand = o.bestand
  let name: string | null = null
  if (o.umfang === 'betrieb') {
    const b = o.bestand.betriebe.find((x) => x.id === o.betriebId)
    if (!b) throw new ImportFehler('Der Betrieb für den Export fehlt.')
    inhalt = { formatVersion: FORMAT_VERSION, einstellungen: o.bestand.einstellungen, betriebe: [b] }
    name = b.name
  }
  if (o.passwort !== null && o.passwort.length < MIN_PASSWORT) throw new ImportFehler(`Das Passwort braucht mindestens ${MIN_PASSWORT} Zeichen.`)

  const kopf = { format: 'sicherheitscheck' as const, formatVersion: FORMAT_VERSION as typeof FORMAT_VERSION, erstellt: o.jetzt.toISOString(), programm: o.programm, umfang: o.umfang }
  let datei: Exportdatei
  if (o.passwort === null) {
    datei = { ...kopf, verschluesselung: null, inhalt }
  } else {
    const kdf = o.kdf ?? KDF_STANDARD
    const v = await o.krypto.verschluessele(JSON.stringify(inhalt), o.passwort, aadFuer(kopf), kdf)
    datei = {
      ...kopf,
      verschluesselung: { verfahren: 'AES-256-GCM', kdf: 'Argon2id', speicherKiB: kdf.speicherKiB, durchlaeufe: kdf.durchlaeufe, parallelitaet: kdf.parallelitaet, salzB64: v.salzB64, ivB64: v.ivB64 },
      inhalt: v.chiffratB64,
    }
  }
  return { datei, text: JSON.stringify(datei, null, 2), dateiname: dateiname(o.umfang, name, o.passwort !== null, heuteLokal(o.jetzt)) }
}

/* ---------- Import ---------- */

/** Gelesene, noch nicht entschlüsselte Datei */
export interface Kopf {
  formatVersion: number
  erstellt: string
  programm: string
  umfang: Umfang
  verschluesselung: Verschluesselung | null
  inhalt: unknown
}

function fordere(bedingung: unknown, meldung: string): asserts bedingung {
  if (!bedingung) throw new ImportFehler(meldung)
}

const ganzzahlZwischen = (x: unknown, min: number, max: number) => Number.isInteger(x) && (x as number) >= min && (x as number) <= max

function pruefeVerschluesselung(v: unknown): asserts v is Verschluesselung {
  fordere(istObj(v) && v.verfahren === 'AES-256-GCM' && v.kdf === 'Argon2id', 'Die Datei nutzt ein unbekanntes Verschlüsselungsverfahren.')
  // Obergrenzen schützen vor Dateien, die den Rechner mit riesigen Parametern lahmlegen
  fordere(
    ganzzahlZwischen(v.speicherKiB, 8, 1_048_576) && ganzzahlZwischen(v.durchlaeufe, 1, 20) && ganzzahlZwischen(v.parallelitaet, 1, 8),
    'Die Schlüsselparameter der Datei sind ungültig.',
  )
  fordere(typeof v.salzB64 === 'string' && typeof v.ivB64 === 'string', 'Die Verschlüsselungsangaben der Datei sind unvollständig.')
}

/** Schritte 1 und 2: JSON lesen, Format und Version prüfen. */
export function leseKopf(text: string): Kopf {
  fordere(text.length <= MAX_DATEIGROESSE, 'Die Datei ist größer als 50 MB.')
  let d: unknown
  try {
    d = JSON.parse(text)
  } catch {
    throw new ImportFehler('Die Datei ist kein gültiges JSON.')
  }
  fordere(istObj(d) && d.format === 'sicherheitscheck', 'Die Datei ist keine Sicherheitscheck-Datei.')
  fordere(Number.isInteger(d.formatVersion), 'Die Datei hat keine gültige Formatversion.')
  fordere((d.formatVersion as number) <= FORMAT_VERSION, 'Die Datei stammt aus einer neueren Version.')
  fordere(typeof d.erstellt === 'string' && typeof d.programm === 'string', 'Die Kopfdaten der Datei sind unvollständig.')
  fordere(d.umfang === 'alles' || d.umfang === 'betrieb', 'Die Kopfdaten der Datei sind unvollständig.')
  if (d.verschluesselung !== null) {
    pruefeVerschluesselung(d.verschluesselung)
    fordere(typeof d.inhalt === 'string', 'Der verschlüsselte Inhalt fehlt.')
  }
  return {
    formatVersion: d.formatVersion as number,
    erstellt: d.erstellt,
    programm: d.programm,
    umfang: d.umfang,
    verschluesselung: d.verschluesselung as Verschluesselung | null,
    inhalt: d.inhalt,
  }
}

/**
 * Schritte 3 bis 5: entschlüsseln, migrieren, streng prüfen. Bei falschem Passwort wirft
 * die Krypto-Schicht Entschluesselungsfehler („Passwort falsch oder Datei beschädigt.“).
 */
export async function leseInhalt(kopf: Kopf, passwort: string | null, krypto: Krypto, k: Katalog, migrationen: Migrationen = MIGRATIONEN): Promise<Datenbestand> {
  let inhalt: unknown = kopf.inhalt
  if (kopf.verschluesselung) {
    fordere(passwort !== null, 'Die Datei ist verschlüsselt; bitte das Passwort eingeben.')
    const v = kopf.verschluesselung
    const klartext = await krypto.entschluessele(
      { salzB64: v.salzB64, ivB64: v.ivB64, chiffratB64: kopf.inhalt as string },
      passwort,
      aadFuer(kopf),
      { speicherKiB: v.speicherKiB, durchlaeufe: v.durchlaeufe, parallelitaet: v.parallelitaet },
    )
    try {
      inhalt = JSON.parse(klartext)
    } catch {
      throw new ImportFehler('Der entschlüsselte Inhalt ist kein gültiges JSON.')
    }
  }
  try {
    const migriert = migriere(inhalt, migrationen)
    return pruefeDatenbestand(migriert, k, { quelle: 'datei', streng: true }).bestand
  } catch (e) {
    if (e instanceof Formatfehler) throw new ImportFehler(e.message)
    throw e
  }
}

/* ---------- Zusammenführen ---------- */

export type Konfliktwahl = 'ersetzen' | 'kopie' | 'ueberspringen'

/** Importierte Betriebe, deren Kennung es schon gibt (Rückfrage nötig) */
export function bekannteBetriebe(bestand: Datenbestand, neu: Datenbestand): Betrieb[] {
  const ids = new Set(bestand.betriebe.map((b) => b.id))
  return neu.betriebe.filter((b) => ids.has(b.id))
}

/** Kopie mit neuen Kennungen für Betrieb, Prüfungen und Maßnahmen; Verweise auf Vorgänger werden umgestellt. */
export function alsKopie(b: Betrieb, id: NeueId = neueId): Betrieb {
  const neueIds = new Map(b.pruefungen.map((p) => [p.id, id()]))
  return {
    ...b,
    id: id(),
    name: `${b.name} (Kopie)`,
    pruefungen: b.pruefungen.map((p) => ({
      ...p,
      id: neueIds.get(p.id)!,
      vorgaengerId: p.vorgaengerId === null ? null : (neueIds.get(p.vorgaengerId) ?? null),
      massnahmen: p.massnahmen.map((m) => ({ ...m, id: id() })),
    })),
  }
}

export interface Zusammenfuehrung {
  bestand: Datenbestand
  hinzugefuegt: number
  ersetzt: number
  kopiert: number
  uebersprungen: number
}

export function fuehreZusammen(
  bestand: Datenbestand,
  neu: Datenbestand,
  wahl: Record<Id, Konfliktwahl>,
  optionen: { umfang: Umfang; einstellungenUebernehmen: boolean },
  id: NeueId = neueId,
): Zusammenfuehrung {
  const betriebe = [...bestand.betriebe]
  const z = { hinzugefuegt: 0, ersetzt: 0, kopiert: 0, uebersprungen: 0 }
  for (const b of neu.betriebe) {
    const index = betriebe.findIndex((x) => x.id === b.id)
    if (index < 0) {
      betriebe.push(b)
      z.hinzugefuegt++
      continue
    }
    const w = wahl[b.id] ?? 'ueberspringen'
    if (w === 'ersetzen') {
      betriebe[index] = b
      z.ersetzt++
    } else if (w === 'kopie') {
      betriebe.push(alsKopie(b, id))
      z.kopiert++
    } else {
      z.uebersprungen++
    }
  }
  // Einstellungen nur aus einer vollständigen Sicherung und nur auf ausdrücklichen Wunsch
  const einstellungen = optionen.umfang === 'alles' && optionen.einstellungenUebernehmen ? neu.einstellungen : bestand.einstellungen
  return { bestand: { ...bestand, einstellungen, betriebe }, ...z }
}
