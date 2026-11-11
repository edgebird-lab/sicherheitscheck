/**
 * Ein Lauf der Außenprüfung (Spezifikation 6.4, 6.7): Zwischenspeicher je Lauf, Wiederholversuch,
 * Grenzen, Abbruch und Abrufprotokoll. Die Regeln fragen nur über einen Lauf ab, nie direkt über
 * das Netz. Zeit und Warten kommen von außen, damit Tests ohne echte Wartezeit auskommen.
 */
import type { Abruf, DnsAntwort, DnsTyp, HttpAntwort, Netz, NetzFehler, TlsInfo } from '../modell/typen'
import { dnsErgebnisText, istNetzFehler, normName, wiederholbar } from '../netz/schnittstelle'

export interface Grenzen {
  dns: number
  http: number
  tls: number
  /** Zeit je Lauf in Millisekunden */
  laufMs: number
}

/** Grenzen je Lauf (6.7, eigene Festlegung); Tests verkleinern sie. */
export const STANDARD_GRENZEN: Grenzen = { dns: 40, http: 32, tls: 3, laufMs: 120_000 }
/** Abstand vor dem Wiederholversuch einer DNS-Abfrage (6.4) */
export const WIEDERHOLUNG_NACH_MS = 500
/** Mindestabstand zwischen zwei HTTP-Abrufen (6.7) */
export const HTTP_ABSTAND_MS = 250

export type LaufEndeGrund = 'grenze' | 'abgebrochen'

/** Grenze erreicht oder Lauf abgebrochen: Die laufende Prüfung endet mit Stufe fehler (6.7). */
export class LaufEnde extends Error {
  readonly grund: LaufEndeGrund
  constructor(grund: LaufEndeGrund) {
    super(grund === 'grenze' ? 'Grenze erreicht' : 'abgebrochen')
    this.grund = grund
  }
}

export interface LaufUmgebung {
  /** Uhrzeit für Protokoll und Bestätigung */
  jetzt: () => Date
  /** fortlaufende Millisekunden für Dauer und Zeitgrenze */
  uhr: () => number
  warte: (ms: number, signal?: AbortSignal) => Promise<void>
  signal?: AbortSignal
  grenzen: Grenzen
}

/** Wartet ms Millisekunden; ein Abbruch beendet das Warten mit LaufEnde. */
export function warteMs(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((fertig, fehler) => {
    if (signal?.aborted) {
      fehler(new LaufEnde('abgebrochen'))
      return
    }
    const abbruch = () => {
      clearTimeout(uhr)
      fehler(new LaufEnde('abgebrochen'))
    }
    const uhr = setTimeout(() => {
      signal?.removeEventListener('abort', abbruch)
      fertig()
    }, ms)
    signal?.addEventListener('abort', abbruch, { once: true })
  })
}

export function laufUmgebung(teil: Partial<Omit<LaufUmgebung, 'grenzen'>> & { grenzen?: Partial<Grenzen> } = {}): LaufUmgebung {
  return {
    jetzt: teil.jetzt ?? (() => new Date()),
    uhr: teil.uhr ?? (() => performance.now()),
    warte: teil.warte ?? warteMs,
    signal: teil.signal,
    grenzen: { ...STANDARD_GRENZEN, ...teil.grenzen },
  }
}

/** Verbindet ein Versprechen mit dem Abbruch: Wird abgebrochen, endet das Warten sofort. */
function mitAbbruch<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return p
  if (signal.aborted) return Promise.reject(new LaufEnde('abgebrochen'))
  return new Promise((fertig, fehler) => {
    const abbruch = () => fehler(new LaufEnde('abgebrochen'))
    signal.addEventListener('abort', abbruch, { once: true })
    p.then(
      (wert) => {
        signal.removeEventListener('abort', abbruch)
        fertig(wert)
      },
      (grund: unknown) => {
        signal.removeEventListener('abort', abbruch)
        fehler(grund)
      },
    )
  })
}

function httpText(r: HttpAntwort): string {
  const ziel = r.kopfzeilen.find(([name]) => name === 'location')?.[1]
  return ziel ? `${r.status} → ${ziel}` : String(r.status)
}

export class Lauf {
  /** jeder Abruf genau einmal, in der Reihenfolge des Beginns (6.7) */
  readonly protokoll: Abruf[] = []
  private readonly zaehler: Record<Abruf['art'], number> = { dns: 0, http: 0, tls: 0 }
  private readonly zwischenspeicher = new Map<string, Promise<DnsAntwort | NetzFehler>>()
  private readonly httpSpeicher = new Map<string, Promise<HttpAntwort | NetzFehler>>()
  private readonly netz: Netz
  private readonly u: LaufUmgebung
  private readonly beginn: number
  private letzterHttpAbruf: number | null = null

  constructor(netz: Netz, umgebung: LaufUmgebung) {
    this.netz = netz
    this.u = umgebung
    this.beginn = umgebung.uhr()
  }

  get modus() {
    return this.netz.modus
  }

  get abgebrochen(): boolean {
    return this.u.signal?.aborted === true
  }

  anzahl(art: Abruf['art']): number {
    return this.zaehler[art]
  }

