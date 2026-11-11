/** Anzeigetexte für Werte des Datenmodells */
import type { Bewertung, Pruefung, TeilnahmeRolle } from '../modell/typen'
import type { SymbolArt } from './Symbole'

export const BEWERTUNG_TEXT: Record<Bewertung, string> = {
  offen: 'offen',
  erfuellt: 'Erfüllt',
  nicht_erfuellt: 'Nicht erfüllt',
  nicht_relevant: 'Nicht relevant',
}

export const BEWERTUNG_SYMBOL: Record<Bewertung, SymbolArt> = {
  offen: 'kreis',
  erfuellt: 'haken',
  nicht_erfuellt: 'kreuz',
  nicht_relevant: 'strich',
}

export const ROLLE_TEXT: Record<TeilnahmeRolle, string> = {
  geschaeftsfuehrung: 'Geschäftsführung',
  it_intern: 'IT im Betrieb',
  it_extern: 'IT-Dienstleister',
  sonstige: 'Sonstige',
}

export const STATUS_TEXT: Record<Pruefung['status'], string> = {
  entwurf: 'Entwurf',
  abgeschlossen: 'Abgeschlossen',
}

/** „18 von 37 Punkten“ */
export function punkteText(statuswert: number, maximal: number): string {
  return `${statuswert} von ${maximal} ${maximal === 1 ? 'Punkt' : 'Punkten'}`
}

/** Zahl mit Vorzeichen, z. B. „−6“ oder „+3“ (echtes Minuszeichen) */
export function mitVorzeichen(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0'
}
