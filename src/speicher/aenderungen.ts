/**
 * Was seit dem letzten Speichern geändert wurde, und ein Puffer, der Änderungen sammelt und
 * verzögert schreibt (7.4: je Änderung den betroffenen Betrieb vollständig, 400 ms verzögert).
 */
import type { Betrieb, Datenbestand, Einstellungen, Id } from '../modell/typen'

export interface Aenderungen {
  betriebe: Betrieb[]
  geloescht: Id[]
  einstellungen: Einstellungen | null
}

export const KEINE_AENDERUNGEN: Aenderungen = { betriebe: [], geloescht: [], einstellungen: null }

/**
 * Vergleicht zwei Stände über Objektidentität: Die Operationen erzeugen für jeden geänderten
 * Betrieb ein neues Objekt und lassen unveränderte Betriebe gleich.
 */
export function aenderungenZwischen(vorher: Datenbestand, nachher: Datenbestand): Aenderungen {
  const alt = new Map(vorher.betriebe.map((b) => [b.id, b]))
  const neu = new Set(nachher.betriebe.map((b) => b.id))
  return {
    betriebe: nachher.betriebe.filter((b) => alt.get(b.id) !== b),
    geloescht: vorher.betriebe.filter((b) => !neu.has(b.id)).map((b) => b.id),
    einstellungen: vorher.einstellungen !== nachher.einstellungen ? nachher.einstellungen : null,
  }
}

export function istLeer(a: Aenderungen): boolean {
  return a.betriebe.length === 0 && a.geloescht.length === 0 && a.einstellungen === null
}

export type Speicherstatus = 'gespeichert' | 'ausstehend' | 'speichert' | 'fehler'

export interface Schreibziel {
  schreibe(a: Aenderungen): Promise<void>
}

/**
 * Sammelt Änderungen und schreibt sie nach `verzoegerung` ms in einem Rutsch.
 * `schreibeJetzt` schreibt sofort (vor dem Schließen der Seite, vor einem Export).
 */
export class Schreibpuffer {
  private betriebe = new Map<Id, Betrieb>()
  private geloescht = new Set<Id>()
  private einstellungen: Einstellungen | null = null
  private zeitgeber: ReturnType<typeof setTimeout> | undefined
  private laufend: Promise<void> = Promise.resolve()
  private fehlerZaehler = 0
  private readonly ziel: Schreibziel
  private readonly melde: (status: Speicherstatus) => void
  private readonly verzoegerung: number

  constructor(ziel: Schreibziel, melde: (status: Speicherstatus) => void, verzoegerung = 400) {
    this.ziel = ziel
    this.melde = melde
    this.verzoegerung = verzoegerung
  }

  merke(a: Aenderungen): void {
    if (istLeer(a)) return
    for (const b of a.betriebe) {
      this.betriebe.set(b.id, b)
      this.geloescht.delete(b.id)
    }
    for (const id of a.geloescht) {
      this.betriebe.delete(id)
      this.geloescht.add(id)
    }
    if (a.einstellungen) this.einstellungen = a.einstellungen
    this.melde('ausstehend')
    clearTimeout(this.zeitgeber)
    this.zeitgeber = setTimeout(() => void this.schreibeJetzt(), this.verzoegerung)
  }

  /** Verwirft Ausstehendes, z. B. vor „Alle Daten löschen“. */
  verwerfe(): void {
    clearTimeout(this.zeitgeber)
    this.zeitgeber = undefined
    this.betriebe.clear()
    this.geloescht.clear()
    this.einstellungen = null
  }

  get hatAusstehende(): boolean {
    return this.betriebe.size > 0 || this.geloescht.size > 0 || this.einstellungen !== null
  }

  /** Schreibt alles Ausstehende sofort; wartet auch auf einen laufenden Schreibvorgang. */
  schreibeJetzt(): Promise<void> {
    clearTimeout(this.zeitgeber)
    this.zeitgeber = undefined
    this.laufend = this.laufend.then(() => this.schreibe())
    return this.laufend
  }

  private async schreibe(): Promise<void> {
    if (!this.hatAusstehende) return
    const a: Aenderungen = { betriebe: [...this.betriebe.values()], geloescht: [...this.geloescht], einstellungen: this.einstellungen }
    this.betriebe.clear()
    this.geloescht.clear()
    this.einstellungen = null
    this.melde('speichert')
    try {
      await this.ziel.schreibe(a)
      this.fehlerZaehler = 0
      if (!this.hatAusstehende) this.melde('gespeichert')
    } catch {
      // Nichts verlieren: Neueres aus der Zwischenzeit hat Vorrang, der Rest kommt zurück in den Puffer
      for (const b of a.betriebe) if (!this.betriebe.has(b.id) && !this.geloescht.has(b.id)) this.betriebe.set(b.id, b)
      for (const id of a.geloescht) if (!this.betriebe.has(id)) this.geloescht.add(id)
      this.einstellungen ??= a.einstellungen
      this.fehlerZaehler += 1
      this.melde('fehler')
      // erneuter Versuch mit wachsendem Abstand
      clearTimeout(this.zeitgeber)
      this.zeitgeber = setTimeout(() => void this.schreibeJetzt(), Math.min(30_000, this.verzoegerung * 2 ** this.fehlerZaehler))
    }
  }
}
