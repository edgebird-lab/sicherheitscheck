import type { Id } from './typen'

/** Erzeugt Kennungen; Tests übergeben einen Zähler, damit Ergebnisse vorhersagbar sind. */
export type NeueId = () => Id

export const neueId: NeueId = () => crypto.randomUUID()
