/**
 * Export im offenen Format Beratungsakte v1 (Kopie der Bibliothek in src/beratungsakte).
 * Die Akte fasst zusammen, was Auswertung und Bericht einer Prüfung zeigen; gerechnet wird hier
 * nichts Neues, nur mit denselben Funktionen wie in der Oberfläche.
 *
 * - Kennzahlen: Statuswert (Punkte, Höchstwert, Prozent), Anteil je Themenbereich wie in der
 *   Tabelle zum Netzdiagramm, Anzahl nicht erfüllter Anforderungen (davon TOP), Anzahl der
 *   Befunde der Außenprüfung je Stufe (nur Stufen, die vorkommen, wie in der Auswertung) und die
 *   Zähler des Maßnahmenplans (offen, erledigt, überfällig).
 * - Befunde: relevante Anforderungen mit „nicht erfüllt“ (Ergebnis des Interviews) und Befunde der
 *   Außenprüfung dieser Prüfung mit Handlungsbedarf oder ohne Ergebnis.
 * - Maßnahmen: der Maßnahmenplan (Teil C des Berichts) in derselben Reihenfolge, mit Frist.
 *
 * Abbildung der Stufen:
 *
 * | Sicherheitscheck                         | Beratungsakte        |
 * | ---------------------------------------- | -------------------- |
 * | Anforderung nicht erfüllt, TOP           | Befund `hoch`        |
 * | Anforderung nicht erfüllt, Basis         | Befund `mittel`      |
 * | Außenprüfung `kritisch`                  | Befund `kritisch`    |
 * | Außenprüfung `warnung`                   | Befund `mittel`      |
 * | Außenprüfung `hinweis`                   | Befund `hinweis`     |
 * | Außenprüfung `fehler` (nicht prüfbar)    | Befund `hinweis`     |
 * | Außenprüfung `ok`, `info`, `nicht_geprueft` | kein Befund (nur Kennzahl) |
 * | Priorität 1 (Sofort)                     | Priorität `hoch`     |
 * | Priorität 2 (Zeitnah)                    | Priorität `mittel`   |
 * | Priorität 3 (Geplant)                    | Priorität `niedrig`  |
 *
 * Erledigte und verworfene Maßnahmen bleiben in der Akte; ihr Stand steht maschinenlesbar im
 * Namensraum (`status`, ggf. `erledigtAm`) und als Satz im Text.
 *
 * Es zählt die wirksame Priorität (eine Priorität von Hand geht vor). Die App schätzt keinen
 * Aufwand („nicht geschätzt“). Eine Maßnahme antwortet auf den Befund ihrer Ursache (Anforderung
 * bzw. Prüfung und Ziel), sofern er in der Akte steht; Maßnahmen einer Wiederholungsprüfung ohne
 * neuen Lauf haben ihren Befund nur in der Vorgängerprüfung und deshalb keinen Bezug.
 */
import { erzeugeBeratungsakte, zeitpunktMitVersatz, type Befund as AkteBefund, type Beratungsakte, type Kennzahl, type Massnahme as AkteMassnahme, type Prioritaet as AktePrioritaet, type Schwere } from '../beratungsakte/beratungsakte'
import { KATALOG_ABGEGLICHEN } from '../katalog'
import { mitDomain, regeltext } from '../katalog/regeltexte'
import { GRUPPEN, PRUEF_NAME, zaehleStufen } from '../pruefung/stufen'
import { antwortVon, berechneErgebnis, istRelevant, wirksameBewertung } from './bewertung'
import { datumDeutsch, heuteLokal, istDatum } from './datum'
import { PRIORITAET_TEXT, schluessel, sortiereMassnahmen, wasZuTun, wirksamePrioritaet, zaehleMassnahmen } from './massnahmen'
import type { Anforderung, Befund, Betrieb, Katalog, MassnahmeQuelle, Prioritaet, Pruefung, Stufe } from './typen'

