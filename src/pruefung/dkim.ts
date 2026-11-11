/**
 * DKIM (Spezifikation 6.5): TXT unter ‹selektor›._domainkey.D, je Selektor ein Befund. Ohne
 * bekannten Selektor ist DKIM nicht prüfbar (DKIM-01). Die Länge eines RSA-Schlüssels steht im
 * Modulus: entweder als SubjectPublicKeyInfo (übliche Form) oder direkt als RSAPublicKey (PKCS#1).
 * Grenzen 1024 und 2048 Bit nach RFC 8301 (nicht geöffnet, Phase 0.4).
 */
import type { Befund } from '../modell/typen'
import { gescheitertText, lage, leseTags, tagWert } from './dns'
import type { Lauf } from './lauf'
import { befund } from './stufen'

export function dkimOhneSelektor(D: string): Befund {
  return befund('dkim', D, ['DKIM-01'], 'kein Selektor bekannt')
}

export function dkimZiel(selektor: string, D: string): string {
  return `${selektor}._domainkey.${D}`
}

export async function pruefeDkim(lauf: Lauf, D: string, selektor: string): Promise<Befund> {
  const ziel = dkimZiel(selektor, D)
  const l = lage(await lauf.dns(ziel, 'TXT'), 'TXT')
  if (l.art === 'gescheitert') return befund('dkim', ziel, ['DKIM-00'], gescheitertText(l.grund))
  const eintraege = l.art === 'daten' ? l.werte : []
  const tags = eintraege.map(leseTags).find((t) => tagWert(t, 'p') !== undefined)
  if (!tags) return befund('dkim', ziel, ['DKIM-02'], eintraege.length === 0 ? 'kein Eintrag' : 'kein Eintrag mit Schlüssel (p=)')

  const p = (tagWert(tags, 'p') ?? '').replace(/\s+/g, '')
  const verfahren = (tagWert(tags, 'k') ?? 'rsa').toLowerCase()
  if (p === '') return befund('dkim', ziel, ['DKIM-03'], '„p=“ ist leer: Schlüssel widerrufen', { verfahren })
  const bytes = ausBase64(p)

  if (verfahren === 'ed25519') {
    if (bytes?.length === 32) return befund('dkim', ziel, ['DKIM-04'], 'Ed25519', { verfahren })
    return befund('dkim', ziel, ['DKIM-08'], 'Ed25519-Schlüssel nicht lesbar', { verfahren })
  }
  if (verfahren !== 'rsa') return befund('dkim', ziel, ['DKIM-08'], `unbekanntes Verfahren „k=${verfahren}“`, { verfahren })
  const bits = bytes ? rsaBits(bytes) : null
  if (bits === null) return befund('dkim', ziel, ['DKIM-08'], 'RSA-Schlüssel nicht lesbar', { verfahren })
  const regel = bits < 1024 ? 'DKIM-05' : bits < 2048 ? 'DKIM-06' : 'DKIM-07'
  return befund('dkim', ziel, [regel], `RSA ${bits} Bit`, { verfahren, bits })
}

function ausBase64(text: string): Uint8Array | null {
  try {
    return Uint8Array.from(atob(text), (c) => c.charCodeAt(0))
  } catch {
    return null
  }
}

interface DerTeil {
  tag: number
  inhalt: Uint8Array
  /** Position hinter dem Teil */
  ende: number
}

/** Liest ein DER-Element ab `pos` (Tag, Länge in Kurz- oder Langform, Inhalt). */
export function liesDer(b: Uint8Array, pos = 0): DerTeil | null {
  if (pos + 2 > b.length) return null
  const tag = b[pos]
  let laenge = b[pos + 1]
  let start = pos + 2
  if (laenge & 0x80) {
    const n = laenge & 0x7f
    if (n === 0 || n > 4 || start + n > b.length) return null
    laenge = 0
    for (let i = 0; i < n; i++) laenge = laenge * 256 + b[start + i]
    start += n
  }
  if (start + laenge > b.length) return null
  return { tag, inhalt: b.subarray(start, start + laenge), ende: start + laenge }
}

const SEQUENCE = 0x30
const INTEGER = 0x02
const BIT_STRING = 0x03

/** Bitlänge des Modulus eines RSA-Schlüssels (SPKI oder PKCS#1); null, wenn nicht lesbar */
export function rsaBits(der: Uint8Array): number | null {
  const aussen = liesDer(der)
  if (!aussen || aussen.tag !== SEQUENCE) return null
  const erstes = liesDer(aussen.inhalt)
  if (!erstes) return null
  if (erstes.tag === INTEGER) return bitlaenge(erstes.inhalt)
  if (erstes.tag !== SEQUENCE) return null
  // SubjectPublicKeyInfo: AlgorithmIdentifier, dann BIT STRING mit dem RSAPublicKey
  const bitString = liesDer(aussen.inhalt, erstes.ende)
  if (!bitString || bitString.tag !== BIT_STRING || bitString.inhalt.length < 2) return null
  const rsa = liesDer(bitString.inhalt, 1)
  if (!rsa || rsa.tag !== SEQUENCE) return null
  const modulus = liesDer(rsa.inhalt)
  return modulus && modulus.tag === INTEGER ? bitlaenge(modulus.inhalt) : null
}

/** Bitlänge einer vorzeichenlosen Zahl ohne führende Nullbytes */
function bitlaenge(zahl: Uint8Array): number | null {
  let i = 0
  while (i < zahl.length && zahl[i] === 0) i++
  if (i === zahl.length) return null
  return (zahl.length - i - 1) * 8 + (32 - Math.clz32(zahl[i]))
}
