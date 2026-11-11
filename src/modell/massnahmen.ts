/**
 * Maßnahmen ableiten, priorisieren, sortieren und abgleichen (Spezifikation 6.8).
 * Quellen sind nicht erfüllte, relevante Anforderungen und Befunde der Außenprüfung mit Stufe
 * kritisch, warnung oder hinweis. Prioritäten und Fristen sind eigene Festlegung (F6).
 */
import { mitDomain, regeltext } from '../katalog/regeltexte'
import { PRUEF_IDS, PRUEF_NAME } from '../pruefung/stufen'
import { istRelevant, wirksameBewertung } from './bewertung'
import { heuteLokal, istDatum, plusTage } from './datum'
import { neueId, type NeueId } from './kennung'
import type { Befund, Betrieb, Datum, Id, Katalog, Massnahme, MassnahmeQuelle, Prioritaet, Pruefung, Stufe } from './typen'

/** Frist in Tagen ab dem Datum des Interviews je Priorität (6.8, F6) */
export const FRIST_TAGE: Record<Prioritaet, number> = { 1: 14, 2: 90, 3: 180 }

export const PRIORITAET_TEXT: Record<Prioritaet, string> = { 1: 'Sofort', 2: 'Zeitnah', 3: 'Geplant' }

/** kritisch → 1, warnung → 2, hinweis → 3; sonst keine Maßnahme */
export function prioritaetFuerStufe(s: Stufe): Prioritaet | null {
  if (s === 'kritisch') return 1
  if (s === 'warnung') return 2
  if (s === 'hinweis') return 3
  return null
}

/** Schlüssel einer Ursache: Anforderung oder (pruefId, ziel) */
export function schluessel(q: MassnahmeQuelle): string {
  return q.art === 'anforderung' ? `a:${q.anforderungId}` : `b:${q.pruefId}|${q.ziel}`
}

export interface Soll {
  schluessel: string
  quelle: MassnahmeQuelle
  titel: string
  prioritaet: Prioritaet
}

/** Soll-Menge (6.8): relevante Anforderungen mit „nicht erfüllt“ und Befunde ab Stufe hinweis */
export function sollMassnahmen(k: Katalog, p: Pick<Pruefung, 'vorfragen' | 'antworten' | 'aussen'>): Soll[] {
  const soll: Soll[] = []
  for (const a of k.anforderungen) {
    if (!istRelevant(a, p) || wirksameBewertung(a, p) !== 'nicht_erfuellt') continue
    soll.push({ schluessel: `a:${a.id}`, quelle: { art: 'anforderung', anforderungId: a.id }, titel: a.titel, prioritaet: a.top ? 1 : 2 })
  }
  for (const b of p.aussen?.befunde ?? []) {
    const prioritaet = prioritaetFuerStufe(b.stufe)
    if (prioritaet === null) continue
    const quelle: MassnahmeQuelle = { art: 'befund', pruefId: b.pruefId, ziel: b.ziel }
    soll.push({ schluessel: schluessel(quelle), quelle, titel: `${regeltext(b.regel).titel} (${b.ziel})`, prioritaet })
  }
  return soll
}

export function wirksamePrioritaet(m: Massnahme): Prioritaet {
  return m.prioritaetManuell ?? m.prioritaet
}

/** Unberührt: offen, ohne Verantwortlichen, ohne Notiz, ohne eigene Priorität (6.8) */
export function unberuehrt(m: Massnahme): boolean {
  return m.status === 'offen' && m.verantwortlich.trim() === '' && m.notiz.trim() === '' && m.prioritaetManuell === null
}

/** Ein neuer, nicht abgebrochener Lauf hat für (pruefId, ziel) ok oder info ergeben. */
function widerlegt(p: Pick<Pruefung, 'aussen'>, q: Extract<MassnahmeQuelle, { art: 'befund' }>): boolean {
  if (!p.aussen || p.aussen.abgebrochen) return false
  const b = p.aussen.befunde.find((x) => x.pruefId === q.pruefId && x.ziel === q.ziel)
  return b !== undefined && (b.stufe === 'ok' || b.stufe === 'info')
}

/**
 * Abgleich (6.8), idempotent: Soll ohne Maßnahme → neu (offen, Frist nach Tabelle); Soll mit
 * Maßnahme → Priorität und Titel aktualisieren, Ursache besteht; Maßnahme ohne Soll → entfernen,
 * wenn unberührt, sonst „Ursache entfallen“. Maßnahmen aus Befunden gelten nur als „ohne Soll“,
 * wenn ein neuer Lauf die Ursache widerlegt. Gibt dieselbe Prüfung zurück, wenn sich nichts ändert.
 */
