/**
 * Kalendertage ('JJJJ-MM-TT') und Zeitpunkte. Rechnungen mit Tagen laufen in UTC,
 * damit Sommer- und Winterzeit keine Tage verschieben (Spezifikation 6.8).
 */
import type { Datum, Zeitpunkt } from './typen'

const TAG_MS = 86_400_000

const zwei = (n: number) => String(n).padStart(2, '0')

/** Heutiger Kalendertag nach der Uhr des Rechners (nicht UTC: um 0:30 Uhr ist in Deutschland schon der neue Tag). */
export function heuteLokal(jetzt: Date): Datum {
  return `${jetzt.getFullYear()}-${zwei(jetzt.getMonth() + 1)}-${zwei(jetzt.getDate())}`
}

/** Prüft Form und Kalender: '2026-02-30' ist kein Datum. */
export function istDatum(text: unknown): text is Datum {
  if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return false
  const [j, m, t] = text.split('-').map(Number)
  const d = new Date(Date.UTC(j, m - 1, t))
  return d.getUTCFullYear() === j && d.getUTCMonth() === m - 1 && d.getUTCDate() === t
}

function alsUtcMs(d: Datum): number {
  const [j, m, t] = d.split('-').map(Number)
  return Date.UTC(j, m - 1, t)
}

function ausUtcMs(ms: number): Datum {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${zwei(d.getUTCMonth() + 1)}-${zwei(d.getUTCDate())}`
}

/** Datum plus n Tage: Date.UTC(J, M − 1, T) + n × 86 400 000 ms. */
export function plusTage(d: Datum, n: number): Datum {
  return ausUtcMs(alsUtcMs(d) + n * TAG_MS)
}

/** Ganze Tage von a bis b (positiv, wenn b später liegt). */
export function tageZwischen(a: Datum, b: Datum): number {
  return Math.round((alsUtcMs(b) - alsUtcMs(a)) / TAG_MS)
}

/** '2026-11-11' → '11.11.2026' */
export function datumDeutsch(d: Datum): string {
  if (!istDatum(d)) return d
  const [j, m, t] = d.split('-')
  return `${t}.${m}.${j}`
}

/** Zeitpunkt in Ortszeit, z. B. '11.11.2026, 14:05' */
export function zeitpunktDeutsch(z: Zeitpunkt): string {
  const d = new Date(z)
  if (Number.isNaN(d.getTime())) return z
  return `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.${d.getFullYear()}, ${zwei(d.getHours())}:${zwei(d.getMinutes())}`
}

/** Uhrzeit in Ortszeit mit Sekunden, z. B. '14:05:09' (Abrufprotokoll) */
export function uhrzeitDeutsch(z: Zeitpunkt): string {
  const d = new Date(z)
  if (Number.isNaN(d.getTime())) return z
  return `${zwei(d.getHours())}:${zwei(d.getMinutes())}:${zwei(d.getSeconds())}`
}

export function istZeitpunkt(text: unknown): text is Zeitpunkt {
  return typeof text === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(text) && !Number.isNaN(Date.parse(text))
}
