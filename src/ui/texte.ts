/** Anzeigetexte für Werte des Datenmodells */
import type { Bestaetigung, Bewertung, MassnahmeStatus, Modus, Prioritaet, Pruefung, Stufe, TeilnahmeRolle } from '../modell/typen'
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

/** Jede Stufe hat Symbol und Wort (5.1) */
export const STUFE_TEXT: Record<Stufe, string> = {
  ok: 'In Ordnung',
  info: 'Information',
  hinweis: 'Hinweis',
  warnung: 'Warnung',
  kritisch: 'Kritisch',
  fehler: 'nicht prüfbar',
  nicht_geprueft: 'nicht geprüft',
}

export const STUFE_SYMBOL: Record<Stufe, SymbolArt> = {
  ok: 'haken',
  info: 'info',
  hinweis: 'hinweis',
  warnung: 'warnung',
  kritisch: 'kreuz',
  fehler: 'frage',
  nicht_geprueft: 'kreis',
}

const STUFE_ANZAHL: Record<Stufe, [string, string]> = {
  ok: ['in Ordnung', 'in Ordnung'],
  info: ['Information', 'Informationen'],
  hinweis: ['Hinweis', 'Hinweise'],
  warnung: ['Warnung', 'Warnungen'],
  kritisch: ['kritisch', 'kritisch'],
  fehler: ['nicht prüfbar', 'nicht prüfbar'],
  nicht_geprueft: ['nicht geprüft', 'nicht geprüft'],
}

/** „2 Warnungen“, „1 Hinweis“ */
export function stufeAnzahl(stufe: Stufe, n: number): string {
  return `${n} ${STUFE_ANZAHL[stufe][n === 1 ? 0 : 1]}`
}

export const ROLLE_BESTAETIGUNG_TEXT: Record<Bestaetigung['rolle'], string> = {
  verantwortlich: 'verantwortlich für die Domain',
  beauftragt: 'vom Inhaber beauftragt',
}

export const MODUS_TEXT: Record<Modus, string> = {
  browser: 'Browser: nur DNS-Prüfungen',
  desktop: 'Windows-Programm: DNS und Website',
}

export const MASSNAHME_STATUS_TEXT: Record<MassnahmeStatus, string> = {
  offen: 'offen',
  in_arbeit: 'in Arbeit',
  erledigt: 'erledigt',
  verworfen: 'verworfen',
}

export const MASSNAHME_STATUS_SYMBOL: Record<MassnahmeStatus, SymbolArt> = {
  offen: 'kreis',
  in_arbeit: 'pfeil',
  erledigt: 'haken',
  verworfen: 'strich',
}

/** Gruppen im Schritt Maßnahmen (5.8) */
export const PRIORITAET_GRUPPE: Record<Prioritaet, string> = {
  1: 'Sofort (Priorität 1)',
  2: 'Zeitnah (Priorität 2)',
  3: 'Geplant (Priorität 3)',
}