export function gleicheMassnahmenAb(k: Katalog, p: Pruefung, jetzt: Date, id: NeueId = neueId): Pruefung {
  const soll = sollMassnahmen(k, p)
  const sollNach = new Map(soll.map((s) => [s.schluessel, s]))
  const basis: Datum = istDatum(p.datum) ? p.datum : heuteLokal(jetzt)
  const gedeckt = new Set<string>()
  const massnahmen: Massnahme[] = []
  let geaendert = false

  for (const m of p.massnahmen) {
    const s = sollNach.get(schluessel(m.quelle))
    if (s) {
      gedeckt.add(s.schluessel)
      if (m.prioritaet !== s.prioritaet || m.titel !== s.titel || m.ursacheEntfallen) {
        massnahmen.push({ ...m, prioritaet: s.prioritaet, titel: s.titel, ursacheEntfallen: false })
        geaendert = true
      } else {
        massnahmen.push(m)
      }
      continue
    }
    if (m.quelle.art === 'befund' && !widerlegt(p, m.quelle)) {
      massnahmen.push(m)
    } else if (unberuehrt(m)) {
      geaendert = true
    } else if (!m.ursacheEntfallen) {
      massnahmen.push({ ...m, ursacheEntfallen: true })
      geaendert = true
    } else {
      massnahmen.push(m)
    }
  }

  for (const s of soll) {
    if (gedeckt.has(s.schluessel)) continue
    gedeckt.add(s.schluessel)
    geaendert = true
    massnahmen.push({
      id: id(),
      quelle: s.quelle,
      titel: s.titel,
      prioritaet: s.prioritaet,
      prioritaetManuell: null,
      begruendungManuell: '',
      frist: plusTage(basis, FRIST_TAGE[s.prioritaet]),
      verantwortlich: '',
      status: 'offen',
      notiz: '',
      erledigtAm: null,
      ursacheEntfallen: false,
    })
  }
  return geaendert ? { ...p, massnahmen, geaendert: jetzt.toISOString() } : p
}

/**
 * Sortierung (6.8): wirksame Priorität; Anforderungen vor Befunden; Anforderungen TOP vor Basis,
 * dann Themenbereich, dann Katalogreihenfolge; Befunde nach Stufe (schwerste zuerst), Reihenfolge
 * der PruefId, Ziel; zuletzt die Kennung.
 */
export function sortiereMassnahmen(k: Katalog, liste: Massnahme[]): Massnahme[] {
  const position = new Map(k.anforderungen.map((a, i) => [a.id, i]))
  const themaNr = new Map(k.themen.map((t) => [t.id, t.nr]))
  const ohne = Number.MAX_SAFE_INTEGER
  const rang = (m: Massnahme): number[] => {
    if (m.quelle.art === 'anforderung') {
      const id = m.quelle.anforderungId
      const a = k.anforderungen.find((x) => x.id === id)
      return [0, a ? (a.top ? 0 : 1) : 2, a ? (themaNr.get(a.thema) ?? ohne) : ohne, position.get(id) ?? ohne]
    }
    // die automatische Priorität folgt der Stufe: kritisch 1, warnung 2, hinweis 3
    const pruefId = PRUEF_IDS.indexOf(m.quelle.pruefId)
    return [1, m.prioritaet, pruefId < 0 ? ohne : pruefId, 0]
  }
  return [...liste].sort((x, y) => {
    const d = wirksamePrioritaet(x) - wirksamePrioritaet(y)
    if (d !== 0) return d
    const rx = rang(x)
    const ry = rang(y)
    for (let i = 0; i < rx.length; i++) if (rx[i] !== ry[i]) return rx[i] - ry[i]
    if (x.quelle.art === 'befund' && y.quelle.art === 'befund' && x.quelle.ziel !== y.quelle.ziel) return x.quelle.ziel.localeCompare(y.quelle.ziel)
    return x.id.localeCompare(y.id)
  })
}

export type MassnahmeFelder = Partial<Pick<Massnahme, 'status' | 'frist' | 'verantwortlich' | 'notiz'>>

/**
 * Ändert Status, Frist, Verantwortlichen oder Notiz; auch nach dem Abschluss (6.2).
 * „erledigt“ setzt das Erledigungsdatum, jeder andere Status löscht es. Ungültige Fristen bleiben unbeachtet.
 */
export function aendereMassnahme(p: Pruefung, massnahmeId: Id, felder: MassnahmeFelder, jetzt: Date): Pruefung {
  const alt = p.massnahmen.find((m) => m.id === massnahmeId)
  if (!alt) return p
  const neu: Massnahme = { ...alt, ...felder }
  if (felder.frist !== undefined && !istDatum(felder.frist)) neu.frist = alt.frist
  if (felder.status !== undefined) neu.erledigtAm = felder.status === 'erledigt' ? (alt.erledigtAm ?? heuteLokal(jetzt)) : null
  if (JSON.stringify(neu) === JSON.stringify(alt)) return p
  return { ...p, massnahmen: p.massnahmen.map((m) => (m.id === massnahmeId ? neu : m)), geaendert: jetzt.toISOString() }
}