export const APP_KENNUNG = 'sicherheitscheck'
export const APP_ANZEIGENAME = 'Sicherheitscheck'

/** Schwere eines Befunds der Außenprüfung; Stufen ohne Eintrag ergeben keinen Befund. */
export const STUFE_IN_AKTE: Partial<Record<Stufe, Schwere>> = {
  kritisch: 'kritisch',
  warnung: 'mittel',
  hinweis: 'hinweis',
  fehler: 'hinweis',
}

/** Schwere einer nicht erfüllten Anforderung */
export const ANFORDERUNG_IN_AKTE: Record<'top' | 'basis', Schwere> = { top: 'hoch', basis: 'mittel' }

export const PRIORITAET_IN_AKTE: Record<Prioritaet, AktePrioritaet> = { 1: 'hoch', 2: 'mittel', 3: 'niedrig' }

/** Namen der Stufen in den Kennzahlen (wie in der Oberfläche) */
const STUFE_NAME: Record<Stufe, string> = {
  kritisch: 'kritisch',
  warnung: 'Warnung',
  hinweis: 'Hinweis',
  fehler: 'nicht prüfbar',
  info: 'Information',
  ok: 'in Ordnung',
  nicht_geprueft: 'nicht geprüft',
}

export interface AkteAngaben {
  k: Katalog
  betrieb: Betrieb
  pruefung: Pruefung
  mandant: { name: string; kennung?: string }
  jetzt: Date
}

/** Vorbelegung für den Mandanten: der Name des Betriebs */
export function mandantAusBetrieb(b: Pick<Betrieb, 'name'>): string {
  return b.name.trim()
}

/** Kennungen in der Akte: nur ASCII-Buchstaben, Ziffern und `. _ : -`, höchstens 64 Zeichen, je Liste eindeutig. */
function kennungen() {
  const vergeben = new Set<string>()
  return (roh: string): string => {
    const basis = roh.replace(/[^A-Za-z0-9._:-]/g, '_').slice(0, 60) || 'eintrag'
    let k = basis
    for (let i = 2; vergeben.has(k); i++) k = `${basis}-${i}`
    vergeben.add(k)
    return k
  }
}

/** Schlüssel einer Ursache in der Akte: Anforderung oder (Prüfung, Ziel) */
function ursache(q: MassnahmeQuelle): string {
  return q.art === 'anforderung' ? `anforderung:${q.anforderungId}` : `aussen:${q.pruefId}:${q.ziel}`
}

function satz(text: string): string {
  const t = text.trim()
  return t === '' || /[.?!…]$/.test(t) ? t : `${t}.`
}

function themaName(k: Katalog, a: Anforderung): string {
  return k.themen.find((t) => t.id === a.thema)?.name ?? a.thema
}

function gruppeName(b: Befund): string {
  return GRUPPEN.find((g) => g.pruefIds.includes(b.pruefId))?.name ?? 'Außenprüfung'
}

