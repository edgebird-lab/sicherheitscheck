/**
 * Gemeinsame Typen, Konstanten und Fehler der Verschlüsselung, ohne Argon2.
 * So bleibt Argon2 im Web Worker und im Haupt-Bundle steht nur, was die Oberfläche braucht.
 */
export interface KdfParameter {
  speicherKiB: number
  durchlaeufe: number
  parallelitaet: number
}

/** Eigene Festlegung (6.11): 64 MiB, 3 Durchläufe, Parallelität 1; Abstimmung mit einem Experten offen (TR-02102-1). */
export const KDF_STANDARD: KdfParameter = { speicherKiB: 65_536, durchlaeufe: 3, parallelitaet: 1 }

export const SALZ_BYTES = 16
export const IV_BYTES = 12

export class Entschluesselungsfehler extends Error {
  constructor() {
    super('Passwort falsch oder Datei beschädigt.')
    this.name = 'Entschluesselungsfehler'
  }
}

export interface Verschluesselt {
  salzB64: string
  ivB64: string
  chiffratB64: string
}

/** Schnittstelle, damit der Browser die Arbeit im Web Worker erledigen und Vitest direkt rechnen kann. */
export interface Krypto {
  verschluessele(klartext: string, passwort: string, aad: string, p: KdfParameter): Promise<Verschluesselt>
  entschluessele(v: Verschluesselt, passwort: string, aad: string, p: KdfParameter): Promise<string>
}