export const FEHLT_BEGRUENDUNG_PRIORITAET = 'Bitte begründen, warum die Priorität von der automatischen abweicht.'

/**
 * Priorität von Hand (6.8, T-P05): Eine Abweichung braucht eine Begründung. `null` oder die
 * automatische Priorität heben die eigene Priorität auf.
 */
export function setzePrioritaet(p: Pruefung, massnahmeId: Id, prioritaet: Prioritaet | null, begruendung: string, jetzt: Date): { ok: true; pruefung: Pruefung } | { ok: false; fehler: string } {
  const alt = p.massnahmen.find((m) => m.id === massnahmeId)
  if (!alt) return { ok: true, pruefung: p }
  const eigene = prioritaet === null || prioritaet === alt.prioritaet ? null : prioritaet
  if (eigene !== null && begruendung.trim() === '') return { ok: false, fehler: FEHLT_BEGRUENDUNG_PRIORITAET }
  const neu: Massnahme = { ...alt, prioritaetManuell: eigene, begruendungManuell: eigene === null ? '' : begruendung.trim() }
  return { ok: true, pruefung: { ...p, massnahmen: p.massnahmen.map((m) => (m.id === massnahmeId ? neu : m)), geaendert: jetzt.toISOString() } }
}

/** offen oder in Arbeit */
export function istOffen(m: Massnahme): boolean {
  return m.status === 'offen' || m.status === 'in_arbeit'
}

/** Zähler für Übersicht und Startseite */
export function zaehleMassnahmen(liste: Massnahme[], heute: Datum): { alle: number; offen: number; erledigt: number; ueberfaellig: number } {
  return {
    alle: liste.length,
    offen: liste.filter(istOffen).length,
    erledigt: liste.filter((m) => m.status === 'erledigt').length,
    ueberfaellig: liste.filter((m) => istOffen(m) && m.frist < heute).length,
  }
}

/**
 * Befund zu einer Maßnahme mit der geprüften Domain: aus der Außenprüfung dieser Prüfung, sonst aus
 * der jüngsten früheren Prüfung des Betriebs (übernommene Maßnahmen einer Wiederholung haben noch
 * keinen neuen Lauf).
 */
export function befundZu(b: Pick<Betrieb, 'pruefungen'>, p: Pruefung, q: MassnahmeQuelle): { befund: Befund; domain: string } | null {
  if (q.art !== 'befund') return null
  const kandidaten = [p, ...b.pruefungen.filter((x) => x.nr < p.nr).sort((x, y) => y.nr - x.nr)]
  for (const x of kandidaten) {
    const befund = x.aussen?.befunde.find((f) => f.pruefId === q.pruefId && f.ziel === q.ziel)
    if (befund && x.aussen) return { befund, domain: x.aussen.domain }
  }
  return null
}

/** Ursache in Worten, z. B. „Anforderung 1.2 · Organisation & Sensibilisierung · TOP“ oder „Außenprüfung: DMARC · example.com“ */
export function ursacheText(k: Katalog, m: Massnahme): string {
  if (m.quelle.art === 'befund') return `Außenprüfung: ${PRUEF_NAME[m.quelle.pruefId]} · ${m.quelle.ziel}`
  const id = m.quelle.anforderungId
  const a = k.anforderungen.find((x) => x.id === id)
  if (!a) return `Anforderung ${id}`
  const thema = k.themen.find((t) => t.id === a.thema)
  return `Anforderung ${a.normNr} · ${thema?.name ?? a.thema}${a.top ? ' · TOP' : ''}`
}

/**
 * Was zu tun ist: die Handlungsempfehlung der Anforderung bzw. die Maßnahme der Hauptregel; die
 * Maßnahmen weiterer Regeln ab Stufe hinweis erscheinen als Unterpunkte (6.8).
 */
export function wasZuTun(k: Katalog, b: Pick<Betrieb, 'pruefungen'>, p: Pruefung, m: Massnahme): { text: string | null; unterpunkte: string[] } {
  if (m.quelle.art === 'anforderung') {
    const id = m.quelle.anforderungId
    return { text: k.anforderungen.find((a) => a.id === id)?.massnahme ?? null, unterpunkte: [] }
  }
  const gefunden = befundZu(b, p, m.quelle)
  if (!gefunden) return { text: null, unterpunkte: [] }
  const { befund, domain } = gefunden
  const texte = [befund.regel, ...befund.weitere.filter((w) => prioritaetFuerStufe(w.stufe) !== null).map((w) => w.regel)].map((r) => regeltext(r).massnahme)
  const [text, ...unterpunkte] = texte.map((t) => (t === null ? null : mitDomain(t, domain)))
  return { text, unterpunkte: unterpunkte.filter((t): t is string => t !== null) }
}
