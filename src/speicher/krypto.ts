/**
 * Verschlüsselung der Exportdatei (6.11): Schlüssel mit Argon2id aus dem Passwort,
 * AES-256-GCM über Web Crypto mit 12 Byte IV und 128-Bit-Tag, Kopfdaten der Datei als
 * zusätzlich authentisierte Daten. Läuft im Browser im Web Worker (krypto.worker.ts) und
 * in Vitest direkt (Node 24 hat Web Crypto).
 *
 * Die Argon2-Parameter (64 MiB, 3 Durchläufe, Parallelität 1) sind eine eigene Festlegung;
 * das BSI verlangt die Abstimmung mit einem Experten (TR-02102-1). Sie stehen in jeder
 * Datei und lassen sich später erhöhen, ohne alte Dateien unlesbar zu machen.
 */
import { argon2id } from '@noble/hashes/argon2.js'

import { Entschluesselungsfehler, IV_BYTES, SALZ_BYTES, type KdfParameter, type Krypto, type Verschluesselt } from './krypto-grundlagen'

export { Entschluesselungsfehler, KDF_STANDARD, type KdfParameter, type Krypto, type Verschluesselt } from './krypto-grundlagen'

const utf8 = (text: string) => new TextEncoder().encode(text)

export function zuBase64(bytes: Uint8Array): string {
  let s = ''
  // in Stücken, sonst sprengt String.fromCharCode(...) bei großen Dateien den Stapel
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

export function ausBase64(text: string): Uint8Array<ArrayBuffer> {
  const s = atob(text)
  const bytes = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i)
  return bytes
}

/** 32 Byte Schlüssel; das Passwort wird in Unicode-Normalform NFC gebracht (gleiche Umlaute auf allen Systemen). */
export function leiteSchluesselAb(passwort: string, salz: Uint8Array, p: KdfParameter): Uint8Array<ArrayBuffer> {
  const roh = argon2id(utf8(passwort.normalize('NFC')), salz, { t: p.durchlaeufe, m: p.speicherKiB, p: p.parallelitaet, dkLen: 32 })
  return new Uint8Array(roh)
}

async function aesSchluessel(passwort: string, salz: Uint8Array, p: KdfParameter, zweck: KeyUsage) {
  return crypto.subtle.importKey('raw', leiteSchluesselAb(passwort, salz, p), { name: 'AES-GCM' }, false, [zweck])
}

export async function verschluessele(klartext: string, passwort: string, aad: string, p: KdfParameter): Promise<Verschluesselt> {
  const salz = crypto.getRandomValues(new Uint8Array(SALZ_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const schluessel = await aesSchluessel(passwort, salz, p, 'encrypt')
  const chiffrat = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: utf8(aad), tagLength: 128 }, schluessel, utf8(klartext))
  return { salzB64: zuBase64(salz), ivB64: zuBase64(iv), chiffratB64: zuBase64(new Uint8Array(chiffrat)) }
}

/** Wirft Entschluesselungsfehler bei falschem Passwort, veränderter Datei oder veränderten Kopfdaten. */
export async function entschluessele(v: Verschluesselt, passwort: string, aad: string, p: KdfParameter): Promise<string> {
  let salz: Uint8Array<ArrayBuffer>, iv: Uint8Array<ArrayBuffer>, chiffrat: Uint8Array<ArrayBuffer>
  try {
    salz = ausBase64(v.salzB64)
    iv = ausBase64(v.ivB64)
    chiffrat = ausBase64(v.chiffratB64)
  } catch {
    throw new Entschluesselungsfehler()
  }
  if (salz.length !== SALZ_BYTES || iv.length !== IV_BYTES) throw new Entschluesselungsfehler()
  try {
    const schluessel = await aesSchluessel(passwort, salz, p, 'decrypt')
    const klar = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: utf8(aad), tagLength: 128 }, schluessel, chiffrat)
    return new TextDecoder('utf-8', { fatal: true }).decode(klar)
  } catch {
    throw new Entschluesselungsfehler()
  }
}

export const direkteKrypto: Krypto = { verschluessele, entschluessele }