  /** DNS-Abfrage; gleiche Abfragen (Name, Typ, cd) gehen je Lauf nur einmal ans Netz (6.4). */
  dns(name: string, typ: DnsTyp, ohneDnssecPruefung = false): Promise<DnsAntwort | NetzFehler> {
    const n = normName(name)
    const schluessel = `${typ} ${n}${ohneDnssecPruefung ? ' cd' : ''}`
    let ergebnis = this.zwischenspeicher.get(schluessel)
    if (!ergebnis) {
      ergebnis = this.dnsMitWiederholung(n, typ, ohneDnssecPruefung)
      this.zwischenspeicher.set(schluessel, ergebnis)
    }
    return ergebnis
  }

  /** Ein Wiederholversuch nach 500 ms bei Netzfehler oder HTTP 5xx; jeder Versuch zählt und steht im Protokoll. */
  private async dnsMitWiederholung(name: string, typ: DnsTyp, cd: boolean): Promise<DnsAntwort | NetzFehler> {
    const anfrage = `${typ} ${name}${cd ? ' (ohne DNSSEC-Prüfung)' : ''}`
    const ausfuehren = () => this.netz.dns(name, typ, cd)
    const text = (r: DnsAntwort | NetzFehler) => dnsErgebnisText(r, typ)
    const erst = await this.abruf('dns', anfrage, ausfuehren, text)
    if (!istNetzFehler(erst) || !wiederholbar(erst)) return erst
    await this.u.warte(WIEDERHOLUNG_NACH_MS, this.u.signal)
    try {
      this.pruefeGrenzen('dns')
    } catch (e) {
      // Ist die Grenze erreicht, bleibt es beim ersten Fehler
      if (e instanceof LaufEnde && e.grund === 'grenze') return erst
      throw e
    }
    return this.abruf('dns', `${anfrage}, Wiederholung`, ausfuehren, text)
  }

  /**
   * HTTP-Abruf ohne Weiterleitung (nur Windows-Programm), mindestens 250 ms nach dem vorigen.
   * Dieselbe Adresse ruft ein Lauf nur einmal ab (eigene Festlegung, wie bei DNS): Mehrere Ketten
   * enden oft auf derselben Startseite. Ein abgebrochener Abruf wird nicht gemerkt.
   */
  http(url: string): Promise<HttpAntwort | NetzFehler> {
    let ergebnis = this.httpSpeicher.get(url)
    if (!ergebnis) {
      ergebnis = this.httpAbruf(url)
      this.httpSpeicher.set(url, ergebnis)
      ergebnis.catch(() => this.httpSpeicher.delete(url))
    }
    return ergebnis
  }

  private async httpAbruf(url: string): Promise<HttpAntwort | NetzFehler> {
    if (this.letzterHttpAbruf !== null) {
      const rest = this.letzterHttpAbruf + HTTP_ABSTAND_MS - this.u.uhr()
      if (rest > 0) await this.u.warte(rest, this.u.signal)
    }
    try {
      return await this.abruf('http', `GET ${url}`, () => this.netz.http(url), (r) => (istNetzFehler(r) ? r.text : httpText(r)))
    } finally {
      this.letzterHttpAbruf = this.u.uhr()
    }
  }

  /** TLS-Verbindung zu Port 443 (nur Windows-Programm) */
  tls(host: string): Promise<TlsInfo | NetzFehler> {
    return this.abruf('tls', `TLS ${host}:443`, () => this.netz.tls(host), (r) => (istNetzFehler(r) ? r.text : r.version))
  }

  private pruefeGrenzen(art: Abruf['art']) {
    if (this.abgebrochen) throw new LaufEnde('abgebrochen')
    if (this.u.uhr() - this.beginn >= this.u.grenzen.laufMs) throw new LaufEnde('grenze')
    if (this.zaehler[art] >= this.u.grenzen[art]) throw new LaufEnde('grenze')
  }

  private async abruf<T>(art: Abruf['art'], anfrage: string, ausfuehren: () => Promise<T | NetzFehler>, ergebnisText: (r: T | NetzFehler) => string): Promise<T | NetzFehler> {
    this.pruefeGrenzen(art)
    this.zaehler[art]++
    const eintrag: Abruf = { zeit: this.u.jetzt().toISOString(), art, anfrage, ergebnis: '', dauerMs: 0 }
    this.protokoll.push(eintrag)
    const beginn = this.u.uhr()
    try {
      const r = await mitAbbruch(ausfuehren(), this.u.signal)
      eintrag.ergebnis = ergebnisText(r)
      return r
    } catch (e) {
      if (e instanceof LaufEnde) {
        eintrag.ergebnis = 'abgebrochen'
        throw e
      }
      // Das Netz soll Fehler als NetzFehler liefern; eine Ausnahme wird zu einem solchen
      const fehler: NetzFehler = { fehler: 'verbindung', text: e instanceof Error ? e.message : String(e) }
      eintrag.ergebnis = fehler.text
      return fehler
    } finally {
      eintrag.dauerMs = Math.max(0, Math.round(this.u.uhr() - beginn))
    }
  }
}