/** Baut die Akte aus einer Prüfung. Wirft, wenn der Mandant fehlt. */
export function beratungsakteAusPruefung({ k, betrieb, pruefung: p, mandant, jetzt }: AkteAngaben): Beratungsakte {
  if (!mandant.name.trim()) throw new Error('Bitte den Mandanten angeben.')
  // wie der Bericht: eingefrorenes Ergebnis, im Entwurf berechnet
  const e = p.ergebnis ?? berechneErgebnis(k, p)
  const heute = heuteLokal(jetzt)
  const ns = (werte: Record<string, unknown>) => ({ [APP_KENNUNG]: werte })

  // ---------------- Befunde
  const nichtErfuellt = k.anforderungen.filter((a) => istRelevant(a, p) && wirksameBewertung(a, p) === 'nicht_erfuellt')
  const befundKennung = kennungen()
  const kennungZu = new Map<string, string>()
  const befunde: AkteBefund[] = []
  for (const a of nichtErfuellt) {
    const kennung = befundKennung(ursache({ art: 'anforderung', anforderungId: a.id }))
    kennungZu.set(schluessel({ art: 'anforderung', anforderungId: a.id }), kennung)
    const begruendung = antwortVon(p, a.id).begruendung.trim()
    befunde.push({
      kennung,
      schwere: ANFORDERUNG_IN_AKTE[a.top ? 'top' : 'basis'],
      text: `Nicht erfüllt${a.top ? ' (TOP-Anforderung)' : ''}: ${a.titel}.${begruendung ? ` Im Interview: ${satz(begruendung)}` : ''}`,
      fundstelle: `Interview, Anforderung ${a.normNr} (${themaName(k, a)})`,
      erweiterungen: ns({ anforderung: a.id, normNr: a.normNr, thema: a.thema, top: a.top }),
    })
  }
  const aussen = p.aussen
  for (const b of aussen?.befunde ?? []) {
    const schwere = STUFE_IN_AKTE[b.stufe]
    if (!schwere) continue
    const quelle: MassnahmeQuelle = { art: 'befund', pruefId: b.pruefId, ziel: b.ziel }
    const kennung = befundKennung(ursache(quelle))
    kennungZu.set(schluessel(quelle), kennung)
    const t = regeltext(b.regel)
    befunde.push({
      kennung,
      schwere,
      text: `${PRUEF_NAME[b.pruefId]}: ${satz(t.titel)} ${mitDomain(t.erklaerung, aussen!.domain)}`.trim(),
      fundstelle: `Außenprüfung, ${gruppeName(b)}: ${PRUEF_NAME[b.pruefId]} · ${b.ziel}`,
      erweiterungen: ns({
        pruefId: b.pruefId,
        ziel: b.ziel,
        stufe: b.stufe,
        regel: b.regel,
        ...(b.weitere.length > 0 ? { weitere: b.weitere.map((w) => w.regel) } : {}),
        ...(b.messwert ? { messwert: b.messwert } : {}),
      }),
    })
  }

  // ---------------- Maßnahmen (Reihenfolge wie im Maßnahmenplan)
  const massnahmeKennung = kennungen()
  const massnahmen: AkteMassnahme[] = sortiereMassnahmen(k, p.massnahmen).map((m) => {
    const prioritaet = wirksamePrioritaet(m)
    const { text, unterpunkte } = wasZuTun(k, betrieb, p, m)
    const zusatz = [
      m.status === 'erledigt' && `Bereits erledigt${m.erledigtAm ? ` am ${datumDeutsch(m.erledigtAm)}` : ''}.`,
      m.status === 'verworfen' && 'Verworfen.',
      m.ursacheEntfallen && 'Die Ursache ist entfallen.',
    ].filter(Boolean)
    const teile = [satz(m.titel), text ? satz(text) : '', unterpunkte.length > 0 ? `Außerdem: ${unterpunkte.map((u) => u.replace(/\.$/, '')).join('; ')}.` : '', ...zusatz]
    const bezug = kennungZu.get(schluessel(m.quelle))
    return {
      kennung: massnahmeKennung(ursache(m.quelle)),
      text: teile.filter(Boolean).join(' '),
      prioritaet: PRIORITAET_IN_AKTE[prioritaet],
      aufwand: 'nicht geschätzt',
      befunde: bezug ? [bezug] : [],
      frist: m.frist,
      erweiterungen: ns({
        prioritaet,
        prioritaetText: PRIORITAET_TEXT[prioritaet],
        ...(m.prioritaetManuell !== null ? { prioritaetAutomatisch: m.prioritaet, begruendungPrioritaet: m.begruendungManuell } : {}),
        status: m.status,
        ...(m.verantwortlich.trim() ? { verantwortlich: m.verantwortlich.trim() } : {}),
        ...(m.erledigtAm ? { erledigtAm: m.erledigtAm } : {}),
        ...(m.ursacheEntfallen ? { ursacheEntfallen: true } : {}),
      }),
    }
  })

  // ---------------- Kennzahlen
  const kennzahlen: Kennzahl[] = [
    { kennung: 'statuswert', name: 'Statuswert', wert: e.statuswert, einheit: 'Punkte', erweiterungen: ns({ rohpunkte: e.rohpunkte }) },
    { kennung: 'statuswert-maximal', name: 'Höchstmöglicher Statuswert', wert: e.maximal, einheit: 'Punkte' },
    { kennung: 'statuswert-prozent', name: 'Statuswert in Prozent des Höchstwerts', wert: e.prozent, einheit: '%' },
    ...[...k.themen]
      .sort((x, y) => x.nr - y.nr)
      .map((t): Kennzahl => {
        const te = e.jeThema[t.id]
        return {
          kennung: `thema-${t.id}`,
          name: `Themenbereich ${t.nr}: ${t.name}`,
          wert: te.anteil === null ? 'nicht bewertet' : Math.round(te.anteil * 100),
          einheit: te.anteil === null ? '' : '%',
          erweiterungen: ns({ punkte: te.roh, maximal: te.maximal }),
        }
      }),
    { kennung: 'anforderungen-nicht-erfuellt', name: 'Nicht erfüllte Anforderungen', wert: nichtErfuellt.length, einheit: 'Anzahl' },
    {
      kennung: 'top-nicht-erfuellt',
      name: 'Davon TOP-Anforderungen',
      wert: e.topNichtErfuellt.length,
      einheit: 'Anzahl',
      erweiterungen: ns({ normNr: e.topNichtErfuellt.map((id) => k.anforderungen.find((a) => a.id === id)?.normNr ?? id) }),
    },
    { kennung: 'anforderungen-nicht-relevant', name: 'Nicht bewertete Anforderungen (nicht relevant)', wert: e.nichtRelevant.length, einheit: 'Anzahl' },
    ...(aussen
      ? zaehleStufen(aussen.befunde).map(({ stufe, anzahl }): Kennzahl => ({ kennung: `aussen-${stufe.replace('_', '-')}`, name: `Außenprüfung: ${STUFE_NAME[stufe]}`, wert: anzahl, einheit: 'Anzahl' }))
      : []),
  ]
  const zaehler = zaehleMassnahmen(p.massnahmen, heute)
  kennzahlen.push(
    { kennung: 'massnahmen-offen', name: 'Maßnahmen offen oder in Arbeit', wert: zaehler.offen, einheit: 'Anzahl' },
    { kennung: 'massnahmen-erledigt', name: 'Maßnahmen erledigt', wert: zaehler.erledigt, einheit: 'Anzahl' },
    { kennung: 'massnahmen-ueberfaellig', name: 'Maßnahmen überfällig', wert: zaehler.ueberfaellig, einheit: 'Anzahl' },
  )

  const titel = `Sicherheitscheck ${betrieb.name.trim() || 'ohne Namen'}, Prüfung ${p.nr}${p.status === 'entwurf' ? ' (Entwurf)' : ''}`
  return erzeugeBeratungsakte({
    app: { kennung: APP_KENNUNG, name: APP_ANZEIGENAME, version: __VERSION__ },
    mandant: { name: mandant.name.trim(), kennung: mandant.kennung?.trim() || undefined },
    analyse: { art: 'sicherheitscheck', titel, stand: istDatum(p.datum) ? p.datum : zeitpunktMitVersatz(jetzt).slice(0, 10) },
    kennzahlen,
    befunde,
    massnahmen,
    erweiterungen: ns({
      pruefungNr: p.nr,
      status: p.status,
      katalogVersion: p.katalogVersion,
      katalogAbgeglichen: KATALOG_ABGEGLICHEN,
      ohneGeschaeftsfuehrung: e.ohneGeschaeftsfuehrung,
      ...(aussen ? { aussenpruefung: { domain: aussen.domain, modus: aussen.modus, datum: aussen.gestartet.slice(0, 10), abgebrochen: aussen.abgebrochen } } : {}),
    }),
    erzeugtAm: jetzt,
  })
}
